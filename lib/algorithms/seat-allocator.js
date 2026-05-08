import prisma from '../prisma.js'

/**
 * Checks if seats are available for a given trip segment.
 * Uses the sweep line algorithm to find peak occupancy.
 *
 * @param {string} tripId
 * @param {number} boardingIndex
 * @param {number} alightingIndex
 * @param {number} seatsRequested
 * @returns {Promise<{ available: boolean, maxAvailable: number }>}
 */
export async function checkSeatAvailability(
  tripId,
  boardingIndex,
  alightingIndex,
  seatsRequested
) {
  const trip = await prisma.trip.findUnique({
    where:  { id: tripId },
    select: { totalSeats: true }
  })

  if (!trip) throw new Error('Trip not found')

  // Fetch all segments overlapping with requested range
  const overlapping = await prisma.seatSegment.findMany({
    where: {
      tripId,
      fromIndex: { lt: alightingIndex },
      toIndex:   { gt: boardingIndex  },
    }
  })

  const peak         = calculatePeakOccupancy(overlapping)
  const maxAvailable = trip.totalSeats - peak

  return {
    available:    maxAvailable >= seatsRequested,
    maxAvailable: Math.max(0, maxAvailable)
  }
}

/**
 * Sweep line algorithm.
 * Finds peak concurrent seat occupancy across all segments.
 *
 * @param {Array<{ fromIndex: number, toIndex: number, seatsOccupied: number }>} segments
 * @returns {number}
 */
export function calculatePeakOccupancy(segments) {
  if (segments.length === 0) return 0

  const events = []

  for (const seg of segments) {
    events.push({ index: seg.fromIndex, delta: +seg.seatsOccupied })
    events.push({ index: seg.toIndex,   delta: -seg.seatsOccupied })
  }

  // CRITICAL: at same index, process exits (-) before entries (+)
  events.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index
    return a.delta - b.delta
  })

  let current = 0
  let peak    = 0

  for (const event of events) {
    current += event.delta
    peak = Math.max(peak, current)
  }

  return peak
}