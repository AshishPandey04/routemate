'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { ArrowRight, MapPin, Navigation, Star, X } from 'lucide-react'


const [ratingModal, setRatingModal] = useState(null)  // bookingId
const [ratingForm, setRatingForm]   = useState({ score: 5, comment: '' })

async function submitRating(bookingId) {
  try {
    await api.post('/ratings', { bookingId, ...ratingForm })
    toast.success('Rating submitted!')
    setRatingModal(null)
    fetchBookings()
  } catch (err) {
    toast.error(err.response?.data?.error || 'Failed to submit rating')
  }
}

export default function MyBookingsPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const [bookings, setBookings]       = useState([])
  const [fetching, setFetching]       = useState(true)
  const [ratingBooking, setRatingBooking] = useState(null)
  const [ratingForm, setRatingForm]   = useState({ score: 5, comment: '' })
  const [submittingRating, setSubmittingRating] = useState(false)

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
      toast.success(`Booking cancelled. Refund: ₹${res.data.refundAmount ?? 0}`)
      fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel')
    }
  }

  async function submitRating(e) {
    e.preventDefault()
    if (!ratingBooking) return
    setSubmittingRating(true)
    try {
      await api.post('/ratings', {
        bookingId: ratingBooking.id,
        score:     ratingForm.score,
        comment:   ratingForm.comment || undefined,
      })
      toast.success('Thanks for your rating!')
      setRatingBooking(null)
      setRatingForm({ score: 5, comment: '' })
      fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit rating')
    } finally {
      setSubmittingRating(false)
    }
  }

  if (loading || fetching) {
    return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>
  }

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
          <p style={{ fontFamily: 'Syne', fontSize: '18px', marginBottom: '8px' }}>No bookings yet</p>
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
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                flexWrap: 'wrap', gap: '12px',
              }}>
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap',
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
                      booking.status === 'COMPLETED' ? 'badge-amber' : 'badge-red'
                    }`}>
                      {booking.status}
                    </span>
                    {booking.rating && (
                      <span className="badge badge-muted" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={10} fill="var(--amber)" color="var(--amber)" />
                        Rated {booking.rating.score}/5
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.8 }}>
                    <div>🚗 {booking.trip.car.make} {booking.trip.car.model}</div>
                    <div>👤 {booking.trip.driver.name}{booking.trip.driver.phone ? ` · ${booking.trip.driver.phone}` : ''}</div>
                    <div>🕐 {new Date(booking.trip.departureTime).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}</div>
                    <div>💺 {booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''}</div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'Syne', fontWeight: 800, fontSize: '22px',
                    color: 'var(--amber)', marginBottom: '12px',
                  }}>
                    ₹{booking.totalAmount.toLocaleString('en-IN')}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    {(booking.trip.status === 'IN_TRANSIT' || booking.trip.status === 'SCHEDULED') &&
                     booking.status === 'CONFIRMED' && (
                      <button
                        className="btn-primary"
                        style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => router.push(`/track/${booking.trip.id}`)}
                      >
                        <Navigation size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {booking.trip.status === 'IN_TRANSIT' ? 'Track Live' : 'Trip Chat'}
                      </button>
                    )}

                    {booking.status === 'CONFIRMED' && booking.trip.status === 'SCHEDULED' && (
                      <button
                        className="btn-secondary"
                        style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => cancelBooking(booking.id)}
                      >
                        Cancel
                      </button>
                    )}

                    {booking.status === 'COMPLETED' && !booking.rating && (
                      <button
                        className="btn-secondary"
                        style={{
                          width: 'auto', padding: '8px 16px', fontSize: '13px',
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                        }}
                        onClick={() => {
                          setRatingBooking(booking)
                          setRatingForm({ score: 5, comment: '' })
                        }}
                      >
                        <Star size={14} color="var(--amber)" />
                        Rate Driver
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {ratingBooking && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '24px',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setRatingBooking(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
              }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '8px' }}>
              Rate your trip
            </h2>
            <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '20px' }}>
              {ratingBooking.boardingCity} → {ratingBooking.alightingCity} with {ratingBooking.trip.driver.name}
            </p>

            <form onSubmit={submitRating} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                  Score (1–5)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRatingForm({ ...ratingForm, score: n })}
                      style={{
                        background: ratingForm.score >= n ? 'var(--amber)' : 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        width: '44px', height: '44px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Star size={18} color={ratingForm.score >= n ? '#000' : 'var(--muted)'} fill={ratingForm.score >= n ? '#000' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                  Comment (optional)
                </label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="How was the ride?"
                  value={ratingForm.comment}
                  onChange={e => setRatingForm({ ...ratingForm, comment: e.target.value })}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={submittingRating}>
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
