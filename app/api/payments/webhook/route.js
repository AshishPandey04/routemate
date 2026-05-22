import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { verifyWebhookSignature } from '@/lib/razorpay.js'
import { checkSeatAvailability } from '@/lib/algorithms/seat-allocator.js'
import { apiError, apiSuccess } from '@/lib/api-response.js'
import { CommonErrors, ErrorCode, AppError } from '@/lib/errors.js'

export async function POST(request) {
  try {
    // Get raw body for signature verification
    const rawBody  = await request.text()
    const signature = request.headers.get('x-razorpay-signature')

    // Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature)
    if (!isValid) {
      console.error('[WEBHOOK] Invalid signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const event = JSON.parse(rawBody)
    console.log('[WEBHOOK] Event received:', event.event)

    // Handle payment captured event
    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity
      const orderId = payment.order_id
      const paymentId = payment.id

      // Check if booking already exists (confirm already ran)
      const existingPayment = await prisma.payment.findUnique({
        where: { razorpayOrderId: orderId }
      })

      if (existingPayment) {
        console.log('[WEBHOOK] Booking already exists, skipping')
        return NextResponse.json({ received: true })
      }

      // Find the hold in Redis using order notes
      const notes       = payment.notes || {}
      const tripId      = notes.tripId
      const userId      = notes.userId

      if (!tripId || !userId) {
        console.error('[WEBHOOK] Missing tripId or userId in notes')
        return NextResponse.json({ received: true })
      }

      const holdKey = `hold:${tripId}:${userId}`
      const holdRaw = await redis.get(holdKey)

      if (!holdRaw) {
        console.error('[WEBHOOK] Hold expired for', holdKey)
        return NextResponse.json({ received: true })
      }

      const hold = typeof holdRaw === 'string' ? JSON.parse(holdRaw) : holdRaw

      // Create booking via same transaction logic
      await prisma.$transaction(async (tx) => {
        // ✅ FIXED: Use Prisma.raw() to prevent SQL injection
        await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${Prisma.raw(hold.tripId)} FOR UPDATE`

        const availability = await checkSeatAvailability(
          hold.tripId,
          hold.boardingIndex,
          hold.alightingIndex,
          hold.seatsRequested
        )

        if (!availability.available) {
          console.error('[WEBHOOK] Seats no longer available — refund needed')
          throw new AppError(
            'Seats no longer available',
            ErrorCode.SEATS_UNAVAILABLE,
            400
          )
        }

        const newBooking = await tx.booking.create({
          data: {
            tripId:        hold.tripId,
            userId,
            boardingCity:  hold.boardingCity,
            alightingCity: hold.alightingCity,
            boardingIndex: hold.boardingIndex,
            alightingIndex: hold.alightingIndex,
            seatsBooked:   hold.seatsRequested,
            totalAmount:   hold.totalAmount,
            status:        'CONFIRMED',
          }
        })

        await tx.seatSegment.create({
          data: {
            tripId:        hold.tripId,
            bookingId:     newBooking.id,
            fromIndex:     hold.boardingIndex,
            toIndex:       hold.alightingIndex,
            seatsOccupied: hold.seatsRequested,
          }
        })

        await tx.payment.create({
          data: {
            bookingId:        newBooking.id,
            razorpayOrderId:  orderId,
            razorpayPaymentId: paymentId,
            amount:           hold.totalAmount,
            status:           'CAPTURED',
          }
        })
      }, {
        timeout: 15000
      })

      await redis.del(holdKey)
      console.log('[WEBHOOK] Booking created successfully via webhook')
    }

    // Handle payment failed event
    if (event.event === 'payment.failed') {
      console.log('[WEBHOOK] Payment failed for order:', event.payload.payment.entity.order_id)
      // Hold will expire naturally via Redis TTL
      // No action needed
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    // Log error with sanitized details
    console.error('[WEBHOOK ERROR]', {
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString()
    })

    // Always return 200 to Razorpay even on errors
    // Otherwise Razorpay will keep retrying
    return NextResponse.json({ received: true })
  }
}