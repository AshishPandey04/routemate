/**
 * Given an origin and destination city, returns:
 * - ordered array of cities along the route
 * - total distance in km
 * - total duration in hours
 * - encoded polyline for map rendering
 * - waypoints with lat/lng for each city
 *
 * @param {string} origin       - e.g. "Jaipur, Rajasthan"
 * @param {string} destination  - e.g. "Mumbai, Maharashtra"
 * @returns {Promise<import('../types/index.js').RouteResult>}
 */
export async function getRouteDetails(origin, destination) {
  const key = process.env.GOOGLE_MAPS_API_KEY

  if (!key) throw new Error('GOOGLE_MAPS_API_KEY is not set')

  // ─── Step 1: Get route from Directions API ───────────────
  const directionsUrl = new URL(
    'https://maps.googleapis.com/maps/api/directions/json'
  )
  directionsUrl.searchParams.set('origin',      origin)
  directionsUrl.searchParams.set('destination', destination)
  directionsUrl.searchParams.set('key',         key)
  directionsUrl.searchParams.set('region',      'IN')  // bias to India

  const directionsRes  = await fetch(directionsUrl.toString())
  const directionsData = await directionsRes.json()

  if (directionsData.status !== 'OK') {
    throw new Error(
      `Directions API error: ${directionsData.status} — ${directionsData.error_message || ''}`
    )
  }

  const route = directionsData.routes[0]
  const legs  = route.legs

  // ─── Step 2: Extract total distance + duration ───────────
  const totalDistanceM  = legs.reduce((sum, leg) => sum + leg.distance.value, 0)
  const totalDurationS  = legs.reduce((sum, leg) => sum + leg.duration.value, 0)
  const distanceKm      = Math.round(totalDistanceM / 1000)
  const durationHours   = Math.round((totalDurationS / 3600) * 10) / 10

  // ─── Step 3: Extract encoded polyline ────────────────────
  const encodedPolyline = route.overview_polyline.points

  // ─── Step 4: Get all waypoint locations ──────────────────
  // start location of first leg + end location of each leg
  const waypointLocations = [
    legs[0].start_location,
    ...legs.map(leg => leg.end_location)
  ]

  const waypointAddresses = [
    legs[0].start_address,
    ...legs.map(leg => leg.end_address)
  ]

  // ─── Step 5: Extract city names from addresses ───────────
  const rawCities = waypointAddresses.map(addr => extractCityName(addr))

  // ─── Step 6: Get intermediate cities along the route ─────
  // We use the steps within each leg to find major towns
  const intermediateCities = await getIntermediateCities(
    legs,
    key,
    rawCities[0],
    rawCities[rawCities.length - 1]
  )

  // ─── Step 7: Build final ordered city list ───────────────
  const allCities = buildCityList(rawCities, intermediateCities)

  // ─── Step 8: Calculate ETA for each city ─────────────────
  const cityETAs = calculateCityETAs(legs, allCities, totalDurationS)

  const originLat      = legs[0].start_location.lat
  const originLng      = legs[0].start_location.lng
  const destinationLat = legs[legs.length - 1].end_location.lat
  const destinationLng = legs[legs.length - 1].end_location.lng

  const cityCoordinates = await buildCityCoordinates(
    allCities,
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    key
  )

  return {
    cities:          allCities,
    distanceKm,
    durationHours,
    encodedPolyline,
    cityETAs,        // { cityName: durationSecondsFromStart }
    cityCoordinates, // { cityName: { lat, lng } }
    originLat,
    originLng,
    destinationLat,
    destinationLng,
  }
}

/**
 * Resolve lat/lng for each city on the route (origin/dest from Directions; others geocoded).
 * @param {string[]} cities
 * @returns {Promise<Record<string, { lat: number, lng: number }>>}
 */
async function buildCityCoordinates(
  cities,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  key
) {
  const coords = {}

  if (cities.length === 0) return coords

  coords[cities[0]] = { lat: originLat, lng: originLng }

  if (cities.length > 1) {
    coords[cities[cities.length - 1]] = {
      lat: destinationLat,
      lng: destinationLng,
    }
  }

  for (let i = 1; i < cities.length - 1; i++) {
    const city = cities[i]
    if (coords[city]) continue
    try {
      const point = await geocodeCity(city, key)
      if (point) coords[city] = point
    } catch {
      // skip failed geocodes
    }
  }

  return coords
}

