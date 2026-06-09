import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { requireAdmin } from '@/lib/is-admin.js'
import { adminPayoutSchema } from '@/schemas/index.js'

export async function PATCH(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const denied = requireAdmin(auth.user)
    if (denied) {
      return NextResponse.json({ error: denied.error }, { status: denied.status })
    }

    const { payoutId } = await params
    const body = await request.json()
    const result = adminPayoutSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const payout = await prisma.payout.findUnique({ where: { id: payoutId } })
    if (!payout) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    if (result.data.status === 'REJECTED' && payout.status === 'PENDING') {
      await prisma.$transaction(async (tx) => {
        await tx.payout.update({
          where: { id: payoutId },
          data: {
            status: 'REJECTED',
            adminNote: result.data.adminNote,
            processedAt: new Date(),
          },
        })
        await tx.wallet.update({
          where: { id: payout.walletId },
          data: { balance: { increment: payout.amount } },
        })
        await tx.walletTransaction.create({
          data: {
            walletId: payout.walletId,
            type: 'ADJUSTMENT',
            amount: payout.amount,
            description: 'Payout rejected — funds returned',
            releasedAt: new Date(),
          },
        })
      })
    } else {
      await prisma.payout.update({
        where: { id: payoutId },
        data: {
          status: result.data.status,
          bankRef: result.data.bankRef,
          adminNote: result.data.adminNote,
          processedAt: ['PAID', 'APPROVED', 'REJECTED'].includes(result.data.status)
            ? new Date()
            : undefined,
        },
      })
    }

    const updated = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: {
        wallet: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    })

    return NextResponse.json({ message: 'Payout updated', payout: updated })
  } catch (error) {
    console.error('[ADMIN PAYOUT PATCH]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
