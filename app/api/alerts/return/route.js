import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { z } from 'zod'

const schema = z.object({
  returnSlotId: z.string().uuid()
})

export async function POST(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const body   = await request.json()
    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid return slot ID' },
        { status: 400 }
      )
    }

    const { returnSlotId } = result.data

    // Verify return slot exists
    const slot = await prisma.returnSlot.findUnique({
      where: { id: returnSlotId }
    })

    if (!slot) {
      return NextResponse.json(
        { error: 'Return slot not found' },
        { status: 404 }
      )
    }

    // Check duplicate
    const existing = await prisma.returnAlert.findUnique({
      where: {
        userId_returnSlotId: {
          userId:      auth.user.id,
          returnSlotId,
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { message: 'Already watching this return slot' }
      )
    }

    const alert = await prisma.returnAlert.create({
      data: {
        userId: auth.user.id,
        returnSlotId,
      }
    })

    return NextResponse.json({
      message: 'We will notify you when the driver confirms the return trip.',
      alertId: alert.id,
    }, { status: 201 })

  } catch (error) {
    console.error('[RETURN ALERT ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}