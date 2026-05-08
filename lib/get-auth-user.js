import { verifyToken, getTokenFromHeader } from './auth.js'
import prisma from './prisma.js'

/**
 * Extracts and verifies the auth user from a request.
 * Use this at the top of every protected API route.
 *
 * @param {Request} request
 * @returns {Promise<{ user: object }|{ error: string, status: number }>}
 *
 * @example
 * const auth = await getAuthUser(request)
 * if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })
 * const { user } = auth
 */
export async function getAuthUser(request) {
  const headerToken = getTokenFromHeader(request)
  const cookieToken = request.cookies.get('token')?.value
  const token       = headerToken || cookieToken

  if (!token) {
    return { error: 'Not authenticated', status: 401 }
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return { error: 'Invalid or expired token', status: 401 }
  }

  const user = await prisma.user.findUnique({
    where:  { id: payload.userId },
    select: {
      id:         true,
      name:       true,
      email:      true,
      phone:      true,
      role:       true,
      isVerified: true,
      isActive:   true,
    }
  })

  if (!user) return { error: 'User not found', status: 404 }
  if (!user.isVerified) return { error: 'Phone not verified', status: 403 }
  if (!user.isActive)   return { error: 'Account suspended', status: 403 }

  return { user }
}