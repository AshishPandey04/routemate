import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { requestPayout } from '@/lib/wallet-service.js'
import { payoutRequestSchema } from '@/schemas/index.js'

export async function POST(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    if (!['DRIVER', 'BOTH'].includes(auth.user.role)) {
      return NextResponse.json({ error: 'Drivers only' }, { status: 403 })
    }

    const body = await request.json()
    const result = payoutRequestSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message || 'Invalid amount' },
        { status: 400 }
      )
    }

    const payout = await requestPayout(auth.user.id, result.data.amount)

    return NextResponse.json({
      message: 'Payout requested. Admin will process within 2–3 business days.',
      payout,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Payout failed' },
      { status: 400 }
    )
  }
}
