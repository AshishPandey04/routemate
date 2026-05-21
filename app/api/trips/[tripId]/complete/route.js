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

    const { tripId } = await params

    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    })

    if (!trip || trip.driverId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    if (trip.status !== 'IN_TRANSIT') {
      return NextResponse.json(
        { error: 'Only IN_TRANSIT trips can be completed' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Complete the trip
      await tx.trip.update({
        where: { id: tripId },
        data:  { status: 'COMPLETED' }
      })

      // Complete all confirmed bookings
      await tx.booking.updateMany({
        where: { tripId, status: 'CONFIRMED' },
        data:  { status: 'COMPLETED' }
      })
    })

    return NextResponse.json({
      message: 'Trip completed successfully'
    })

  } catch (error) {
    console.error('[COMPLETE TRIP ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}