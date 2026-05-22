import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'

export async function GET(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { tripId } = await params

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { driverId: true }
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Only driver or confirmed participants can fetch bookings
    const isDriver = trip.driverId === auth.user.id
    if (!isDriver) {
      const participation = await prisma.booking.findFirst({
        where: { tripId, userId: auth.user.id, status: 'CONFIRMED' }
      })
      if (!participation) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const bookings = await prisma.booking.findMany({
      where:   { tripId, status: 'CONFIRMED' },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({ bookings })

  } catch (error) {
    console.error('[GET TRIP BOOKINGS ERROR]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
