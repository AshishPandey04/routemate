import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { z } from 'zod'

const schema = z.object({
  fromCity: z.string().min(1),
  toCity:   z.string().min(1),
  date:     z.string().min(1),
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
        { error: result.error.issues?.[0]?.message },
        { status: 400 }
      )
    }

    const { fromCity, toCity, date } = result.data

    // Check if alert already exists
    const existing = await prisma.routeAlert.findFirst({
      where: {
        userId:   auth.user.id,
        fromCity,
        toCity,
        notified: false,
      }
    })

    if (existing) {
      return NextResponse.json(
        { message: 'Alert already set', alertId: existing.id }
      )
    }

    const alert = await prisma.routeAlert.create({
      data: {
        userId: auth.user.id,
        fromCity,
        toCity,
        date:   new Date(date),
      }
    })

    return NextResponse.json({
      message: 'Route alert set. We will notify you when a car is approaching.',
      alertId: alert.id,
    }, { status: 201 })

  } catch (error) {
    console.error('[ROUTE ALERT ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}