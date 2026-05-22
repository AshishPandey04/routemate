// Simple in-memory cache for API responses
const responseCache = new Map()

export function setCache(key, value, ttl = 5 * 60 * 1000) {
  // Default 5 minute TTL
  responseCache.set(key, {
    data: value,
    timestamp: Date.now(),
    ttl
  })
}

export function getCache(key) {
  const cached = responseCache.get(key)
  if (!cached) return null

  // Check if cache has expired
  if (Date.now() - cached.timestamp > cached.ttl) {
    responseCache.delete(key)
    return null
  }

  return cached.data
}

export function clearCache(key) {
  responseCache.delete(key)
}

export function clearAllCache() {
  responseCache.clear()
}

// Cache key generator
export function getCacheKey(endpoint, params = {}) {
  return `${endpoint}:${JSON.stringify(params)}`
}
