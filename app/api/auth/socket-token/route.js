import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user.js'

/**
 * Returns the JWT for Socket.io handshake (HttpOnly cookie is not sent to port 3001).
 */
export async function GET(request) {
  const auth = await getAuthUser(request)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const token =
    request.cookies.get('token')?.value ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  return NextResponse.json({ token })
}
