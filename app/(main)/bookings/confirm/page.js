'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MapPin, IndianRupee, Users, Calendar, CheckCircle, AlertCircle } from 'lucide-react'

export default function ConfirmBookingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tripId = searchParams.get('tripId')
  const bookingId = searchParams.get('bookingId')

  const [booking, setBooking] = useState(null)
  const [trip, setTrip] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (tripId && bookingId) fetchBookingDetails()
  }, [user, loading, tripId, bookingId])

  async function fetchBookingDetails() {
    try {
      setFetching(true)
      const [tripRes, bookingRes] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get(`/bookings/${bookingId}`)
      ])
      setTrip(tripRes.data.trip)
      setBooking(bookingRes.data.booking)
    } catch (err) {
      toast.error('Failed to load booking details')
      router.push('/my-bookings')
    } finally {
      setFetching(false)
    }
  }

  async function initiatePayment() {
    if (!booking || !trip) return

    setConfirming(true)
    try {
      // Create Razorpay order
      const orderRes = await api.post('/payments/create-order', {
        bookingId: booking.id,
        amount: booking.totalAmount
      })

      const { orderId, key } = orderRes.data

      // Initialize Razorpay
      const options = {
        key,
        amount: booking.totalAmount * 100,
        currency: 'INR',
        name: 'RouteMate',
        description: `Booking for trip from ${trip.originCity} to ${trip.destinationCity}`,
        order_id: orderId,
        handler: async (response) => {
          try {
            // Confirm booking with payment details
            await api.post('/bookings/confirm', {
              tripId: trip.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature
            })
            setPaymentSuccess(true)
            toast.success('Booking confirmed successfully!')
            setTimeout(() => {
              router.push('/my-bookings')
            }, 2000)
          } catch (err) {
            toast.error(err.response?.data?.error || 'Payment verification failed')
          }
        },
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to initiate payment')
    } finally {
      setConfirming(false)
    }
  }

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading booking details...</div>
      </div>
    )
  }

  if (!booking || !trip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">Booking not found</p>
          <Button onClick={() => router.push('/my-bookings')}>
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  if (paymentSuccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-green-50 to-emerald-50">
        <div className="card" style={{
          textAlign: 'center',
          maxWidth: '400px',
          background: '#ffffff',
          boxShadow: '0 20px 40px rgba(16, 185, 129, 0.15)',
        }}>
          <div className="w-16 h-16 bg-linear-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-green-700 mb-2">
            Booking Confirmed!
          </h2>
          <p className="text-gray-600 mb-2">
            Your booking has been successfully confirmed.
          </p>
          <p className="text-sm text-gray-500">
            Redirecting to your bookings...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2" style={{ color: '#0f172a' }}>Confirm Booking</h1>
        <p className="text-gray-600 mb-8">Review your booking details and proceed to payment</p>

        <div className="space-y-6">
          {/* Trip Details */}
          <div className="card" style={{
            background: '#ffffff',
            borderColor: 'rgba(226, 232, 240, 0.8)',
          }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#0f172a' }}>Trip Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Route</p>
                  <p className="font-semibold" style={{ color: '#0f172a' }}>
                    {trip.originCity} → {trip.destinationCity}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Departure</p>
                  <p className="font-semibold" style={{ color: '#0f172a' }}>
                    {new Date(trip.departureTime).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="card" style={{
            background: '#ffffff',
            borderColor: 'rgba(226, 232, 240, 0.8)',
          }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#0f172a' }}>Booking Details</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-amber-100 to-amber-50 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Seats Booked</p>
                  <p className="font-semibold" style={{ color: '#0f172a' }}>{booking.seatsBooked} seat(s)</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-green-100 to-green-50 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Boarding → Alighting</p>
                  <p className="font-semibold" style={{ color: '#0f172a' }}>
                    {booking.boardingCity} → {booking.alightingCity}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
            borderColor: 'rgba(59, 130, 246, 0.2)',
          }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#0f172a' }}>Price Breakdown</h2>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-700">Fare per seat</span>
                <span className="font-semibold">₹{trip.pricePerKm?.toFixed(2) || '0'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Seats × {booking.seatsBooked}</span>
                <span className="font-semibold">₹{(trip.pricePerKm * booking.seatsBooked)?.toFixed(2) || '0'}</span>
              </div>
              <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
                <span className="font-semibold text-lg" style={{ color: '#0f172a' }}>Total Amount</span>
                <div className="flex items-center gap-1">
                  <span className="text-3xl font-bold text-blue-600">
                    ₹{booking.totalAmount?.toFixed(2) || '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <Button
            onClick={initiatePayment}
            disabled={confirming}
            className="w-full py-3 text-lg font-semibold"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
            }}
          >
            {confirming ? 'Processing...' : 'Pay Now & Confirm'}
          </Button>

          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full py-3 text-lg"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
