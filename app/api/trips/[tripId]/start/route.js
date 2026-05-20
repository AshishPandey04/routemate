import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'

export async function PATCH(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { tripId } = params

    const trip = await prisma.trip.findUnique({ where: { id: tripId } })

    if (!trip || trip.driverId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    if (trip.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: `Cannot start a trip with status: ${trip.status}` },
        { status: 400 }
      )
    }

    // Allow starting within 30 minutes of departure time
    const now           = new Date()
    const departure     = new Date(trip.departureTime)
    const diffMinutes   = (departure - now) / (1000 * 60)

    if (diffMinutes > 30) {
      return NextResponse.json(
        { error: `Trip can only be started 30 minutes before departure. Departure is at ${departure.toLocaleTimeString()}` },
        { status: 400 }
      )
    }

    await prisma.trip.update({
      where: { id: tripId },
      data:  { status: 'IN_TRANSIT' }
    })

    return NextResponse.json({
      message: 'Trip started successfully',
      status:  'IN_TRANSIT'
    })

  } catch (error) {
    console.error('[START TRIP ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}