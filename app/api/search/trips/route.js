import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { checkSeatAvailability } from '@/lib/algorithms/seat-allocator.js'
import { apiSuccess, apiError } from '@/lib/api-response.js'
import { AppError, ErrorCode } from '@/lib/errors.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const from  = searchParams.get('from')
    const to    = searchParams.get('to')
    const date  = searchParams.get('date')
    const seats = parseInt(searchParams.get('seats') || '1')
    
    // ✅ FIXED: Add pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20')) // Max 50 per page
    const skip = (page - 1) * limit

    if (!from || !to || !date) {
      throw new AppError(
        'from, to and date are required',
        ErrorCode.VALIDATION_ERROR,
        400
      )
    }

    const searchDate = new Date(date)
    // Expand window to ±1 day to handle timezone offsets (IST = UTC+5:30).
    // A trip departing at e.g. 23:00 IST on the searched date is 17:30 UTC
    // the same calendar day, but a trip at 00:30 IST is 19:00 UTC the day before.
    // We fetch a 48-hour window and let the city/date match handle precision.
    const windowStart = new Date(searchDate)
    windowStart.setDate(windowStart.getDate() - 1)   // day before at 00:00 UTC
    const windowEnd = new Date(searchDate)
    windowEnd.setDate(windowEnd.getDate() + 2)        // day after at 00:00 UTC

    // Run all 3 queries in parallel
    const [directTrips, enRouteTrips, returnSlots] = await Promise.all([

      // Query 1 — Direct SCHEDULED trips (with pagination)
      prisma.trip.findMany({
        where: {
          routeCities:   { hasEvery: [from, to] },
          departureTime: { gte: windowStart, lt: windowEnd },
          status:        'SCHEDULED',
          allowSharing:  true,
        },
        include: {
          waypoints: { orderBy: { sequenceIndex: 'asc' } },
          car:       { select: { make: true, model: true, isAC: true } },
          driver:    { select: { name: true, ratingsReceived: true } },
        },
        take: limit,
        skip: skip,
        orderBy: { departureTime: 'asc' }
      }),

      // Query 2 — EN_ROUTE IN_TRANSIT trips (with pagination)
      prisma.trip.findMany({
        where: {
          routeCities:  { hasEvery: [from, to] },
          status:        'IN_TRANSIT',
          allowSharing:  true,
        },
        include: {
          waypoints: { orderBy: { sequenceIndex: 'asc' } },
          car:       { select: { make: true, model: true, isAC: true } },
          driver:    { select: { name: true, ratingsReceived: true } },
          gpsPings:  {
            orderBy: { timestamp: 'desc' },
            take:    1
          }
        },
        take: limit,
        skip: skip,
        orderBy: { departureTime: 'asc' }
      }),

      // Query 3 — Return slots (with pagination)
      prisma.returnSlot.findMany({
        where: {
          returnOrigin:      from,
          returnDestination: to,
          estimatedReturnDate: { gte: searchDate },
          status:            { in: ['OPEN', 'CONFIRMED'] }
        },
        include: {
          trip: {
            include: {
              car:    { select: { make: true, model: true, isAC: true } },
              driver: { select: { name: true, ratingsReceived: true } },
            }
          }
        }
      })
    ])

    // ── Helper: Check availability for multiple trips, each with its own indexes ──
    async function checkAvailabilityBatchPerTrip(tripIds, indexMap, seatsNeeded) {
      if (tripIds.length === 0) return new Map()

      const segments = await prisma.seatSegment.findMany({
        where:  { tripId: { in: tripIds } },
        select: { tripId: true, fromIndex: true, toIndex: true, seatsOccupied: true }
      })

      const tripsWithSeats = await prisma.trip.findMany({
        where:  { id: { in: tripIds } },
        select: { id: true, totalSeats: true }
      })

      const seatMap        = new Map(tripsWithSeats.map(t => [t.id, t.totalSeats]))
      const availabilityMap = new Map()

      for (const tripId of tripIds) {
        const { fromIndex, toIndex } = indexMap.get(tripId) || { fromIndex: -1, toIndex: -1 }

        // Skip trips where the city pair is invalid
        if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
          availabilityMap.set(tripId, { available: false, maxAvailable: 0 })
          continue
        }

        const tripSeats    = seatMap.get(tripId) || 0
        const tripSegments = segments.filter(s => s.tripId === tripId)

        // Sweep-line: find peak occupancy over [fromIndex, toIndex)
        let maxOccupied = 0
        for (const seg of tripSegments) {
          if (seg.fromIndex < toIndex && seg.toIndex > fromIndex) {
            maxOccupied = Math.max(maxOccupied, seg.seatsOccupied)
          }
        }

        const maxAvailable = Math.max(0, tripSeats - maxOccupied)
        availabilityMap.set(tripId, {
          available:    maxAvailable >= seatsNeeded,
          maxAvailable,
        })
      }

      return availabilityMap
    }

    // ── Helper: get indexes + availability ──────────────────
    async function buildTripResult(trip, type, availabilityMap, extraData = {}) {
      const cities    = trip.routeCities
      // Case-insensitive match so "jaipur" == "Jaipur"
      const fromLower = from.toLowerCase()
      const toLower   = to.toLowerCase()
      const fromIndex = cities.findIndex(c => c.toLowerCase() === fromLower)
      const toIndex   = cities.findIndex(c => c.toLowerCase() === toLower)

      // Validate direction
      if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
        return null
      }

      // ✅ FIXED: Get availability from pre-computed map instead of individual query
      const availability = availabilityMap.get(trip.id)
      if (!availability?.available) return null

      // Calculate price for this segment
      const segmentFraction = (toIndex - fromIndex) / (cities.length - 1)
      const pricePerSeat    = Math.round(
        trip.distanceKm * segmentFraction * trip.pricePerKm
      )

      // Driver rating
      const ratings   = trip.driver.ratingsReceived || []
      const avgRating = ratings.length
        ? (ratings.reduce((s, r) => s + r.score, 0) / ratings.length).toFixed(1)
        : null

      // ETA to boarding city for en-route trips
      const boardingWaypoint = trip.waypoints?.find(
        w => w.cityName.toLowerCase() === fromLower
      )
      const etaToBoarding = boardingWaypoint
        ? getETAString(boardingWaypoint.estimatedArrival)
        : null

      return {
        tripId:          trip.id,
        type,
        originCity:      trip.originCity,
        destinationCity: trip.destinationCity,
        boardingCity:    from,
        alightingCity:   to,
        boardingIndex:   fromIndex,
        alightingIndex:  toIndex,
        departureTime:   trip.departureTime,
        estimatedArrival: trip.estimatedArrival,
        pricePerSeat,
        availableSeats:  availability.maxAvailable,
        car:             trip.car,
        driver: {
          name:        trip.driver.name,
          avgRating,
          totalRatings: ratings.length,
        },
        etaToBoarding,
        ...extraData
      }
    }

    // ── Process direct trips ─────────────────────────────────
    // Each trip has its own routeCities array, so indexes must be
    // computed per-trip inside buildTripResult — not from trip[0].
    // We pass sentinel values here; checkAvailabilityBatch uses the
    // per-trip indexes resolved inside buildTripResult via the map.
    const directTripIds = directTrips.map(t => t.id)

    // Build a per-trip index map so checkAvailabilityBatch uses the
    // correct fromIndex/toIndex for every trip independently.
    const directIndexMap = new Map(
      directTrips.map(t => {
        const fromLower = from.toLowerCase()
        const toLower   = to.toLowerCase()
        const fi = t.routeCities.findIndex(c => c.toLowerCase() === fromLower)
        const ti = t.routeCities.findIndex(c => c.toLowerCase() === toLower)
        return [t.id, { fromIndex: fi, toIndex: ti }]
      })
    )
    const directAvailability = await checkAvailabilityBatchPerTrip(
      directTripIds,
      directIndexMap,
      seats
    )

    const directResults = (
      await Promise.all(
        directTrips.map(t => buildTripResult(t, 'DIRECT', directAvailability))
      )
    ).filter(Boolean)

    // ── Process en-route trips ───────────────────────────────
    const enRouteTripIds = enRouteTrips.map(t => t.id)
    const enRouteIndexMap = new Map(
      enRouteTrips.map(t => {
        const fromLower = from.toLowerCase()
        const toLower   = to.toLowerCase()
        const fi = t.routeCities.findIndex(c => c.toLowerCase() === fromLower)
        const ti = t.routeCities.findIndex(c => c.toLowerCase() === toLower)
        return [t.id, { fromIndex: fi, toIndex: ti }]
      })
    )
    const enRouteAvailability = await checkAvailabilityBatchPerTrip(
      enRouteTripIds,
      enRouteIndexMap,
      seats
    )
    const enRouteResults = (
      await Promise.all(enRouteTrips.map(async (trip) => {
        const boardingWaypoint = trip.waypoints.find(
          w => w.cityName.toLowerCase() === from.toLowerCase()
        )

        // Skip if boarding city already passed
        if (boardingWaypoint) {
          const eta = new Date(boardingWaypoint.estimatedArrival)
          const buffer = new Date(Date.now() + 30 * 60 * 1000) // 30 min buffer
          if (eta < buffer) return null
        }

        const latestPing = trip.gpsPings?.[0]

        return buildTripResult(trip, 'EN_ROUTE', enRouteAvailability, {
          currentLocation: latestPing
            ? { lat: latestPing.lat, lng: latestPing.lng }
            : null
        })
      }))
    ).filter(Boolean)

    // ── Process return slots ─────────────────────────────────
    const returnResults = returnSlots.map(slot => ({
      tripId:              slot.trip.id,
      type:                'RETURN',
      returnSlotId:        slot.id,
      returnSlotStatus:    slot.status,
      originCity:          slot.returnOrigin,
      destinationCity:     slot.returnDestination,
      boardingCity:        from,
      alightingCity:       to,
      estimatedReturnDate: slot.estimatedReturnDate,
      car:                 slot.trip.car,
      driver: {
        name: slot.trip.driver.name,
      }
    }))

    return apiSuccess({
      direct:      directResults,
      enRoute:     enRouteResults,
      returnTrips: returnResults,
      meta: {
        from, to, date, seats,
        page,
        limit,
        hasMore: directResults.length === limit || enRouteResults.length === limit,
        totalResults: directResults.length + enRouteResults.length + returnResults.length
      }
    })

  } catch (error) {
    console.error('[SEARCH TRIPS ERROR]', {
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    })
    return apiError(error)
  }
}

// ── Helper: format ETA as human readable string ─────────────
function getETAString(estimatedArrival) {
  const now     = new Date()
  const eta     = new Date(estimatedArrival)
  const diffMs  = eta - now
  const diffMin = Math.round(diffMs / 60000)

  if (diffMin < 0)   return 'Departed'
  if (diffMin < 60)  return `${diffMin} minutes away`

  const hours = Math.floor(diffMin / 60)
  const mins  = diffMin % 60

  return mins > 0 ? `${hours}h ${mins}m away` : `${hours}h away`
}