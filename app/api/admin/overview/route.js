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

    const [
      openDisputes,
      cancelledTrips,
      pendingPayouts,
      capturedPayments,
      recentSos,
    ] = await Promise.all([
      prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      prisma.trip.count({ where: { status: 'CANCELLED' } }),
      prisma.payout.count({ where: { status: 'PENDING' } }),
      prisma.payment.aggregate({
        where: { status: 'CAPTURED' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.sosAlert.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { name: true, phone: true } },
          trip: { select: { originCity: true, destinationCity: true, status: true } },
        },
      }),
    ])

    const pendingPayoutSum = await prisma.payout.aggregate({
      where: { status: 'PENDING' },
      _sum: { amount: true },
    })

    const platformFees = (capturedPayments._sum.amount || 0) * 0.15

    return NextResponse.json({
      stats: {
        openDisputes,
        cancelledTrips,
        pendingPayouts,
        pendingPayoutAmount: pendingPayoutSum._sum.amount || 0,
        totalPayments: capturedPayments._count,
        grossRevenue: capturedPayments._sum.amount || 0,
        estimatedPlatformFees: Math.round(platformFees),
      },
      recentSos,
    })
  } catch (error) {
    console.error('[ADMIN OVERVIEW]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
