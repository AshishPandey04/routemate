import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { ratingSchema } from '@/schemas/index.js'

export async function POST(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const body   = await request.json()
    const result = ratingSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message },
        { status: 400 }
      )
    }

    const { bookingId, score, comment } = result.data

    // Get booking
    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId },
      include: { trip: true }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Can only rate completed bookings' },
        { status: 400 }
      )
    }

    // Check already rated
    const existing = await prisma.rating.findUnique({
      where: { bookingId }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Already rated this booking' },
        { status: 400 }
      )
    }

    // Determine rating type + ratee
    const isRider  = booking.userId === auth.user.id
    const rateeId  = isRider ? booking.trip.driverId : booking.userId
    const ratingType = isRider ? 'RIDER_TO_DRIVER' : 'DRIVER_TO_RIDER'

    const rating = await prisma.rating.create({
      data: {
        bookingId,
        raterId: auth.user.id,
        rateeId,
        score,
        comment,
        type:    ratingType,
      }
    })

    return NextResponse.json(
      { message: 'Rating submitted', rating },
      { status: 201 }
    )

  } catch (error) {
    console.error('[RATING ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}