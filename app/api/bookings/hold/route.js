import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { checkSeatAvailability } from '@/lib/algorithms/seat-allocator.js'
import { validateSegment, calculateSegmentPrice } from '@/lib/algorithms/route-matcher.js'
import { holdSchema } from '@/schemas/index.js'
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

export async function POST(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const body   = await request.json()
    const result = holdSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const { tripId, boardingCity, alightingCity, seatsRequested } = result.data

    // Fetch trip
    const trip = await prisma.trip.findUnique({
      where:   { id: tripId },
      include: { waypoints: { orderBy: { sequenceIndex: 'asc' } } }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    if (trip.status !== 'SCHEDULED' && trip.status !== 'IN_TRANSIT') {
      return NextResponse.json(
        { error: 'This trip is not available for booking' },
        { status: 400 }
      )
    }

    // Prevent driver from booking own trip
    if (trip.driverId === auth.user.id) {
      return NextResponse.json(
        { error: 'You cannot book your own trip' },
        { status: 400 }
      )
    }

    // Check for existing booking
    const existingBooking = await prisma.booking.findFirst({
      where: {
        tripId,
        userId: auth.user.id,
        status: 'CONFIRMED'
      }
    })

    if (existingBooking) {
      return NextResponse.json(
        { error: 'You already have a booking on this trip', existingBookingId: existingBooking.id },
        { status: 400 }
      )
    }

    // Validate segment
    const segment = validateSegment(trip.routeCities, boardingCity, alightingCity)
    if (!segment.valid) {
      return NextResponse.json(
        { error: segment.error },
        { status: 400 }
      )
    }

    const { boardingIndex, alightingIndex } = segment

    // Check for en-route boarding city already passed
    if (trip.status === 'IN_TRANSIT') {
      const boardingWaypoint = trip.waypoints.find(
        w => w.sequenceIndex === boardingIndex
      )
      if (boardingWaypoint) {
        const eta    = new Date(boardingWaypoint.estimatedArrival)
        const buffer = new Date(Date.now() + 30 * 60 * 1000)
        if (eta < buffer) {
          return NextResponse.json(
            { error: 'Car has already passed your boarding city' },
            { status: 400 }
          )
        }
      }
    }

    // Check existing Redis hold for this user+trip
    const existingHold = await redis.get(`hold:${tripId}:${auth.user.id}`)
    if (existingHold) {
      return NextResponse.json(
        { error: 'You already have an active hold on this trip. Complete or wait for it to expire.' },
        { status: 400 }
      )
    }

    // Check seat availability (first check — optimistic)
    const availability = await checkSeatAvailability(
      tripId,
      boardingIndex,
      alightingIndex,
      seatsRequested
    )

    if (!availability.available) {
      return NextResponse.json(
        {
          error:          'Not enough seats available',
          availableSeats: availability.maxAvailable
        },
        { status: 409 }
      )
    }

    // Calculate price
    const totalAmount = calculateSegmentPrice(
      trip.distanceKm,
      trip.routeCities.length,
      boardingIndex,
      alightingIndex,
      trip.pricePerKm,
      seatsRequested
    )

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount:   totalAmount * 100,  // Razorpay uses paise
      currency: 'INR',
      notes: {
        tripId,
        userId:        auth.user.id,
        boardingCity,
        alightingCity,
        seatsRequested,
      }
    })

    // Store hold in Redis (8 min TTL)
    const holdData = {
      tripId,
      userId:         auth.user.id,
      boardingCity,
      alightingCity,
      boardingIndex,
      alightingIndex,
      seatsRequested,
      totalAmount,
      razorpayOrderId: order.id,
    }

    await redis.set(
      `hold:${tripId}:${auth.user.id}`,
      JSON.stringify(holdData),
      { ex: 480 }  // 8 minutes
    )

    const expiresAt = new Date(Date.now() + 8 * 60 * 1000)

    return NextResponse.json({
      holdKey:         `hold:${tripId}:${auth.user.id}`,
      razorpayOrderId: order.id,
      amount:          totalAmount,
      expiresAt,
      breakdown: {
        distanceKm:   Math.round(trip.distanceKm * (alightingIndex - boardingIndex) / (trip.routeCities.length - 1)),
        pricePerKm:   trip.pricePerKm,
        seats:        seatsRequested,
        total:        totalAmount,
      }
    })

  } catch (error) {
    console.error('[BOOKING HOLD ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}