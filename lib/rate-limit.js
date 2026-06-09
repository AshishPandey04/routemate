/**
 * Rate limiting utility using Upstash Redis
 * Sliding window algorithm via sorted sets
 */

import redis from './redis.js'

/**
 * Check and apply rate limit for a given key.
 * Uses a Redis sorted set as a sliding window counter.
 *
 * @param {string} key            - Unique rate limit key (e.g. "login:1.2.3.4")
 * @param {number} limit          - Max requests allowed in the window
 * @param {number} windowSeconds  - Window size in seconds
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: Date }>}
 */
export async function applyRateLimit(key, limit, windowSeconds) {
  const now         = Date.now()
  const windowStart = now - windowSeconds * 1000
  const member      = `${now}-${Math.random()}`

  // Upstash Redis pipeline — uses the REST-based pipeline API
  const results = await redis.pipeline()
    .zremrangebyscore(key, '-inf', windowStart)   // drop expired entries
    .zadd(key, { score: now, member })             // add current request
    .zcard(key)                                    // count requests in window
    .expire(key, windowSeconds)                    // reset TTL
    .exec()

  // zcard result is at index 2 (after zremrangebyscore and zadd)
  const count = results[2]

  return {
    allowed:   count <= limit,
    remaining: Math.max(0, limit - count),
    resetAt:   new Date(now + windowSeconds * 1000),
  }
}

/**
 * Extract the real client IP from request headers.
 */
export function getClientIp(request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip')                             ||
    request.headers.get('cf-connecting-ip')                      ||
    'unknown'
  )
}
