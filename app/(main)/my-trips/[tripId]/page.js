'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { ArrowRight, Users, DollarSign } from 'lucide-react'

export default function TripDetailDriverPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const params            = useParams()
  const tripId            = params.tripId

  const [trip,      setTrip]      = useState(null)
  const [fetching,  setFetching]  = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [reason,    setReason]    = useState('')

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (tripId) fetchTrip()
  }, [tripId, loading, user])

  async function fetchTrip() {
    try {
      const res = await api.get(`/trips/${tripId}`)
      setTrip(res.data.trip)
    } catch {
      toast.error('Trip not found')
      router.push('/my-trips')
    } finally {
      setFetching(false)
    }
  }

  async function cancelTrip() {
    if (!reason.trim()) { toast.error('Please provide a cancellation reason'); return }
    setCancelling(true)
    try {
      await api.patch(`/trips/${tripId}/cancel`, { reason })
      toast.success('Trip cancelled')
      router.push('/my-trips')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to cancel')
    } finally {
      setCancelling(false)
    }
  }

  async function confirmReturn(slotId) {
    const date = prompt('Enter return date and time (YYYY-MM-DDTHH:MM):')
    if (!date) return
    try {
      await api.patch(`/alerts/return-slot/${slotId}/confirm`, {
        confirmedReturnDate: new Date(date).toISOString()
      })
      toast.success('Return trip confirmed! Watchers notified.')
      fetchTrip()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to confirm return')
    }
  }

  if (loading || fetching) return (
    <div style={{ color: 'var(--muted)', padding: '60px 0', textAlign: 'center' }}>Loading...</div>
  )
  if (!trip) return null

  const bookings     = trip.bookings || []
  const totalEarned  = bookings
    .filter(b => b.status !== 'CANCELLED')
    .reduce((sum, b) => sum + b.totalAmount, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' }}>

      {/* Header */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '24px' }}>{trip.originCity}</span>
          <ArrowRight size={20} color="var(--amber)" />
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '24px' }}>{trip.destinationCity}</span>
          <span className={`badge ${
            trip.status === 'SCHEDULED'  ? 'badge-amber' :
            trip.status === 'IN_TRANSIT' ? 'badge-green' :
            trip.status === 'COMPLETED'  ? 'badge-muted' : 'badge-red'
          }`}>
            {trip.status}
          </span>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)',
        }}>
          {[
            { label: 'Departure',  value: new Date(trip.departureTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) },
            { label: 'Bookings',   value: `${bookings.filter(b => b.status !== 'CANCELLED').length} / ${trip.totalSeats}` },
            { label: 'Earned',     value: `₹${totalEarned.toLocaleString('en-IN')}` },
          ].map(stat => (
            <div key={stat.label}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Passengers */}
      {bookings.length > 0 && (
        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px' }}>
            Passengers ({bookings.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {bookings.map(booking => (
              <div key={booking.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px', background: 'var(--bg-input)', borderRadius: '8px',
              }}>
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '14px' }}>
                    {booking.user?.name || 'Rider'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    {booking.boardingCity} → {booking.alightingCity} · {booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontFamily: 'Syne', fontWeight: 700, color: 'var(--amber)' }}>
                    ₹{booking.totalAmount.toLocaleString('en-IN')}
                  </span>
                  <span className={`badge ${booking.status === 'CONFIRMED' ? 'badge-green' : booking.status === 'COMPLETED' ? 'badge-amber' : 'badge-red'}`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Return Slot */}
      {trip.returnSlot && trip.returnSlot.status === 'OPEN' && (
        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px' }}>
            Return Trip
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '16px' }}>
            {trip.returnSlot.returnAlerts?.length || 0} user{trip.returnSlot.returnAlerts?.length !== 1 ? 's' : ''} waiting for your return confirmation
          </p>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 24px' }}
            onClick={() => confirmReturn(trip.returnSlot.id)}
          >
            Confirm Return Trip
          </button>
        </div>
      )}

      {/* Cancel Trip */}
      {(trip.status === 'SCHEDULED' || trip.status === 'IN_TRANSIT') && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.3)' }}>
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '12px', color: 'var(--red)' }}>
            Cancel Trip
          </h3>
          <textarea
            className="input"
            placeholder="Reason for cancellation (required)"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={2}
            style={{ marginBottom: '12px', resize: 'vertical' }}
          />
          <button
            style={{
              background: 'var(--red)', color: '#fff',
              border: 'none', borderRadius: '8px',
              padding: '10px 24px', fontFamily: 'Syne',
              fontWeight: 700, cursor: 'pointer', width: 'auto',
              opacity: cancelling ? 0.7 : 1,
            }}
            disabled={cancelling}
            onClick={cancelTrip}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Trip'}
          </button>
        </div>
      )}
    </div>
  )
}