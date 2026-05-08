import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { verifyToken, getTokenFromHeader } from '@/lib/auth.js'

export async function GET(request) {
  try {
    // Check header first, then cookie
    const headerToken = getTokenFromHeader(request)
    const cookieToken = request.cookies.get('token')?.value
    const token       = headerToken || cookieToken

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where:  { id: payload.userId },
      select: {
        id:        true,
        name:      true,
        email:     true,
        phone:     true,
        role:      true,
        isVerified: true,
        createdAt: true,
      }
    })

    if (!user || !user.isVerified) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error('[ME ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    )
  }
}