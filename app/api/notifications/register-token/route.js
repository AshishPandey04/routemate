import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { z } from 'zod'

const schema = z.object({
  fcmToken: z.string().min(1)
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
        { error: 'Invalid FCM token' },
        { status: 400 }
      )
    }

    await prisma.user.update({
      where: { id: auth.user.id },
      data:  { fcmToken: result.data.fcmToken }
    })

    return NextResponse.json({ message: 'FCM token registered' })

  } catch (error) {
    console.error('[FCM TOKEN ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}