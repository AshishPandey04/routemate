import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'
import { getAuthUser } from '@/lib/get-auth-user.js'
import { pingSchema } from '@/schemas/index.js'
import { broadcastLocationUpdate } from '@/lib/socket-broadcast.js'
import { sendPushNotification } from '@/lib/fcm.js'

export async function POST(request) {
  try {
    const auth = await getAuthUser(request)
    if (auth.error) return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    )

    const body   = await request.json()
    const result = pingSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues?.[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }

    const { tripId, lat, lng, speed, heading } = result.data

    // Verify driver owns this trip
    const trip = await prisma.trip.findUnique({
      where:   { id: tripId },
      include: { waypoints: { orderBy: { sequenceIndex: 'asc' } } }
    })

    if (!trip || trip.driverId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    if (trip.status !== 'IN_TRANSIT') {
      return NextResponse.json(
        { error: 'Trip is not in transit' },
        { status: 400 }
      )
    }

    // Save GPS ping to DB
    await prisma.gpsPing.create({
      data: { tripId, lat, lng, speed, heading }
    })

    // Update ETAs for upcoming waypoints
    const updatedETAs = recalculateETAs(trip.waypoints, lat, lng, speed)

    // Update waypoint ETAs in DB
    await Promise.all(
      updatedETAs.map(({ id, estimatedArrival }) =>
        prisma.waypoint.update({
          where: { id },
          data:  { estimatedArrival }
        })
      )
    )

    // Cache latest location in Redis (for riders joining mid-trip)
    const locationData = {
      tripId,
      lat,
      lng,
      speed,
      heading,
      timestamp:   new Date().toISOString(),
      updatedETAs: updatedETAs.map(w => ({
        cityName:        w.cityName,
        estimatedArrival: w.estimatedArrival,
        etaString:       getETAString(w.estimatedArrival)
      }))
    }

    await redis.set(
      `location:${tripId}`,
      JSON.stringify(locationData),
      { ex: 300 }  // 5 min TTL
    )

    // Broadcast to Socket.io via Redis pub/sub
    // The Socket.io server subscribes to this channel
    await redis.publish(
      `trip:${tripId}:location`,
      JSON.stringify(locationData)
    )

    const nextWaypoint = updatedETAs.find((w) => !w.actualArrival)
    await broadcastLocationUpdate(tripId, {
      ...locationData,
      nextWaypoint: nextWaypoint
        ? {
            cityName: nextWaypoint.cityName,
            estimatedArrival: nextWaypoint.estimatedArrival,
          }
        : null,
    })

    // Check route alerts — notify en-route users
    await checkAndFireRouteAlerts(trip, updatedETAs)

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('[PING ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}

// ─── Recalculate ETAs based on current speed ─────────────────
function recalculateETAs(waypoints, currentLat, currentLng, speed) {
  const speedKmh      = speed || 60  // default 60 km/h if no speed
  const now           = new Date()

  return waypoints.map((waypoint, index) => {
    if (waypoint.actualArrival) {
      // Already passed this waypoint
      return { ...waypoint }
    }

    // Simple distance-based ETA calculation
    const distanceKm    = getDistanceKm(
      currentLat, currentLng,
      waypoint.lat, waypoint.lng
    )
    const etaHours      = distanceKm / speedKmh
    const etaMs         = etaHours * 60 * 60 * 1000
    const estimatedArrival = new Date(now.getTime() + etaMs)

    return {
      ...waypoint,
      estimatedArrival
    }
  })
}

// ─── Haversine distance formula ──────────────────────────────
function getDistanceKm(lat1, lng1, lat2, lng2) {
  if (!lat2 || !lng2) return 0

  const R    = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(deg) {
  return deg * (Math.PI / 180)
}

// ─── ETA string formatter ─────────────────────────────────────
function getETAString(estimatedArrival) {
  const now     = new Date()
  const eta     = new Date(estimatedArrival)
  const diffMin = Math.round((eta - now) / 60000)

  if (diffMin < 0)  return 'Arrived'
  if (diffMin < 60) return `${diffMin} min away`

  const hours = Math.floor(diffMin / 60)
  const mins  = diffMin % 60
  return mins > 0 ? `${hours}h ${mins}m away` : `${hours}h away`
}

// ─── Check and fire route alerts ─────────────────────────────
async function checkAndFireRouteAlerts(trip, updatedETAs) {
  try {
    for (const waypoint of updatedETAs) {
      const etaMs       = new Date(waypoint.estimatedArrival) - new Date()
      const etaMinutes  = etaMs / 60000

      // Fire alert if car is within 2 hours of a city
      if (etaMinutes > 0 && etaMinutes <= 120) {
        const alerts = await prisma.routeAlert.findMany({
          where: {
            fromCity: waypoint.cityName,
            notified: false,
          },
          include: { user: true }
        })

        for (const alert of alerts) {
          // Check if destination is reachable from this city
          const cityIndex = trip.routeCities.indexOf(waypoint.cityName)
          const toIndex   = trip.routeCities.indexOf(alert.toCity)

          if (toIndex > cityIndex) {
            // Mark as notified
            await prisma.routeAlert.update({
              where: { id: alert.id },
              data:  { notified: true }
            })

            // Send FCM push notification if user has a token
            if (alert.user.fcmToken) {
              const etaMinutes = Math.round(etaMs / 60000)
              await sendPushNotification(
                alert.user.fcmToken,
                '🚗 Car Approaching Your City!',
                `A car heading to ${alert.toCity} is ${etaMinutes} min from ${waypoint.cityName}. Book now!`,
                { type: 'CAR_APPROACHING', tripId: trip.id, city: waypoint.cityName }
              )
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[ROUTE ALERT ERROR]', err)
  }
}