import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { getOrCreateTripShareLink } from '@/lib/trip-share.js'

export async function POST(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { tripId } = await params

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: { userId: auth.user.id, status: 'CONFIRMED' },
        },
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const isDriver = trip.driverId === auth.user.id
    const isPassenger = trip.bookings.length > 0

    if (!isDriver && !isPassenger) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (!['SCHEDULED', 'IN_TRANSIT'].includes(trip.status)) {
      return NextResponse.json(
        { error: 'Share link only for active trips' },
        { status: 400 }
      )
    }

    const { url, link } = await getOrCreateTripShareLink(tripId)

    return NextResponse.json({
      shareUrl: url,
      expiresAt: link.expiresAt,
      message: 'Share this link with trusted contacts so they can follow your trip live.',
    })
  } catch (error) {
    console.error('[SHARE LINK]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function GET(request, { params }) {
  return POST(request, { params })
}
