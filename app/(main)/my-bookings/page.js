'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { ArrowRight, MapPin, Navigation } from 'lucide-react'

export default function MyBookingsPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const [bookings, setBookings] = useState([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) fetchBookings()
  }, [user, loading])

  async function fetchBookings() {
    try {
      const res = await api.get('/bookings/my-bookings')
      setBookings(res.data.bookings)
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setFetching(false)
    }
  }

  async function cancelBooking(bookingId) {
    if (!confirm('Cancel this booking?')) return
    try {
      const res = await api.post(`/bookings/${bookingId}/cancel`)
      toast.success(`Booking cancelled. Refund: ₹${res.data.refundAmount}`)
      fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel')
    }
  }

  if (loading || fetching) return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>

  return (
    <div>
      <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
        My Bookings
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
        {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
      </p>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <MapPin size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p style={{ fontFamily: 'Syne', fontSize: '18px', marginBottom: '8px' }}>
            No bookings yet
          </p>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 24px', marginTop: '16px' }}
            onClick={() => router.push('/search')}
          >
            Find a Ride
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {bookings.map(booking => (
            <div key={booking.id} className="card">
              <div style={{
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'flex-start',
                flexWrap:       'wrap',
                gap:            '12px',
              }}>
                {/* Trip Info */}
                <div>
                  <div style={{
                    display:     'flex',
                    alignItems:  'center',
                    gap:         '8px',
                    marginBottom: '8px',
                  }}>
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px' }}>
                      {booking.boardingCity}
                    </span>
                    <ArrowRight size={14} color="var(--muted)" />
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px' }}>
                      {booking.alightingCity}
                    </span>
                    <span className={`badge ${
                      booking.status === 'CONFIRMED' ? 'badge-green' :
                      booking.status === 'COMPLETED' ? 'badge-amber' :
                      'badge-red'
                    }`}>
                      {booking.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.8 }}>
                    <div>🚗 {booking.trip.car.make} {booking.trip.car.model}</div>
                    <div>👤 {booking.trip.driver.name} · {booking.trip.driver.phone}</div>
                    <div>🕐 {new Date(booking.trip.departureTime).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}</div>
                    <div>💺 {booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''}</div>
                  </div>
                </div>

                {/* Right */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'Syne',
                    fontWeight: 800,
                    fontSize:   '22px',
                    color:      'var(--amber)',
                    marginBottom: '12px',
                  }}>
                    ₹{booking.totalAmount.toLocaleString('en-IN')}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {booking.trip.status === 'IN_TRANSIT' && (
                      <button
                        className="btn-primary"
                        style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => router.push(`/track/${booking.trip.id}`)}
                      >
                        <Navigation size={14} style={{ marginRight: '4px' }} />
                        Track Live
                      </button>
                    )}

                    {booking.status === 'CONFIRMED' &&
                     booking.trip.status === 'SCHEDULED' && (
                      <button
                        className="btn-secondary"
                        style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => cancelBooking(booking.id)}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}