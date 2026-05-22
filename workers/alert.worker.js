import { loadEnvLocal } from '../lib/load-env.js'

loadEnvLocal()

import { Worker, Queue } from 'bullmq'
import { Redis } from 'ioredis'
import prisma from '../lib/prisma.js'
import { sendMulticastNotification } from '../lib/fcm.js'

const connection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
})

// ─── Process Route Alerts ────────────────────────────────────
async function processRouteAlerts() {
  const now     = new Date()
  const twoHrs  = new Date(now.getTime() + 2 * 60 * 60 * 1000)

  // Find active trips with waypoints approaching within 2 hours
  const activeTrips = await prisma.trip.findMany({
    where:   { status: 'IN_TRANSIT' },
    include: {
      waypoints: {
        where: {
          actualArrival:   null,
          estimatedArrival: { lte: twoHrs, gte: now }
        }
      }
    }
  })

  for (const trip of activeTrips) {
    for (const waypoint of trip.waypoints) {
      // Find unnotified route alerts for this city
      const alerts = await prisma.routeAlert.findMany({
        where: {
          fromCity: waypoint.cityName,
          notified: false,
          date:     { lte: twoHrs }
        },
        include: { user: true }
      })

      for (const alert of alerts) {
        // Check destination is on this trip's route
        const fromIdx = trip.routeCities.indexOf(waypoint.cityName)
        const toIdx   = trip.routeCities.indexOf(alert.toCity)

        if (toIdx <= fromIdx) continue

        // Check seat availability
        const seatsLeft = trip.totalSeats  // simplified check

        if (seatsLeft > 0 && alert.user.fcmToken) {
          const etaMinutes = Math.round(
            (new Date(waypoint.estimatedArrival) - now) / 60000
          )

          await sendMulticastNotification(
            [alert.user.fcmToken],
            '🚗 Car Approaching Your City!',
            `A car heading to ${alert.toCity} is ${etaMinutes} minutes from ${waypoint.cityName}. Book now!`,
            {
              type:   'CAR_APPROACHING',
              tripId: trip.id,
              city:   waypoint.cityName,
            }
          )

          // Mark as notified
          await prisma.routeAlert.update({
            where: { id: alert.id },
            data:  { notified: true }
          })

          console.log(`[WORKER] Notified user ${alert.userId} about car in ${waypoint.cityName}`)
        }
      }
    }
  }
}

// ─── Auto Cancel Ghost Trips ─────────────────────────────────
async function processGhostTrips() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

  const ghostTrips = await prisma.trip.findMany({
    where: {
      status:       'SCHEDULED',
      departureTime: { lt: oneHourAgo }
    },
    include: {
      bookings: { where: { status: 'CONFIRMED' } }
    }
  })

  for (const trip of ghostTrips) {
    console.log(`[WORKER] Auto-cancelling ghost trip: ${trip.id}`)

    await prisma.$transaction(async (tx) => {
      await tx.trip.update({
        where: { id: trip.id },
        data: {
          status:           'CANCELLED',
          cancellationNote: 'Auto-cancelled: driver did not start the trip'
        }
      })

      for (const booking of trip.bookings) {
        await tx.booking.update({
          where: { id: booking.id },
          data:  { status: 'CANCELLED' }
        })

        await tx.seatSegment.deleteMany({
          where: { bookingId: booking.id }
        })
      }

      await tx.returnSlot.updateMany({
        where: { tripId: trip.id },
        data:  { status: 'CANCELLED' }
      })
    })

    // Notify affected riders
    const riderTokens = await Promise.all(
      trip.bookings.map(async (booking) => {
        const user = await prisma.user.findUnique({
          where:  { id: booking.userId },
          select: { fcmToken: true }
        })
        return user?.fcmToken
      })
    )

    const validTokens = riderTokens.filter(Boolean)
    if (validTokens.length > 0) {
      await sendMulticastNotification(
        validTokens,
        '⚠️ Trip Cancelled',
        'Your trip was cancelled because the driver did not start on time. Full refund initiated.',
        { type: 'TRIP_AUTO_CANCELLED', tripId: trip.id }
      )
    }
  }
}

// ─── Worker runs every 5 minutes ────────────────────────────
const alertQueue = new Queue('alerts', { connection })

const worker = new Worker('alerts', async (job) => {
  console.log(`[WORKER] Processing job: ${job.name}`)

  if (job.name === 'processAlerts') {
    await processRouteAlerts()
    await processGhostTrips()
  }
}, { connection })

worker.on('completed', (job) => {
  console.log(`[WORKER] Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[WORKER] Job ${job.id} failed:`, err.message)
})

// Schedule recurring job every 5 minutes
async function scheduleJobs() {
  await alertQueue.add(
    'processAlerts',
    {},
    {
      repeat:   { every: 5 * 60 * 1000 },  // every 5 minutes
      jobId:    'recurring-alerts',
    }
  )
  console.log('[WORKER] Alert jobs scheduled')
}

scheduleJobs()

console.log('[WORKER] Alert worker started')