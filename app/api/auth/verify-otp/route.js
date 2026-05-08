import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { signToken } from '@/lib/auth.js'
import { otpSchema } from '@/schemas/index.js'

export async function POST(request) {
  try {
    const body = await request.json()

    const result = otpSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { phone, otp } = result.data

    // Get OTP from Redis
    const storedOTP = await redis.get(`otp:${phone}`)

    if (!storedOTP) {
      return NextResponse.json(
        { error: 'OTP expired. Please request a new one.' },
        { status: 400 }
      )
    }

    if (String(storedOTP) !== String(otp)) {
      return NextResponse.json(
        { error: 'Invalid OTP. Please try again.' },
        { status: 400 }
      )
    }

    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phone }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found.' },
        { status: 404 }
      )
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: user.id },
      data:  { isVerified: true }
    })

    // Delete OTP + resend count from Redis
    await redis.del(`otp:${phone}`)
    await redis.del(`otp_resend_count:${phone}`)

    // Issue JWT
    const token = await signToken({
      userId: user.id,
      role:   user.role,
    })

    // Set token in cookie + return in body
    const response = NextResponse.json({
      message: 'Phone verified successfully',
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        role:  user.role,
      }
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,  // 7 days
      path:     '/',
    })

    return response

  } catch (error) {
    console.error('[VERIFY OTP ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}