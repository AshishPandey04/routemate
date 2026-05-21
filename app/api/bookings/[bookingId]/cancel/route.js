import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'

export async function POST(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { bookingId } = await params

    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId },
      include: { trip: true, payment: true }
    })

    if (!booking || booking.userId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: `Cannot cancel a ${booking.status} booking` },
        { status: 400 }
      )
    }

    if (booking.trip.status === 'IN_TRANSIT') {
      return NextResponse.json(
        { error: 'Cannot cancel a booking on a trip that is already in transit' },
        { status: 400 }
      )
    }

    // Calculate refund amount based on time to departure
    const now          = new Date()
    const departure    = new Date(booking.trip.departureTime)
    const hoursLeft    = (departure - now) / (1000 * 60 * 60)

    let refundPercent = 0
    let refundAmount  = 0

    if (hoursLeft > 24) {
      refundPercent = 90
    } else if (hoursLeft >= 4) {
      refundPercent = 50
    } else {
      refundPercent = 0
    }

    refundAmount = Math.round(booking.totalAmount * refundPercent / 100)

    // Cancel booking + delete seat segment atomically
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data:  { status: 'CANCELLED' }
      })

      await tx.seatSegment.deleteMany({
        where: { bookingId }
      })

      if (refundAmount > 0 && booking.payment) {
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            status:       refundPercent === 90 ? 'REFUNDED' : 'PARTIAL_REFUND',
            refundAmount,
            refundedAt:   new Date(),
          }
        })
        // TODO Phase 7: trigger actual Razorpay refund API call here
      }
    })

    return NextResponse.json({
      message:       'Booking cancelled successfully',
      refundAmount,
      refundPercent,
      refundStatus:  refundAmount > 0 ? 'INITIATED' : 'NOT_APPLICABLE',
    })

  } catch (error) {
    console.error('[CANCEL BOOKING ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}