/**
 * Forward-geocode a city name in India.
 * @param {string} cityName
 * @param {string} [apiKey]
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
export async function geocodeCity(cityName, apiKey) {
  const key = apiKey || process.env.GOOGLE_MAPS_API_KEY
  if (!key || !cityName) return null

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
  url.searchParams.set('address', `${cityName}, India`)
  url.searchParams.set('key', key)
  url.searchParams.set('region', 'IN')

  const res  = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' || !data.results[0]) return null

  const { lat, lng } = data.results[0].geometry.location
  return { lat, lng }
}

// ─────────────────────────────────────────────────────────────
// Extract city name from a Google Maps address string
// "Ajmer, Rajasthan 305001, India" → "Ajmer"
// ─────────────────────────────────────────────────────────────
function extractCityName(address) {
  if (!address) return ''
  const parts = address.split(',')
  return parts[0].trim()
}

// ─────────────────────────────────────────────────────────────
// Get intermediate cities by reverse geocoding step locations
// ─────────────────────────────────────────────────────────────
async function getIntermediateCities(legs, key, originCity, destCity) {
  const cities    = new Set()
  const geocodeCache = {}

  for (const leg of legs) {
    for (const step of leg.steps) {
      // Only look at highway steps (longer steps = major roads)
      const stepDistanceKm = step.distance.value / 1000
      if (stepDistanceKm < 20) continue  // skip short steps

      // Reverse geocode the end point of significant steps
      const { lat, lng } = step.end_location
      const cacheKey      = `${lat.toFixed(2)},${lng.toFixed(2)}`

      if (geocodeCache[cacheKey]) {
        cities.add(geocodeCache[cacheKey])
        continue
      }

      try {
        const city = await reverseGeocode(lat, lng, key)
        if (city && city !== originCity && city !== destCity) {
          cities.add(city)
          geocodeCache[cacheKey] = city
        }
      } catch {
        // Skip failed geocodes silently
      }
    }
  }

  return [...cities]
}

// ─────────────────────────────────────────────────────────────
// Reverse geocode a lat/lng to a city name
// ─────────────────────────────────────────────────────────────
async function reverseGeocode(lat, lng, key) {
  const url = new URL(
    'https://maps.googleapis.com/maps/api/geocode/json'
  )
  url.searchParams.set('latlng',       `${lat},${lng}`)
  url.searchParams.set('key',          key)
  url.searchParams.set('result_type',  'locality')
  url.searchParams.set('region',       'IN')

  const res  = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' || !data.results[0]) return null

  const locality = data.results[0].address_components.find(
    c => c.types.includes('locality')
  )

  return locality ? locality.long_name : null
}

// ─────────────────────────────────────────────────────────────
// Build final ordered city list
// Combines origin, intermediate cities, destination
// Removes duplicates
// ─────────────────────────────────────────────────────────────
function buildCityList(endpoints, intermediates) {
  const origin      = endpoints[0]
  const destination = endpoints[endpoints.length - 1]

  // Remove duplicates, keep order
  const seen   = new Set()
  const cities = []

  for (const city of [origin, ...intermediates, destination]) {
    if (!seen.has(city)) {
      seen.add(city)
      cities.push(city)
    }
  }

  return cities
}

// ─────────────────────────────────────────────────────────────
// Calculate cumulative ETA in seconds from departure
// for each city in the route
// ─────────────────────────────────────────────────────────────
function calculateCityETAs(legs, cities, totalDurationS) {
  const etaMap = {}

  // Origin is always 0
  etaMap[cities[0]] = 0

  // Destination is total duration
  etaMap[cities[cities.length - 1]] = totalDurationS

  // Intermediate cities get proportional ETAs
  // based on their position in the city list
  const totalCities = cities.length
  cities.forEach((city, index) => {
    if (index === 0 || index === totalCities - 1) return
    const fraction    = index / (totalCities - 1)
    etaMap[city]      = Math.round(fraction * totalDurationS)
  })

  return etaMap
}

// ─────────────────────────────────────────────────────────────
// City autocomplete for search input
// Returns list of Indian city suggestions
// ─────────────────────────────────────────────────────────────
export async function getCitySuggestions(query) {
  const key = process.env.GOOGLE_MAPS_API_KEY
  if (!key) throw new Error('GOOGLE_MAPS_API_KEY is not set')

  const url = new URL(
    'https://maps.googleapis.com/maps/api/place/autocomplete/json'
  )
  url.searchParams.set('input',      query)
  url.searchParams.set('key',        key)
  url.searchParams.set('components', 'country:in')  // India only
  url.searchParams.set('types',      '(cities)')

  const res  = await fetch(url.toString())
  const data = await res.json()

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places API error: ${data.status}`)
  }

  return (data.predictions || []).map(p => ({
    name:        p.structured_formatting.main_text,
    fullName:    p.description,
    placeId:     p.place_id,
  }))
}