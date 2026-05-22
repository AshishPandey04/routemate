import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma.js'
import { signToken } from '@/lib/auth.js'
import { loginSchema } from '@/schemas/index.js'
import { apiSuccess, apiError } from '@/lib/api-response.js'
import { CommonErrors, ErrorCode, AppError } from '@/lib/errors.js'
import { applyRateLimit, getClientIp } from '@/lib/rate-limit.js'

export async function POST(request) {
  try {
    // Rate limit: 10 login attempts per minute per IP
    const ip        = getClientIp(request)
    const rateCheck = await applyRateLimit(`login:${ip}`, 10, 60)
    if (!rateCheck.allowed) {
      throw new AppError(
        'Too many login attempts. Please try again later.',
        ErrorCode.TOO_MANY_REQUESTS,
        429
      )
    }

    const body = await request.json()

    const result = loginSchema.safeParse(body)
    if (!result.success) {
      throw new AppError(
        result.error.issues?.[0]?.message || 'Validation failed',
        ErrorCode.VALIDATION_ERROR,
        400
      )
    }

    const { email, password } = result.data

    // ✅ FIXED: Prevent timing attack with constant-time comparison
    // Always call bcrypt.compare even if user doesn't exist
    const user = await prisma.user.findUnique({
      where: { email }
    })

    // Prepare a dummy hash for comparison if user not found (prevents timing attack)
    const hashToCompare = user?.passwordHash || '$2a$12$invalid.hash.for.timing.attack'
    const passwordMatch = await bcrypt.compare(password, hashToCompare)

    // Always return same error message regardless of whether user exists
    if (!user || !passwordMatch) {
      throw CommonErrors.invalidCredentials()
    }

    // Check if verified
    if (!user.isVerified) {
      throw CommonErrors.unverifiedAccount()
    }

    // Check if active
    if (!user.isActive) {
      throw CommonErrors.accountSuspended()
    }

    // Issue JWT
    const token = await signToken({
      userId: user.id,
      role:   user.role,
    })

    const response = apiSuccess({
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        role:  user.role,
      }
    })

    // ✅ FIXED: Set HttpOnly cookie (replaces localStorage)
    response.cookies.set('token', token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })

    return response

  } catch (error) {
    return apiError(error)
  }
}