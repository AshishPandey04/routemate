import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { disputeSchema } from '@/schemas/index.js'

export async function POST(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const result = disputeSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const booking = await prisma.booking.findUnique({
      where: { id: result.data.bookingId },
    })

    if (!booking || booking.userId !== auth.user.id) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const existing = await prisma.dispute.findFirst({
      where: { bookingId: booking.id, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A dispute is already open for this booking' },
        { status: 400 }
      )
    }

    const dispute = await prisma.dispute.create({
      data: {
        bookingId: booking.id,
        reporterId: auth.user.id,
        reason: result.data.reason,
      },
    })

    return NextResponse.json(
      { message: 'Dispute submitted. Our team will review within 48 hours.', dispute },
      { status: 201 }
    )
  } catch (error) {
    console.error('[DISPUTE POST]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
