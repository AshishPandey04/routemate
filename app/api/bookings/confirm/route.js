import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { checkSeatAvailability } from '@/lib/algorithms/seat-allocator.js'
import { confirmSchema } from '@/schemas/index.js'
import { verifyPaymentSignature } from '@/lib/razorpay.js'
import crypto from 'crypto'

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

    const {
      tripId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    } = result.data

    // Step 1 — Verify Razorpay signature
    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    )

    if (!isValid) {
      return NextResponse.json(
        { error: 'Payment verification failed. Invalid signature.' },
        { status: 400 }
      )
    }



    // Step 2 — Idempotency check
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
    const holdKey = `hold:${tripId}:${auth.user.id}`
    const holdRaw = await redis.get(holdKey)

    if (!holdRaw) {
      return NextResponse.json(
        { error: 'Seat hold expired. Please start the booking again.' },
        { status: 400 }
      )
    }

    const hold = typeof holdRaw === 'string' ? JSON.parse(holdRaw) : holdRaw

    if (hold.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json(
        { error: 'Order ID mismatch' },
        { status: 400 }
      )
    }

    // Step 4 — DB transaction with row lock
  // Step 4 — DB transaction with row lock
const booking = await prisma.$transaction(async (tx) => {

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

  // Create seat segment — permanently locks seats
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
}, {
  timeout: 15000  // increase timeout to 15 seconds
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
      return NextResponse.json(
        { error: 'Seats no longer available. Refund will be initiated.' },
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