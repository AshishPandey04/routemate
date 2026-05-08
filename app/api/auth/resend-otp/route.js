import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { generateOTP, sendOTP } from '@/lib/msg91.js'
import { z } from 'zod'

const schema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/)
})

export async function POST(request) {
  try {
    const body = await request.json()

    const result = schema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid phone number' },
        { status: 400 }
      )
    }

    const { phone } = result.data

    // Check user exists
    const user = await prisma.user.findUnique({ where: { phone } })
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this phone number.' },
        { status: 404 }
      )
    }

    // Check rate limit
    const resendCount = await redis.get(`otp_resend_count:${phone}`)
    if (resendCount && parseInt(resendCount) >= 3) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Try again in an hour.' },
        { status: 429 }
      )
    }

    // Generate + store new OTP
    const otp = generateOTP()
    await redis.set(`otp:${phone}`, otp, { ex: 300 })
    await redis.set(
      `otp_resend_count:${phone}`,
      (parseInt(resendCount) || 0) + 1,
      { ex: 3600 }
    )

    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Resent OTP for ${phone}: ${otp}`)
    } else {
      await sendOTP(phone, otp)
    }

    return NextResponse.json({ message: 'OTP resent successfully' })

  } catch (error) {
    console.error('[RESEND OTP ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}