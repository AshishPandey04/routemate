/**
 * Query caching layer using Redis
 * Implements cache-aside pattern with TTL
 */

import redis from './redis.js'

/**
 * Get cached value or fetch from source
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data if not cached
 * @param {number} ttlSeconds - Time to live in seconds (default: 300s)
 */
export async function getCached(key, fetchFn, ttlSeconds = 300) {
  try {
    // Try to get from cache
    const cached = await redis.get(key)
    if (cached) {
      return typeof cached === 'string' ? JSON.parse(cached) : cached
    }
  } catch (error) {
    console.warn('[Cache GET Error]', { key, error: error.message })
    // Fall through to fetch
  }

  // Fetch from source
  const data = await fetchFn()

  // Cache the result
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch (error) {
    console.warn('[Cache SET Error]', { key, error: error.message })
  }

  return data
}

/**
 * Invalidate cache for a key
 */
export async function invalidateCache(key) {
  try {
    await redis.del(key)
  } catch (error) {
    console.warn('[Cache DELETE Error]', { key, error: error.message })
  }
}

/**
 * Invalidate cache by pattern (e.g., "trip:*")
 */
export async function invalidateCachePattern(pattern) {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.warn('[Cache Pattern DELETE Error]', { pattern, error: error.message })
  }
}

/**
 * Get multiple cached values
 */
export async function getMultipleCached(requests) {
  const results = await Promise.allSettled(
    requests.map(({ key, fetchFn, ttl = 300 }) =>
      getCached(key, fetchFn, ttl)
    )
  )

  return results.map((result, i) =>
    result.status === 'fulfilled' ? result.value : null
  )
}

/**
 * Common cache key generators
 */
export const CacheKeys = {
  // User
  user: (userId) => `user:${userId}`,
  userProfile: (userId) => `user:profile:${userId}`,
  userRatings: (userId) => `user:ratings:${userId}`,

  // Trip
  trip: (tripId) => `trip:${tripId}`,
  tripDetails: (tripId) => `trip:details:${tripId}`,
  tripAvailability: (tripId) => `trip:availability:${tripId}`,
  searchTrips: (from, to, date) => `trips:search:${from}:${to}:${date}`,

  // Car
  car: (carId) => `car:${carId}`,
  carsByDriver: (driverId) => `cars:driver:${driverId}`,

  // Booking
  booking: (bookingId) => `booking:${bookingId}`,
  userBookings: (userId) => `bookings:user:${userId}`,

  // Messages
  tripMessages: (tripId) => `messages:trip:${tripId}`,

  // Ratings
  driverRatings: (driverId) => `ratings:driver:${driverId}`,
  riderRatings: (riderId) => `ratings:rider:${riderId}`,
}
