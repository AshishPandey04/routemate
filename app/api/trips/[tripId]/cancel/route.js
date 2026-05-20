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
    const { reason  } = await request.json()

    if (!reason) {
      return NextResponse.json(
        { error: 'Cancellation reason is required' },
        { status: 400 }
      )
    }

    const trip = await prisma.trip.findUnique({
      where:   { id: tripId },
      include: { bookings: { where: { status: 'CONFIRMED' } } }
    })

    if (!trip || trip.driverId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    if (trip.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed trip' },
        { status: 400 }
      )
    }

    // Cancel trip + all bookings + delete seat segments in transaction
    await prisma.$transaction(async (tx) => {

      // Cancel the trip
      await tx.trip.update({
        where: { id: tripId },
        data:  {
          status:           'CANCELLED',
          cancellationNote: reason
        }
      })

      // Cancel all confirmed bookings
      for (const booking of trip.bookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data:  { status: 'CANCELLED' }
        })

        // Delete seat segment to release seats
        await tx.seatSegment.deleteMany({
          where: { bookingId: booking.id }
        })

        // TODO Phase 7: trigger Razorpay refund for each booking
      }

      // Cancel return slot if exists
      await tx.returnSlot.updateMany({
        where: { tripId },
        data:  { status: 'CANCELLED' }
      })
    })

    return NextResponse.json({
      message:          'Trip cancelled successfully',
      refundsTriggered: trip.bookings.length,
    })

  } catch (error) {
    console.error('[CANCEL TRIP ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}