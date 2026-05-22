/**
 * Next.js Proxy (replaces middleware.js in Next.js 16+)
 * — Security headers, API rate limits, API auth, page auth redirects
 */

import { NextResponse } from 'next/server'
import { verifyToken, getTokenFromHeader } from './lib/auth.js'
import { applyRateLimit, getClientIp } from './lib/rate-limit.js'

const PROTECTED_API_ROUTES = [
  '/api/bookings',
  '/api/trips/create',
  '/api/cars/add',
  '/api/messages',
  '/api/notifications',
  '/api/ratings',
  '/api/user',
  '/api/alerts',
  '/api/tracking',
  '/api/my-bookings',
  '/api/my-trips',
  '/api/wallet',
  '/api/admin',
  '/api/safety',
  '/api/disputes',
]

/** Page routes that require login (redirect to /login). */
const PROTECTED_PAGE_ROUTES = [
  '/dashboard',
  '/my-trips',
  '/my-bookings',
  '/search',
  '/trip',
  '/track',
  '/admin',
  '/wallet',
  '/safety',
  '/cars',
  '/messages',
  '/alerts',
  '/ratings',
  '/bookings',
  '/user',
]

const RATE_LIMITED_ENDPOINTS = {
  '/api/auth/signup': { limit: 5, window: 3600 },
  '/api/auth/login': { limit: 10, window: 300 },
  '/api/auth/resend-otp': { limit: 5, window: 3600 },
  '/api/search/trips': { limit: 100, window: 60 },
  '/api/bookings/confirm': { limit: 50, window: 60 },
}

function applySecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(self), microphone=(self), camera=(self)'
  )

  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    )
  }

  return response
}

function getToken(request) {
  return (
    request.cookies.get('token')?.value || getTokenFromHeader(request) || null
  )
}

async function handleApi(request, pathname) {
  const response = applySecurityHeaders(NextResponse.next())

  const pathConfig = Object.entries(RATE_LIMITED_ENDPOINTS).find(([path]) =>
    pathname.startsWith(path)
  )

  if (pathConfig) {
    const [path, { limit, window }] = pathConfig
    const clientIp = getClientIp(request)
    const rateLimit = await applyRateLimit(`${path}:${clientIp}`, limit, window)

    response.headers.set('X-RateLimit-Limit', String(limit))
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining))
    response.headers.set('X-RateLimit-Reset', rateLimit.resetAt.toISOString())

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOO_MANY_REQUESTS',
            message: 'Too many requests. Please try again later',
            status: 429,
            retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
          },
        },
        { status: 429, headers: response.headers }
      )
    }
  }

  const isProtected = PROTECTED_API_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (!isProtected) {
    return response
  }

  const token = getToken(request)

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          status: 401,
        },
      },
      { status: 401, headers: response.headers }
    )
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
          status: 401,
        },
      },
      { status: 401, headers: response.headers }
    )
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.userId)
  requestHeaders.set('x-user-role', payload.role)

  return NextResponse.next({
    request: { headers: requestHeaders },
    headers: response.headers,
  })
}

async function handlePage(request, pathname) {
  const isProtected = PROTECTED_PAGE_ROUTES.some((route) =>
    pathname.startsWith(route)
  )

  if (!isProtected) {
    return applySecurityHeaders(NextResponse.next())
  }

  const token = getToken(request)

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return applySecurityHeaders(NextResponse.next())
}

export async function proxy(request) {
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/api/')) {
    return handleApi(request, pathname)
  }

  return handlePage(request, pathname)
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|share).*)',
  ],
}
