import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { checkSeatAvailability } from '@/lib/algorithms/seat-allocator.js'

export async function GET(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { tripId } = await params


    const trip = await prisma.trip.findUnique({
      where:   { id: tripId },
      include: {
        waypoints:  { orderBy: { sequenceIndex: 'asc' } },
        car:        { select: { make: true, model: true, plateNumber: true, isAC: true } },
        driver:     { select: { id: true, name: true, ratingsReceived: true } },
        returnSlot: true,
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Check if requesting user has a booking on this trip
    const userBooking = await prisma.booking.findFirst({
      where: {
        tripId,
        userId: auth.user.id,
        status: 'CONFIRMED'
      }
    })

    // Only expose driver phone if user has a confirmed booking
    // or if the user IS the driver
    const driverPhone = (userBooking || trip.driverId === auth.user.id)
      ? (await prisma.user.findUnique({
          where:  { id: trip.driverId },
          select: { phone: true }
        }))?.phone
      : null

    // Calculate seat availability for each segment
    const segmentAvailability = {}
    const cities = trip.routeCities

    for (let i = 0; i < cities.length - 1; i++) {
      const result = await checkSeatAvailability(tripId, i, i + 1, 1)
      segmentAvailability[`${cities[i]}-${cities[i + 1]}`] = result.maxAvailable
    }

    // Calculate driver average rating
    const ratings     = trip.driver.ratingsReceived
    const avgRating   = ratings.length
      ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(1)
      : null

    const isDriver = trip.driverId === auth.user.id

    let bookings = []
    if (isDriver) {
      bookings = await prisma.booking.findMany({
        where:   { tripId, status: { in: ['CONFIRMED', 'COMPLETED', 'CANCELLED'] } },
        include: {
          user: { select: { id: true, name: true, phone: true } },
          rating: { select: { id: true, score: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    }

    return NextResponse.json({
      trip: {
        ...trip,
        driver: {
          id:          trip.driver.id,
          name:        trip.driver.name,
          phone:       driverPhone,
          avgRating,
          totalRatings: ratings.length,
        },
        segmentAvailability,
        bookings: isDriver ? bookings : undefined,
        isDriver,
      }
    })

  } catch (error) {
    console.error('[GET TRIP ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}