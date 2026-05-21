import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { initiateRefund } from '@/lib/razorpay.js'

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
        { error: 'Cannot cancel a booking on an in-transit trip' },
        { status: 400 }
      )
    }

    // Calculate refund
    const now       = new Date()
    const departure = new Date(booking.trip.departureTime)
    const hoursLeft = (departure - now) / (1000 * 60 * 60)

    let refundPercent = 0
    if      (hoursLeft > 24) refundPercent = 90
    else if (hoursLeft >= 4) refundPercent = 50
    else                     refundPercent = 0

    const refundAmount = Math.round(booking.totalAmount * refundPercent / 100)

    // Cancel atomically
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data:  { status: 'CANCELLED' }
      })

      await tx.seatSegment.deleteMany({
        where: { bookingId }
      })

      if (refundAmount > 0 && booking.payment?.razorpayPaymentId) {
        // Update payment record first
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            status:      refundPercent === 90 ? 'REFUNDED' : 'PARTIAL_REFUND',
            refundAmount,
            refundedAt:  new Date(),
          }
        })
      }
    })

    // Trigger Razorpay refund OUTSIDE transaction
    // (external API call should never be inside a DB transaction)
    if (refundAmount > 0 && booking.payment?.razorpayPaymentId) {
      try {
        const refund = await initiateRefund(
          booking.payment.razorpayPaymentId,
          refundAmount
        )

        // Update refund ID
        await prisma.payment.update({
          where: { id: booking.payment.id },
          data:  { refundId: refund.id }
        })

      } catch (refundError) {
        // Log but don't fail — booking is already cancelled
        // BullMQ retry queue handles this in Phase 9
        console.error('[REFUND ERROR] Will retry:', refundError.message)
      }
    }

    return NextResponse.json({
      message:      'Booking cancelled successfully',
      refundAmount,
      refundPercent,
      refundStatus: refundAmount > 0 ? 'INITIATED' : 'NOT_APPLICABLE',
    })

  } catch (error) {
    console.error('[CANCEL BOOKING ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}