import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { getCached, invalidateCache, CacheKeys } from '@/lib/cache-v2.js'

export async function GET(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const cacheKey = CacheKeys.userBookings(auth.user.id)

    const bookings = await getCached(cacheKey, async () => {
      return prisma.booking.findMany({
        where:   { userId: auth.user.id },
        include: {
          trip: {
            include: {
              driver: { select: { name: true, phone: true } },
              car:    { select: { make: true, model: true, isAC: true } },
            }
          },
          payment: { select: { status: true, refundAmount: true } },
          rating:  { select: { score: true } },
        },
        orderBy: { createdAt: 'desc' }
      })
    }, 180) // 3 minute TTL

    return NextResponse.json({ bookings })

  } catch (error) {
    console.error('[MY BOOKINGS ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}