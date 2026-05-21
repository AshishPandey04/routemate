import { NextResponse } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { checkSeatAvailability } from '@/lib/algorithms/seat-allocator.js'
import { confirmSchema } from '@/schemas/index.js'

export async function POST(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const body   = await request.json()
    const result = confirmSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = result.data

    // Step 1 — Verify Razorpay signature (HMAC)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json(
        { error: 'Payment verification failed. Invalid signature.' },
        { status: 400 }
      )
    }

    // Step 2 — Idempotency check
    // If booking already exists for this order → return it
    const existingPayment = await prisma.payment.findUnique({
      where:   { razorpayOrderId },
      include: { booking: true }
    })

    if (existingPayment) {
      return NextResponse.json({
        message: 'Booking already confirmed',
        booking: existingPayment.booking
      })
    }

    // Step 3 — Get hold from Redis
    // We need to find the hold by orderId
    // Search by scanning — in production use a reverse index
    // For MVP: orderId is stored in holdData
    const tripId  = body.tripId  // client sends tripId along with confirm
    const holdKey = `hold:${tripId}:${auth.user.id}`
    const holdRaw = await redis.get(holdKey)

    if (!holdRaw) {
      return NextResponse.json(
        { error: 'Hold expired. Please start the booking again.' },
        { status: 400 }
      )
    }

    const hold = JSON.parse(holdRaw)

    // Verify the orderId matches
    if (hold.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json(
        { error: 'Order ID mismatch' },
        { status: 400 }
      )
    }

    // Step 4 — DB transaction with row lock
    const booking = await prisma.$transaction(async (tx) => {

      // Lock the trip row
      await tx.$queryRaw`SELECT id FROM "Trip" WHERE id = ${hold.tripId} FOR UPDATE`

      // Second availability check (pessimistic)
      const availability = await checkSeatAvailability(
        hold.tripId,
        hold.boardingIndex,
        hold.alightingIndex,
        hold.seatsRequested
      )

      if (!availability.available) {
        throw new Error('SEATS_UNAVAILABLE')
      }

      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          tripId:        hold.tripId,
          userId:        auth.user.id,
          boardingCity:  hold.boardingCity,
          alightingCity: hold.alightingCity,
          boardingIndex: hold.boardingIndex,
          alightingIndex: hold.alightingIndex,
          seatsBooked:   hold.seatsRequested,
          totalAmount:   hold.totalAmount,
          status:        'CONFIRMED',
        }
      })

      // Create seat segment — locks the seats permanently
      await tx.seatSegment.create({
        data: {
          tripId:        hold.tripId,
          bookingId:     newBooking.id,
          fromIndex:     hold.boardingIndex,
          toIndex:       hold.alightingIndex,
          seatsOccupied: hold.seatsRequested,
        }
      })

      // Create payment record
      await tx.payment.create({
        data: {
          bookingId:          newBooking.id,
          razorpayOrderId,
          razorpayPaymentId,
          razorpaySignature,
          amount:             hold.totalAmount,
          status:             'CAPTURED',
        }
      })

      return newBooking
    })

    // Step 5 — Delete Redis hold
    await redis.del(holdKey)

    return NextResponse.json({
      message: 'Booking confirmed successfully',
      booking: {
        id:            booking.id,
        tripId:        booking.tripId,
        boardingCity:  booking.boardingCity,
        alightingCity: booking.alightingCity,
        seatsBooked:   booking.seatsBooked,
        totalAmount:   booking.totalAmount,
        status:        booking.status,
      }
    }, { status: 201 })

  } catch (error) {
    if (error.message === 'SEATS_UNAVAILABLE') {
      // TODO Phase 7: trigger refund here
      return NextResponse.json(
        { error: 'Seats are no longer available. Refund will be initiated.' },
        { status: 409 }
      )
    }

    console.error('[BOOKING CONFIRM ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}