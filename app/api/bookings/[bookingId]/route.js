import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'

export async function GET(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { bookingId } = await params

    const booking = await prisma.booking.findUnique({
      where:   { id: bookingId },
      include: {
        trip: {
          include: {
            driver: { select: { name: true, phone: true } },
            car:    { select: { make: true, model: true, isAC: true, plateNumber: true } },
          }
        },
        payment: { select: { status: true, refundAmount: true, razorpayOrderId: true } },
      }
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Only the booking owner or the trip driver can view it
    const isOwner  = booking.userId === auth.user.id
    const isDriver = booking.trip.driverId === auth.user.id
    if (!isOwner && !isDriver) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ booking })

  } catch (error) {
    console.error('[GET BOOKING ERROR]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
