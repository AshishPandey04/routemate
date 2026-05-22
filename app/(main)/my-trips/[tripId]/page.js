'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import {
  ArrowLeft, ArrowRight, Navigation, RotateCcw,
  Play, CheckCircle, XCircle, Users
} from 'lucide-react'

export default function TripDetailPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const params            = useParams()
  const tripId            = params.tripId

  const [trip, setTrip]           = useState(null)
  const [fetching, setFetching]   = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [cancelReason, setCancelReason]   = useState('')
  const [showCancel, setShowCancel]       = useState(false)
  const [returnDate, setReturnDate]       = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user && tripId) fetchTrip()
  }, [user, loading, tripId])

  async function fetchTrip() {
    try {
      const res = await api.get(`/trips/${tripId}`)
      setTrip(res.data.trip)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load trip')
      router.push('/my-trips')
    } finally {
      setFetching(false)
    }
  }

  async function startTrip() {
    setActionLoading(true)
    try {
      await api.patch(`/trips/${tripId}/start`)
      toast.success('Trip started! Share your location on the track page.')
      fetchTrip()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start trip')
    } finally {
      setActionLoading(false)
    }
  }

  async function completeTrip() {
    if (!confirm('Mark this trip as completed?')) return
    setActionLoading(true)
    try {
      await api.patch(`/trips/${tripId}/complete`)
      toast.success('Trip completed!')
      fetchTrip()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete trip')
    } finally {
      setActionLoading(false)
    }
  }

  async function cancelTrip() {
    if (!cancelReason.trim()) {
      toast.error('Please provide a cancellation reason')
      return
    }
    setActionLoading(true)
    try {
      const res = await api.patch(`/trips/${tripId}/cancel`, { reason: cancelReason })
      toast.success(res.data.message || 'Trip cancelled')
      setShowCancel(false)
      fetchTrip()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel trip')
    } finally {
      setActionLoading(false)
    }
  }

  async function confirmReturn() {
    if (!returnDate) {
      toast.error('Select a return date')
      return
    }
    if (!trip?.returnSlot?.id) return
    setActionLoading(true)
    try {
      const res = await api.patch(
        `/alerts/return-slot/${trip.returnSlot.id}/confirm`,
        { confirmedReturnDate: returnDate }
      )
      toast.success(res.data.message || 'Return trip confirmed!')
      fetchTrip()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to confirm return')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading || fetching) {
    return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>
  }

  if (!trip) return null

  const bookings = trip.bookings || []
  const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED')

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/my-trips')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', marginBottom: '24px', fontSize: '14px',
        }}
      >
        <ArrowLeft size={16} /> Back to My Trips
      </button>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: '16px', marginBottom: '32px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800 }}>
              {trip.originCity}
            </h1>
            <ArrowRight size={20} color="var(--muted)" />
            <h1 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800 }}>
              {trip.destinationCity}
            </h1>
            <span className={`badge ${
              trip.status === 'SCHEDULED' ? 'badge-amber' :
              trip.status === 'IN_TRANSIT' ? 'badge-green' :
              trip.status === 'COMPLETED' ? 'badge-muted' : 'badge-red'
            }`}>
              {trip.status}
            </span>
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
            {trip.car.make} {trip.car.model} · {trip.car.plateNumber} · ₹{trip.pricePerKm}/km
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {trip.status === 'SCHEDULED' && (
            <button
              className="btn-primary"
              disabled={actionLoading}
              onClick={startTrip}
              style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Play size={16} /> Start Trip
            </button>
          )}
          {trip.status === 'IN_TRANSIT' && (
            <>
              <button
                className="btn-primary"
                onClick={() => router.push(`/track/${tripId}`)}
                style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Navigation size={16} /> Live Track
              </button>
              <button
                className="btn-secondary"
                disabled={actionLoading}
                onClick={completeTrip}
                style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <CheckCircle size={16} /> Complete
              </button>
            </>
          )}
          {(trip.status === 'SCHEDULED' || trip.status === 'IN_TRANSIT') && (
            <button
              className="btn-secondary"
              onClick={() => setShowCancel(true)}
              style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <XCircle size={16} /> Cancel Trip
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '12px' }}>Schedule</h3>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.8 }}>
            <div>Departure: {new Date(trip.departureTime).toLocaleString('en-IN')}</div>
            <div>Arrival: {new Date(trip.estimatedArrival).toLocaleString('en-IN')}</div>
            <div>Distance: {Math.round(trip.distanceKm)} km</div>
            <div>Seats: {trip.totalSeats}</div>
          </p>
        </div>

        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '12px' }}>Route</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {trip.routeCities?.map((city, i) => (
              <span key={city + i} style={{
                background: i === 0 || i === trip.routeCities.length - 1 ? 'var(--amber)' : 'var(--bg-input)',
                color: i === 0 || i === trip.routeCities.length - 1 ? '#000' : 'var(--text)',
                padding: '4px 10px', borderRadius: '100px', fontSize: '12px', fontFamily: 'Syne', fontWeight: 600,
              }}>
                {city}
              </span>
            ))}
          </div>
        </div>
      </div>

      {trip.returnSlot && trip.returnSlot.status === 'OPEN' && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <RotateCcw size={18} color="var(--amber)" />
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700 }}>Confirm Return Trip</h3>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
            {trip.returnSlot.returnOrigin} → {trip.returnSlot.returnDestination}.
            Riders watching will be notified when you confirm.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                CONFIRMED RETURN DATE
              </label>
              <input
                className="input"
                type="datetime-local"
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
              />
            </div>
            <button
              className="btn-primary"
              disabled={actionLoading}
              onClick={confirmReturn}
              style={{ width: 'auto', padding: '12px 24px' }}
            >
              Confirm Return
            </button>
          </div>
        </div>
      )}

      {trip.returnSlot?.status === 'CONFIRMED' && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <span className="badge badge-green">Return trip confirmed</span>
          {trip.returnSlot.returnTripId && (
            <button
              type="button"
              className="btn-secondary"
              style={{ width: 'auto', padding: '8px 16px', marginTop: '12px', fontSize: '13px' }}
              onClick={() => router.push(`/my-trips/${trip.returnSlot.returnTripId}`)}
            >
              View return trip
            </button>
          )}
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Users size={18} color="var(--amber)" />
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700 }}>
            Passengers ({confirmedBookings.length})
          </h3>
        </div>

        {bookings.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '14px' }}>No bookings yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookings.map(b => (
              <div
                key={b.id}
                style={{
                  padding: '14px', background: 'var(--bg-input)',
                  borderRadius: '8px', display: 'flex',
                  justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, marginBottom: '4px' }}>{b.user?.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {b.boardingCity} → {b.alightingCity} · {b.seatsBooked} seat{b.seatsBooked > 1 ? 's' : ''}
                    {b.user?.phone && ` · ${b.user.phone}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${
                    b.status === 'CONFIRMED' ? 'badge-green' :
                    b.status === 'COMPLETED' ? 'badge-amber' : 'badge-red'
                  }`}>
                    {b.status}
                  </span>
                  <div style={{ fontSize: '14px', color: 'var(--amber)', fontWeight: 700, marginTop: '4px' }}>
                    ₹{b.totalAmount?.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCancel && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 200, padding: '24px',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '440px' }}>
            <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '12px' }}>Cancel Trip</h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '16px' }}>
              All confirmed bookings will be cancelled. Refunds will be processed for riders.
            </p>
            <textarea
              className="input"
              rows={3}
              placeholder="Reason for cancellation..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              style={{ marginBottom: '16px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCancel(false)}
                style={{ flex: 1 }}
              >
                Keep Trip
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={actionLoading}
                onClick={cancelTrip}
                style={{ flex: 1, background: 'var(--red)', color: '#fff' }}
              >
                {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
