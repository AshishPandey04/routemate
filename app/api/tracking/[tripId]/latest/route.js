import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { getAuthUser } from '@/lib/get-auth-user.js'

export async function GET(request, { params }) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const { tripId } = await params

    // Try Redis cache first (fastest)
    const cached = await redis.get(`location:${tripId}`)
    if (cached) {
      const location = typeof cached === 'string'
        ? JSON.parse(cached)
        : cached
      return NextResponse.json({ location, source: 'cache' })
    }

    // Fall back to DB (latest ping)
    const latestPing = await prisma.gpsPing.findFirst({
      where:   { tripId },
      orderBy: { timestamp: 'desc' }
    })

    if (!latestPing) {
      return NextResponse.json(
        { error: 'No location data available yet' },
        { status: 404 }
      )
    }

    // Get next waypoint
    const trip = await prisma.trip.findUnique({
      where:   { id: tripId },
      include: {
        waypoints: {
          where:   { actualArrival: null },
          orderBy: { sequenceIndex: 'asc' },
          take:    1
        }
      }
    })

    const nextWaypoint = trip?.waypoints?.[0]

    return NextResponse.json({
      location: {
        tripId,
        lat:       latestPing.lat,
        lng:       latestPing.lng,
        speed:     latestPing.speed,
        heading:   latestPing.heading,
        timestamp: latestPing.timestamp,
        nextWaypoint: nextWaypoint ? {
          cityName:        nextWaypoint.cityName,
          estimatedArrival: nextWaypoint.estimatedArrival,
        } : null
      },
      source: 'db'
    })

  } catch (error) {
    console.error('[LATEST LOCATION ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}