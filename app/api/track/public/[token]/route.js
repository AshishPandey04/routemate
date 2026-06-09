import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { getTripByShareToken } from '@/lib/trip-share.js'

/** Public live tracking — no auth (token in URL). */
export async function GET(request, { params }) {
  try {
    const { token } = await params
    const share = await getTripByShareToken(token)

    if (!share) {
      return NextResponse.json(
        { error: 'Link expired or invalid' },
        { status: 404 }
      )
    }

    const trip = share.trip
    let location = null

    const cached = await redis.get(`location:${trip.id}`)
    if (cached) {
      location = typeof cached === 'string' ? JSON.parse(cached) : cached
    } else {
      const ping = await prisma.gpsPing.findFirst({
        where: { tripId: trip.id },
        orderBy: { timestamp: 'desc' },
      })
      if (ping) {
        location = {
          lat: ping.lat,
          lng: ping.lng,
          speed: ping.speed,
          heading: ping.heading,
          timestamp: ping.timestamp,
        }
      }
    }

    return NextResponse.json({
      trip: {
        originCity: trip.originCity,
        destinationCity: trip.destinationCity,
        status: trip.status,
        encodedPolyline: trip.encodedPolyline,
        originLat: trip.originLat,
        originLng: trip.originLng,
        destinationLat: trip.destinationLat,
        destinationLng: trip.destinationLng,
        driverName: trip.driver.name,
        waypoints: trip.waypoints,
      },
      location,
    })
  } catch (error) {
    console.error('[PUBLIC TRACK]', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
