import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { emergencyContactSchema } from '@/schemas/index.js'

export async function GET(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    })

    return NextResponse.json({ emergencyContact: user })
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const result = emergencyContactSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: auth.user.id },
      data: result.data,
      select: {
        emergencyContactName: true,
        emergencyContactPhone: true,
      },
    })

    return NextResponse.json({
      message: 'Emergency contact saved',
      emergencyContact: user,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
