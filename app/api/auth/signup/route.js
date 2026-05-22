import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { signupSchema } from '@/schemas/index.js'
import { generateOTP, sendOTP } from '@/lib/msg91.js'

export async function POST(request) {
  try {
    const body = await request.json()

    // Validate input
    const result = signupSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const { name, email, phone, password, role } = result.data

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    })
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Check phone uniqueness
    const existingPhone = await prisma.user.findUnique({
      where: { phone }
    })
    if (existingPhone) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      )
    }

    // Check OTP resend rate limit (max 3 per hour)
    const resendCount = await redis.get(`otp_resend_count:${phone}`)
    if (resendCount && parseInt(resendCount) >= 3) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Try again in an hour.' },
        { status: 429 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user (unverified)
    const user = await prisma.user.create({
      data: { name, email, phone, passwordHash, role }
    })

    // Generate + store OTP in Redis (5 min TTL)
    const otp = generateOTP()
    await redis.set(`otp:${phone}`, otp, { ex: 300 })

    // Track resend count (1 hour TTL)
    await redis.set(
      `otp_resend_count:${phone}`,
      (parseInt(resendCount) || 0) + 1,
      { ex: 3600 }
    )

    // Send OTP via MSG91
    // In development, skip sending and log OTP instead
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] OTP for ${phone}: ${otp}`)
    } else {
      await sendOTP(phone, otp)
    }

    return NextResponse.json(
      { message: 'OTP sent to your phone', userId: user.id },
      { status: 201 }
    )

  } catch (error) {
    console.error('[SIGNUP ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }

  
}