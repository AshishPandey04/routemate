import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { checkSeatAvailability } from '@/lib/algorithms/seat-allocator.js'
import { validateSegment, calculateSegmentPrice } from '@/lib/algorithms/route-matcher.js'
import { holdSchema } from '@/schemas/index.js'
import { createOrder } from '@/lib/razorpay.js'
import { apiSuccess, apiError } from '@/lib/api-response.js'
import { CommonErrors, AppError, ErrorCode } from '@/lib/errors.js'
import { applyRateLimit } from '@/lib/rate-limit.js'

export async function POST(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) {
      return apiError(auth.error)
    }

    // Rate limit: 5 hold attempts per user per minute (each creates a Razorpay order)
    const rateCheck = await applyRateLimit(`hold:user:${auth.user.id}`, 5, 60)
    if (!rateCheck.allowed) {
      throw new AppError(
        'Too many booking attempts. Please wait a moment.',
        ErrorCode.TOO_MANY_REQUESTS,
        429
      )
    }

    const body   = await request.json()
    const result = holdSchema.safeParse(body)
    if (!result.success) {
      throw new AppError(
        result.error.issues?.[0]?.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR,
        400
      )
    }

    const { tripId, boardingCity, alightingCity, seatsRequested } = result.data

    // Fetch trip
    const trip = await prisma.trip.findUnique({
      where:   { id: tripId },
      include: { waypoints: { orderBy: { sequenceIndex: 'asc' } } }
    })

    if (!trip) {
      throw CommonErrors.notFound('Trip')
    }

    if (trip.status !== 'SCHEDULED' && trip.status !== 'IN_TRANSIT') {
      throw new AppError(
        'This trip is not available for booking',
        ErrorCode.TRIP_NOT_FOUND,
        400
      )
    }

    // Prevent driver from booking own trip
    if (trip.driverId === auth.user.id) {
      throw new AppError(
        'You cannot book your own trip',
        ErrorCode.FORBIDDEN,
        403
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
      throw new AppError(
        'You already have a booking on this trip',
        ErrorCode.BOOKING_CONFLICT,
        400,
        { existingBookingId: existingBooking.id }
      )
    }

    // Validate segment
    const segment = validateSegment(trip.routeCities, boardingCity, alightingCity)
    if (!segment.valid) {
      throw new AppError(segment.error, ErrorCode.VALIDATION_ERROR, 400)
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
          throw new AppError(
            'Car has already passed your boarding city',
            ErrorCode.INVALID_BOOKING_STATUS,
            400
          )
        }
      }
    }

    // Check existing Redis hold for this user+trip
    const existingHold = await redis.get(`hold:${tripId}:${auth.user.id}`)
    if (existingHold) {
      throw new AppError(
        'You already have an active hold on this trip',
        ErrorCode.BOOKING_CONFLICT,
        400
      )
    }

    // Check seat availability under a serializable transaction to prevent race conditions
    const availability = await prisma.$transaction(
      async (tx) => {
        // Re-read the trip inside the transaction to get a consistent snapshot
        const lockedTrip = await tx.trip.findUnique({
          where:  { id: tripId },
          select: { totalSeats: true, status: true },
        })

        if (!lockedTrip) throw CommonErrors.notFound('Trip')

        // Fetch overlapping seat segments inside the transaction
        const overlapping = await tx.seatSegment.findMany({
          where: {
            tripId,
            fromIndex: { lt: alightingIndex },
            toIndex:   { gt: boardingIndex  },
          },
        })

        // Sweep-line peak occupancy
        let peak = 0
        if (overlapping.length > 0) {
          const events = []
          for (const seg of overlapping) {
            events.push({ index: seg.fromIndex, delta: +seg.seatsOccupied })
            events.push({ index: seg.toIndex,   delta: -seg.seatsOccupied })
          }
          events.sort((a, b) => a.index !== b.index ? a.index - b.index : a.delta - b.delta)
          let current = 0
          for (const ev of events) {
            current += ev.delta
            peak = Math.max(peak, current)
          }
        }

        const maxAvailable = lockedTrip.totalSeats - peak

        return {
          available:    maxAvailable >= seatsRequested,
          maxAvailable: Math.max(0, maxAvailable),
        }
      },
      { isolationLevel: 'Serializable' }
    )

    if (!availability.available) {
      throw new AppError(
        'Not enough seats available',
        ErrorCode.SEATS_UNAVAILABLE,
        409,
        { availableSeats: availability.maxAvailable }
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
    const order = await createOrder(totalAmount, {
      tripId,
      userId:        auth.user.id,
      boardingCity,
      alightingCity,
      seatsRequested,
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

    await redis.setex(
      `hold:${tripId}:${auth.user.id}`,
      480, // 8 minutes
      JSON.stringify(holdData)
    )

    const expiresAt = new Date(Date.now() + 8 * 60 * 1000)

    return apiSuccess({
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
    console.error('[BOOKING HOLD ERROR]', {
      message: error.message,
      code:    error.code,
      tripId:  error.details?.tripId
    })
    return apiError(error)
  }
}
