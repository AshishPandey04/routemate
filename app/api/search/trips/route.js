import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma.js'
import { checkSeatAvailability } from '@/lib/algorithms/seat-allocator.js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const from  = searchParams.get('from')
    const to    = searchParams.get('to')
    const date  = searchParams.get('date')
    const seats = parseInt(searchParams.get('seats') || '1')

    if (!from || !to || !date) {
      return NextResponse.json(
        { error: 'from, to and date are required' },
        { status: 400 }
      )
    }

    const searchDate      = new Date(date)
    const nextDay         = new Date(searchDate)
    nextDay.setDate(nextDay.getDate() + 1)

    // Run all 3 queries in parallel
    const [directTrips, enRouteTrips, returnSlots] = await Promise.all([

      // Query 1 — Direct SCHEDULED trips
      prisma.trip.findMany({
        where: {
          routeCities:  { hasEvery: [from, to] },
          departureTime: { gte: searchDate, lt: nextDay },
          status:        'SCHEDULED',
          allowSharing:  true,
        },
        include: {
          waypoints: { orderBy: { sequenceIndex: 'asc' } },
          car:       { select: { make: true, model: true, isAC: true } },
          driver:    { select: { name: true, ratingsReceived: true } },
        }
      }),

      // Query 2 — EN_ROUTE IN_TRANSIT trips
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
        }
      }),

      // Query 3 — Return slots
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

    // ── Helper: get indexes + availability ──────────────────
    async function buildTripResult(trip, type, extraData = {}) {
      const cities        = trip.routeCities
      const fromIndex     = cities.indexOf(from)
      const toIndex       = cities.indexOf(to)

      // Validate direction
      if (fromIndex === -1 || toIndex === -1 || fromIndex >= toIndex) {
        return null
      }

      // Check seat availability
      const availability = await checkSeatAvailability(
        trip.id,
        fromIndex,
        toIndex,
        seats
      )

      if (!availability.available) return null

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
        w => w.cityName === from
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
    const directResults = (
      await Promise.all(directTrips.map(t => buildTripResult(t, 'DIRECT')))
    ).filter(Boolean)

    // ── Process en-route trips ───────────────────────────────
    const enRouteResults = (
      await Promise.all(enRouteTrips.map(async (trip) => {
        const boardingWaypoint = trip.waypoints.find(
          w => w.cityName === from
        )

        // Skip if boarding city already passed
        if (boardingWaypoint) {
          const eta = new Date(boardingWaypoint.estimatedArrival)
          const buffer = new Date(Date.now() + 30 * 60 * 1000) // 30 min buffer
          if (eta < buffer) return null
        }

        const latestPing = trip.gpsPings?.[0]

        return buildTripResult(t, 'EN_ROUTE', {
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

    return NextResponse.json({
      direct:      directResults,
      enRoute:     enRouteResults,
      returnTrips: returnResults,
      meta: {
        from, to, date, seats,
        totalResults: directResults.length + enRouteResults.length + returnResults.length
      }
    })

  } catch (error) {
    console.error('[SEARCH TRIPS ERROR]', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
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