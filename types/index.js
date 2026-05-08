/**
 * @typedef {Object} AuthUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 * @property {'RIDER'|'DRIVER'|'BOTH'} role
 * @property {boolean} isVerified
 */

/**
 * @typedef {Object} TripSearchResult
 * @property {string} tripId
 * @property {'DIRECT'|'EN_ROUTE'|'RETURN'} type
 * @property {string} originCity
 * @property {string} destinationCity
 * @property {string} boardingCity
 * @property {string} alightingCity
 * @property {number} boardingIndex
 * @property {number} alightingIndex
 * @property {string} departureTime
 * @property {number} pricePerSeat
 * @property {number} availableSeats
 */

/**
 * @typedef {Object} SeatAvailabilityResult
 * @property {boolean} available
 * @property {number} maxAvailable
 */

/**
 * @typedef {Object} RouteResult
 * @property {string[]} cities
 * @property {number} distanceKm
 * @property {number} durationHours
 * @property {string} encodedPolyline
 */

export {}   // makes this a module