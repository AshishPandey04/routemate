import { z } from 'zod'

// Auth
export const signupSchema = z.object({
  name:     z.string().min(2),
  email:    z.string().email(),
  phone:    z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  password: z.string().min(8),
  role:     z.enum(['RIDER', 'DRIVER', 'BOTH']),
})

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export const otpSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/),
  otp:   z.string().length(6),
})

// Cars
export const carSchema = z.object({
  make:        z.string().min(1),
  model:       z.string().min(1),
  year:        z.number().min(2000).max(2025),
  plateNumber: z.string().min(4),
  totalSeats:  z.number().min(1).max(6),
  isAC:        z.boolean(),
})

export const createTripSchema = z.object({
  carId:               z.string().uuid(),
  originCity:          z.string().min(1),
  destCity:            z.string().min(1),
  departureTime:       z.string().min(1),  // accept any date string
  pricePerKm:          z.number().min(0.5).max(20),
  allowSharing:        z.boolean(),
  offerReturn:         z.boolean(),
  estimatedReturnDate: z.string().optional(),
})

// Bookings
export const holdSchema = z.object({
  tripId:         z.string().uuid(),
  boardingCity:   z.string().min(1),
  alightingCity:  z.string().min(1),
  seatsRequested: z.number().min(1).max(6),
})

export const confirmSchema = z.object({
  tripId:            z.string().uuid(),
  razorpayOrderId:   z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
})

// Tracking
export const pingSchema = z.object({
  tripId:  z.string().uuid(),
  lat:     z.number(),
  lng:     z.number(),
  speed:   z.number().optional(),
  heading: z.number().optional(),
})

// Ratings
export const ratingSchema = z.object({
  bookingId: z.string().uuid(),
  score:     z.number().min(1).max(5),
  comment:   z.string().optional(),
})

// Safety
export const emergencyContactSchema = z.object({
  emergencyContactName:  z.string().min(2).max(80),
  emergencyContactPhone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
})

export const sosSchema = z.object({
  tripId:  z.string().uuid(),
  lat:     z.number().optional(),
  lng:     z.number().optional(),
  message: z.string().max(500).optional(),
})

// Disputes
export const disputeSchema = z.object({
  bookingId: z.string().uuid(),
  reason:    z.string().min(10).max(2000),
})

export const disputeResolveSchema = z.object({
  status:       z.enum(['UNDER_REVIEW', 'RESOLVED', 'REJECTED']),
  resolution:   z.string().optional(),
  refundAmount: z.number().min(0).optional(),
  adminNote:    z.string().optional(),
})

// Payouts
export const payoutRequestSchema = z.object({
  amount: z.number().min(100),
})

export const adminPayoutSchema = z.object({
  status:    z.enum(['APPROVED', 'PAID', 'REJECTED']),
  bankRef:   z.string().optional(),
  adminNote: z.string().optional(),
})