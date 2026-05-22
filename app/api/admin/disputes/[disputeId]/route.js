import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { requireAdmin } from '@/lib/is-admin.js'
import { disputeResolveSchema } from '@/schemas/index.js'

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

    const { disputeId } = await params
    const body = await request.json()
    const result = disputeResolveSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const dispute = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: result.data.status,
        resolution: result.data.resolution,
        refundAmount: result.data.refundAmount,
        adminNote: result.data.adminNote,
      },
      include: {
        booking: { include: { payment: true } },
        reporter: { select: { name: true, email: true } },
      },
    })

    return NextResponse.json({ message: 'Dispute updated', dispute })
  } catch (error) {
    console.error('[ADMIN DISPUTE PATCH]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
