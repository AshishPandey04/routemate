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

    const payouts = await prisma.payout.findMany({
      where: status ? { status } : undefined,
      orderBy: { requestedAt: 'desc' },
      take: 100,
      include: {
        wallet: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    })

    const summary = await prisma.payout.groupBy({
      by: ['status'],
      _sum: { amount: true },
      _count: true,
    })

    const capturedTotal = await prisma.payment.aggregate({
      where: { status: { in: ['CAPTURED', 'PARTIAL_REFUND', 'REFUNDED'] } },
      _sum: { amount: true },
    })

    return NextResponse.json({
      payouts,
      reconciliation: {
        payoutSummary: summary,
        grossPayments: capturedTotal._sum.amount || 0,
        driverShareRate: Number(process.env.DRIVER_EARNINGS_SHARE || '0.85'),
      },
    })
  } catch (error) {
    console.error('[ADMIN PAYOUTS]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
