import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { initiateRefund } from '@/lib/razorpay.js'
import { reverseBookingEarning } from '@/lib/wallet-service.js'
import { getRefundQueue } from '@/lib/queues.js'
import { sendPushNotification } from '@/lib/fcm.js'
import { invalidateCache, CacheKeys } from '@/lib/cache-v2.js'

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

    try {
      await reverseBookingEarning(bookingId)
    } catch (walletErr) {
      console.error('[WALLET REVERSAL]', walletErr.message)
    }

    // Invalidate Redis cache for this user's bookings
    await invalidateCache(CacheKeys.userBookings(booking.userId)).catch(() => {})

    // Trigger Razorpay refund OUTSIDE transaction
    // (external API call should never be inside a DB transaction)
    if (refundAmount > 0 && booking.payment?.razorpayPaymentId) {
      try {
        const refund = await initiateRefund(
          booking.payment.razorpayPaymentId,
          refundAmount
        )
        await prisma.payment.update({
          where: { id: booking.payment.id },
          data:  { refundId: refund.id }
        })
      } catch (refundError) {
        // First attempt failed — enqueue for retry via BullMQ
        console.error('[REFUND ERROR] Queuing for retry:', refundError.message)
        try {
          const refundQueue = getRefundQueue()
          await refundQueue.add('retry-refund', {
            paymentId:       booking.payment.razorpayPaymentId,
            amount:          refundAmount,
            bookingId:       booking.id,
            paymentRecordId: booking.payment.id,
          })
        } catch (queueErr) {
          console.error('[REFUND QUEUE ERROR]', queueErr.message)
        }
      }
    }

    // Notify rider via FCM (best-effort)
    try {
      const rider = await prisma.user.findUnique({
        where:  { id: booking.userId },
        select: { fcmToken: true }
      })
      if (rider?.fcmToken) {
        const refundMsg = refundAmount > 0
          ? ` Refund of ₹${refundAmount} initiated.`
          : ' No refund applicable.'
        await sendPushNotification(
          rider.fcmToken,
          '🚫 Booking Cancelled',
          `Your booking from ${booking.boardingCity} → ${booking.alightingCity} has been cancelled.${refundMsg}`,
          { type: 'BOOKING_CANCELLED', bookingId: booking.id }
        )
      }
    } catch (fcmErr) {
      console.error('[FCM BOOKING CANCEL]', fcmErr.message)
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