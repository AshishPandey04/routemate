import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { getOrCreateWallet } from '@/lib/wallet-service.js'

export async function GET(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!['DRIVER', 'BOTH', 'ADMIN'].includes(auth.user.role)) {
      return NextResponse.json(
        { error: 'Wallet is for drivers only' },
        { status: 403 }
      )
    }

    let wallet = await prisma.wallet.findUnique({
      where: { userId: auth.user.id },
      include: {
        transactions: { orderBy: { createdAt: 'desc' }, take: 30 },
        payouts: { orderBy: { requestedAt: 'desc' }, take: 20 },
      },
    })

    if (!wallet) {
      await prisma.$transaction(async (tx) => {
        await getOrCreateWallet(tx, auth.user.id)
      })
      wallet = await prisma.wallet.findUnique({
        where: { userId: auth.user.id },
        include: {
          transactions: { orderBy: { createdAt: 'desc' }, take: 30 },
          payouts: { orderBy: { requestedAt: 'desc' }, take: 20 },
        },
      })
    }

    const totalEarnings = await prisma.walletTransaction.aggregate({
      where: {
        walletId: wallet.id,
        type: { in: ['EARNING', 'EARNING_PENDING'] },
      },
      _sum: { amount: true },
    })

    return NextResponse.json({
      wallet: {
        balance: wallet.balance,
        pendingBalance: wallet.pendingBalance,
        totalEarnings: totalEarnings._sum.amount || 0,
        transactions: wallet.transactions,
        payouts: wallet.payouts,
      },
    })
  } catch (error) {
    console.error('[WALLET GET]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
