/**
 * Gets the sequence index of a city in a trip's route
 *
 * @param {string[]} routeCities - ordered array of cities
 * @param {string} cityName
 * @returns {number} index or -1 if not found
 */
export function getCityIndex(routeCities, cityName) {
    return routeCities.findIndex(
      c => c.toLowerCase() === cityName.toLowerCase()
    )
  }
  
  /**
   * Validates that boarding city comes before alighting city
   *
   * @param {string[]} routeCities
   * @param {string} boardingCity
   * @param {string} alightingCity
   * @returns {{ valid: boolean, boardingIndex: number, alightingIndex: number, error?: string }}
   */
  export function validateSegment(routeCities, boardingCity, alightingCity) {
    const boardingIndex  = getCityIndex(routeCities, boardingCity)
    const alightingIndex = getCityIndex(routeCities, alightingCity)
  
    if (boardingIndex === -1) {
      return {
        valid: false,
        boardingIndex,
        alightingIndex,
        error: `${boardingCity} is not on this trip's route`
      }
    }
  
    if (alightingIndex === -1) {
      return {
        valid: false,
        boardingIndex,
        alightingIndex,
        error: `${alightingCity} is not on this trip's route`
      }
    }
  
    if (boardingIndex >= alightingIndex) {
      return {
        valid: false,
        boardingIndex,
        alightingIndex,
        error: `${boardingCity} must come before ${alightingCity} on the route`
      }
    }
  
    return { valid: true, boardingIndex, alightingIndex }
  }
  
  /**
   * Calculates price for a segment
   *
   * @param {number} totalDistanceKm
   * @param {number} totalCities
   * @param {number} boardingIndex
   * @param {number} alightingIndex
   * @param {number} pricePerKm
   * @param {number} seats
   * @returns {number} total price
   */
  export function calculateSegmentPrice(
    totalDistanceKm,
    totalCities,
    boardingIndex,
    alightingIndex,
    pricePerKm,
    seats
  ) {
    const segmentFraction = (alightingIndex - boardingIndex) / (totalCities - 1)
    const segmentDistance = totalDistanceKm * segmentFraction
    return Math.round(segmentDistance * pricePerKm * seats)
  }