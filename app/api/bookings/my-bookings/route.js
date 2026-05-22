import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'

export async function GET(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const bookings = await prisma.booking.findMany({
      where:   { userId: auth.user.id },
      include: {
        trip: {
          include: {
            driver: { select: { name: true, phone: true } },
            car:    { select: { make: true, model: true, isAC: true } },
          }
        },
        payment: {
          select: { status: true, refundAmount: true }
        },
        rating: {
          select: { id: true, score: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ bookings })

  } catch (error) {
    console.error('[MY BOOKINGS ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}