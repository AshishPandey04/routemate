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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const disputes = await prisma.dispute.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        reporter: { select: { id: true, name: true, email: true, phone: true } },
        booking: {
          include: {
            user: { select: { name: true, email: true } },
            trip: {
              select: {
                id: true,
                originCity: true,
                destinationCity: true,
                driver: { select: { name: true } },
              },
            },
            payment: { select: { amount: true, status: true, razorpayPaymentId: true } },
          },
        },
      },
    })

    return NextResponse.json({ disputes })
  } catch (error) {
    console.error('[ADMIN DISPUTES]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
