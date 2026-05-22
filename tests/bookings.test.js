/**
 * @vitest - Booking API Tests
 * Tests booking hold, confirm, and concurrent booking scenarios
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { POST as holdHandler } from '@/app/api/bookings/hold/route.js'
import { POST as confirmHandler } from '@/app/api/bookings/confirm/route.js'
import prisma from '@/lib/prisma.js'
import redis from '@/lib/redis.js'

// Mock getAuthUser so tests don't need real JWTs
vi.mock('@/lib/get-auth-user.js', () => ({
  getAuthUser: vi.fn()
}))

// Mock razorpay order creation so tests don't hit Razorpay API
vi.mock('@/lib/razorpay.js', () => ({
  createOrder: vi.fn().mockResolvedValue({ id: 'order_test_123' }),
  verifyPaymentSignature: vi.fn().mockReturnValue(true)
}))

import { getAuthUser } from '@/lib/get-auth-user.js'

class MockRequest {
  constructor(data = {}) {
    this.json    = vi.fn().mockResolvedValue(data)
    this.text    = vi.fn().mockResolvedValue(JSON.stringify(data))
    this.headers = new Map([['content-type', 'application/json']])
    this.cookies = { get: () => null }
  }
}

describe('Booking API', () => {
  let testTrip   = null
  let testUser   = null
  let testDriver = null
  let testCar    = null

  beforeAll(async () => {
    const suffix = Date.now()

    testUser = await prisma.user.create({
      data: {
        email:        `test-booking-${suffix}@test.com`,
        phone:        `9${String(suffix).slice(-9)}`,
        name:         'Test Booker',
        role:         'RIDER',
        passwordHash: 'hashedpwd',
        isVerified:   true,
        isActive:     true,
      },
    })

    testDriver = await prisma.user.create({
      data: {
        email:        `test-driver-${suffix}@test.com`,
        phone:        `8${String(suffix).slice(-9)}`,
        name:         'Test Driver',
        role:         'DRIVER',
        passwordHash: 'hashedpwd',
        isVerified:   true,
        isActive:     true,
      },
    })

    testCar = await prisma.car.create({
      data: {
        ownerId:     testDriver.id,
        make:        'Test',
        model:       'Car',
        year:        2022,
        plateNumber: `TST${suffix}`,
        totalSeats:  4,
        isAC:        true,
      },
    })

    testTrip = await prisma.trip.create({
      data: {
        driverId:         testDriver.id,
        carId:            testCar.id,
        originCity:       'Delhi',
        destinationCity:  'Mumbai',
        originLat:        28.6139,
        originLng:        77.209,
        destinationLat:   19.076,
        destinationLng:   72.8777,
        routeCities:      ['Delhi', 'Ghaziabad', 'Meerut', 'Mumbai'],
        encodedPolyline:  'test-polyline',
        departureTime:    new Date(Date.now() + 24 * 60 * 60 * 1000),
        estimatedArrival: new Date(Date.now() + 36 * 60 * 60 * 1000),
        distanceKm:       1400,
        totalSeats:       4,
        pricePerKm:       2,
        status:           'SCHEDULED',
        allowSharing:     true,
      },
    })
  })

  afterAll(async () => {
    if (testTrip?.id) {
      await prisma.seatSegment.deleteMany({ where: { tripId: testTrip.id } }).catch(() => {})
      await prisma.payment.deleteMany({ where: { booking: { tripId: testTrip.id } } }).catch(() => {})
      await prisma.booking.deleteMany({ where: { tripId: testTrip.id } }).catch(() => {})
      await prisma.trip.delete({ where: { id: testTrip.id } }).catch(() => {})
    }
    if (testCar?.id) {
      await prisma.car.delete({ where: { id: testCar.id } }).catch(() => {})
    }
    if (testDriver?.id) {
      await prisma.user.delete({ where: { id: testDriver.id } }).catch(() => {})
    }
    if (testUser?.id) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {})
    }
    // Clean up any Redis holds created during tests
    await redis.del(`hold:${testTrip?.id}:${testUser?.id}`).catch(() => {})
  })

  describe('Booking Hold', () => {
    it('should create hold for valid segment', async () => {
      getAuthUser.mockResolvedValue({ user: { id: testUser.id } })

      const req = new MockRequest({
        tripId:         testTrip.id,
        boardingCity:   'Ghaziabad',
        alightingCity:  'Meerut',
        seatsRequested: 2
      })

      const res  = await holdHandler(req)
      const data = await res.json()

      expect(res.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.razorpayOrderId).toBeDefined()
      expect(data.data.amount).toBeGreaterThan(0)
      expect(data.data.expiresAt).toBeDefined()

      // Clean up hold so subsequent tests aren't blocked
      await redis.del(`hold:${testTrip.id}:${testUser.id}`)
    })

    it('should reject hold for unavailable seats', async () => {
      getAuthUser.mockResolvedValue({ user: { id: testUser.id } })

      const req = new MockRequest({
        tripId:         testTrip.id,
        boardingCity:   'Delhi',
        alightingCity:  'Mumbai',
        seatsRequested: 10 // more than available
      })

      const res  = await holdHandler(req)
      const data = await res.json()

      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(data.error?.code).toBe('SEATS_UNAVAILABLE')
    })

    it('should prevent driver from booking own trip', async () => {
      getAuthUser.mockResolvedValue({ user: { id: testDriver.id } })

      const req = new MockRequest({
        tripId:         testTrip.id,
        boardingCity:   'Delhi',
        alightingCity:  'Meerut',
        seatsRequested: 1
      })

      const res  = await holdHandler(req)
      const data = await res.json()

      expect(res.status).toBe(403)
      expect(data.error?.code).toBe('FORBIDDEN')
    })

    it('should prevent double hold on same trip', async () => {
      getAuthUser.mockResolvedValue({ user: { id: testUser.id } })

      const req1 = new MockRequest({
        tripId:         testTrip.id,
        boardingCity:   'Ghaziabad',
        alightingCity:  'Meerut',
        seatsRequested: 1
      })

      const res1 = await holdHandler(req1)
      expect(res1.status).toBe(200)

      // Second hold on same trip — should be rejected
      const req2 = new MockRequest({
        tripId:         testTrip.id,
        boardingCity:   'Delhi',
        alightingCity:  'Meerut',
        seatsRequested: 1
      })

      const res2  = await holdHandler(req2)
      const data2 = await res2.json()

      expect(res2.status).toBeGreaterThanOrEqual(400)
      expect(data2.error?.code).toBe('BOOKING_CONFLICT')

      // Clean up
      await redis.del(`hold:${testTrip.id}:${testUser.id}`)
    })
  })

  describe('Concurrent Booking Prevention', () => {
    it('should use database lock to prevent race conditions', async () => {
      // Create a second rider for the concurrent test
      const suffix2   = Date.now() + 1
      const testUser2 = await prisma.user.create({
        data: {
          email:        `test-rider2-${suffix2}@test.com`,
          phone:        `7${String(suffix2).slice(-9)}`,
          name:         'Test Rider 2',
          role:         'RIDER',
          passwordHash: 'hashedpwd',
          isVerified:   true,
          isActive:     true,
        }
      })

      // Limited-seat trip using real driver/car IDs
      const limitedTrip = await prisma.trip.create({
        data: {
          driverId:         testDriver.id,
          carId:            testCar.id,
          originCity:       'Delhi',
          destinationCity:  'Mumbai',
          originLat:        28.6139,
          originLng:        77.209,
          destinationLat:   19.076,
          destinationLng:   72.8777,
          routeCities:      ['Delhi', 'Meerut', 'Mumbai'],
          encodedPolyline:  'test-polyline',
          departureTime:    new Date(Date.now() + 48 * 60 * 60 * 1000),
          estimatedArrival: new Date(Date.now() + 60 * 60 * 60 * 1000),
          distanceKm:       1200,
          totalSeats:       1, // only 1 seat
          pricePerKm:       2,
          status:           'SCHEDULED',
          allowSharing:     true,
        }
      })

      // Two concurrent requests from different users
      const req1 = new MockRequest({
        tripId:         limitedTrip.id,
        boardingCity:   'Delhi',
        alightingCity:  'Meerut',
        seatsRequested: 1
      })
      const req2 = new MockRequest({
        tripId:         limitedTrip.id,
        boardingCity:   'Delhi',
        alightingCity:  'Meerut',
        seatsRequested: 1
      })

      // Alternate mock per call
      getAuthUser
        .mockResolvedValueOnce({ user: { id: testUser.id } })
        .mockResolvedValueOnce({ user: { id: testUser2.id } })

      const [res1, res2] = await Promise.all([
        holdHandler(req1),
        holdHandler(req2)
      ])

      const successCount = [res1.status, res2.status].filter(s => s === 200).length
      expect(successCount).toBe(1)

      const data2 = await res2.json()
      if (res2.status !== 200) {
        expect(data2.error?.code).toBe('SEATS_UNAVAILABLE')
      }

      // Cleanup
      await redis.del(`hold:${limitedTrip.id}:${testUser.id}`)
      await redis.del(`hold:${limitedTrip.id}:${testUser2.id}`)
      await prisma.trip.delete({ where: { id: limitedTrip.id } }).catch(() => {})
      await prisma.user.delete({ where: { id: testUser2.id } }).catch(() => {})
    })
  })

  describe('Error Handling', () => {
    it('should return standardized error format', async () => {
      getAuthUser.mockResolvedValue({ user: { id: testUser.id } })

      const req = new MockRequest({
        tripId:         'nonexistent-trip-id',
        boardingCity:   'Delhi',
        alightingCity:  'Mumbai',
        seatsRequested: 1
      })

      const res  = await holdHandler(req)
      const data = await res.json()

      expect(data).toHaveProperty('success')
      if (!data.success) {
        expect(data.error).toHaveProperty('code')
        expect(data.error).toHaveProperty('message')
        expect(data.error).toHaveProperty('status')
      }
    })
  })
})
