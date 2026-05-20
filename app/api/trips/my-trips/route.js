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
        car:      { select: { make: true, model: true, plateNumber: true } },
        _count:   { select: { bookings: true } },
      },
      orderBy: { departureTime: 'desc' }
    })

    // Calculate earnings per trip
    const tripsWithEarnings = await Promise.all(
      trips.map(async (trip) => {
        const bookings = await prisma.booking.aggregate({
          where:  { tripId: trip.id, status: { in: ['CONFIRMED', 'COMPLETED'] } },
          _sum:   { totalAmount: true }
        })

        return {
          ...trip,
          bookingsCount:  trip._count.bookings,
          totalEarnings:  bookings._sum.totalAmount || 0,
        }
      })
    )

    return NextResponse.json({ trips: tripsWithEarnings })

  } catch (error) {
    console.error('[MY TRIPS ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}