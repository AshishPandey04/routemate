import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { requireAdmin } from '@/lib/is-admin.js'

export async function GET(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const denied = requireAdmin(auth.user)
    if (denied) {
      return NextResponse.json({ error: denied.error }, { status: denied.status })
    }

    const trips = await prisma.trip.findMany({
      where: { status: 'CANCELLED' },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        driver: { select: { name: true, email: true, phone: true } },
        bookings: {
          where: { status: 'CANCELLED' },
          include: {
            user: { select: { name: true, email: true } },
            payment: { select: { amount: true, status: true, refundAmount: true } },
          },
        },
        _count: { select: { bookings: true } },
      },
    })

    const reconciliation = trips.map((trip) => {
      const bookingTotal = trip.bookings.reduce((s, b) => s + (b.totalAmount || 0), 0)
      const refundTotal = trip.bookings.reduce(
        (s, b) => s + (b.payment?.refundAmount || 0),
        0
      )
      return {
        ...trip,
        reconciliation: {
          bookingTotal,
          refundTotal,
          netRetained: bookingTotal - refundTotal,
        },
      }
    })

    return NextResponse.json({ trips: reconciliation })
  } catch (error) {
    console.error('[ADMIN CANCELLED TRIPS]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
