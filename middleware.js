import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

const protectedRoutes = [
  '/dashboard',
  '/my-trips',
  '/my-bookings',
  '/search',
  '/trip',
  '/track',
]

export async function middleware(request) {
  const { pathname } = request.nextUrl
  const isProtected = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (!isProtected) return NextResponse.next()

  const token = request.cookies.get('token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}