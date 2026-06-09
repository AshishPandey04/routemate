/**
 * Decode a Google Maps encoded polyline string into lat/lng points.
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 * @param {string} encoded
 * @returns {{ lat: number, lng: number }[]}
 */
export function decodePolyline(encoded) {
  if (!encoded) return []

  const points = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result = 0
    let byte

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0

    do {
      byte = encoded.charCodeAt(index++) - 63
      result |= (byte & 0x1f) << shift
      shift += 5
    } while (byte >= 0x20)

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLng

    points.push({ lat: lat / 1e5, lng: lng / 1e5 })
  }

  return points
}

/**
 * @param {{ lat: number, lng: number }[]} path
 * @returns {google.maps.LatLngBounds | null}
 */
export function boundsFromPath(path) {
  if (!path?.length || typeof window === 'undefined' || !window.google?.maps) {
    return null
  }

  const bounds = new window.google.maps.LatLngBounds()
  for (const point of path) {
    bounds.extend(point)
  }
  return bounds
}
