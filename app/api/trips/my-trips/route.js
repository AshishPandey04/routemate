import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'

export async function GET(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const where = { driverId: auth.user.id }
    if (status) where.status = status

    const trips = await prisma.trip.findMany({
      where,
      include: {
        car:    { select: { make: true, model: true, plateNumber: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { departureTime: 'desc' }
    })

    if (trips.length === 0) {
      return NextResponse.json({ trips: [] })
    }

    // Single groupBy query replaces N individual aggregate calls
    const earningsByTrip = await prisma.booking.groupBy({
      by:     ['tripId'],
      where:  {
        tripId: { in: trips.map(t => t.id) },
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
      _sum: { totalAmount: true },
    })

    const earningsMap = new Map(
      earningsByTrip.map(e => [e.tripId, e._sum.totalAmount || 0])
    )

    const tripsWithEarnings = trips.map(trip => ({
      ...trip,
      bookingsCount: trip._count.bookings,
      totalEarnings: earningsMap.get(trip.id) || 0,
    }))

    return NextResponse.json({ trips: tripsWithEarnings })

  } catch (error) {
    console.error('[MY TRIPS ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}