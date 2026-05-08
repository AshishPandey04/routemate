import { describe, test, expect } from 'vitest'
import { calculatePeakOccupancy } from './seat-allocator.test-helpers.js'

describe('Seat Allocator — sweep line algorithm', () => {

  test('returns 0 when no segments exist', () => {
    expect(calculatePeakOccupancy([])).toBe(0)
  })

  test('single booking occupies correct seats', () => {
    const segments = [
      { fromIndex: 0, toIndex: 3, seatsOccupied: 2 }
    ]
    expect(calculatePeakOccupancy(segments)).toBe(2)
  })

  test('non-overlapping bookings do not stack', () => {
    const segments = [
      { fromIndex: 0, toIndex: 2, seatsOccupied: 2 },
      { fromIndex: 2, toIndex: 4, seatsOccupied: 2 },
    ]
    expect(calculatePeakOccupancy(segments)).toBe(2)
  })

  test('overlapping bookings stack correctly', () => {
    const segments = [
      { fromIndex: 0, toIndex: 3, seatsOccupied: 2 },
      { fromIndex: 1, toIndex: 5, seatsOccupied: 2 },
    ]
    expect(calculatePeakOccupancy(segments)).toBe(4)
  })

  test('three overlapping bookings detect overflow', () => {
    const segments = [
      { fromIndex: 0, toIndex: 3, seatsOccupied: 2 },
      { fromIndex: 1, toIndex: 5, seatsOccupied: 2 },
      { fromIndex: 2, toIndex: 4, seatsOccupied: 1 },
    ]
    expect(calculatePeakOccupancy(segments)).toBe(5)
  })

  test('exit processed before entry at same index', () => {
    const segments = [
      { fromIndex: 0, toIndex: 2, seatsOccupied: 4 },
      { fromIndex: 2, toIndex: 4, seatsOccupied: 4 },
    ]
    expect(calculatePeakOccupancy(segments)).toBe(4)
  })

  test('full route booking blocks all seats', () => {
    const segments = [
      { fromIndex: 0, toIndex: 5, seatsOccupied: 4 }
    ]
    expect(calculatePeakOccupancy(segments)).toBe(4)
  })

})