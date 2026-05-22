'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Plus, ArrowRight, Car, ChevronRight } from 'lucide-react'

export default function MyTripsPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const [trips, setTrips]       = useState([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) fetchTrips()
  }, [user, loading])

  async function fetchTrips() {
    try {
      const res = await api.get('/trips/my-trips')
      setTrips(res.data.trips)
    } catch {
      toast.error('Failed to load trips')
    } finally {
      setFetching(false)
    }
  }

  if (loading || fetching) {
    return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>
  }

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '32px', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, marginBottom: '4px' }}>
            My Trips
          </h1>
          <p style={{ color: 'var(--muted)' }}>
            {trips.length} trip{trips.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => router.push('/my-trips/create')}
        >
          <Plus size={16} />
          New Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <Car size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p style={{ fontFamily: 'Syne', fontSize: '18px', marginBottom: '8px' }}>No trips yet</p>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 24px', marginTop: '16px' }}
            onClick={() => router.push('/my-trips/create')}
          >
            Create Your First Trip
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {trips.map(trip => (
            <div
              key={trip.id}
              className="card"
              style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
              onClick={() => router.push(`/my-trips/${trip.id}`)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--amber)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '12px',
              }}>
                <div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '18px' }}>
                      {trip.originCity}
                    </span>
                    <ArrowRight size={16} color="var(--muted)" />
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '18px' }}>
                      {trip.destinationCity}
                    </span>
                    <span className={`badge ${
                      trip.status === 'SCHEDULED' ? 'badge-amber' :
                      trip.status === 'IN_TRANSIT' ? 'badge-green' :
                      trip.status === 'COMPLETED' ? 'badge-muted' : 'badge-red'
                    }`}>
                      {trip.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.8 }}>
                    <div>🕐 {new Date(trip.departureTime).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}</div>
                    <div>🚗 {trip.car.make} {trip.car.model} · {trip.car.plateNumber}</div>
                    <div>👥 {trip.bookingsCount} booking{trip.bookingsCount !== 1 ? 's' : ''}</div>
                    <div>💰 ₹{(trip.totalEarnings || 0).toLocaleString('en-IN')} earned</div>
                  </div>
                </div>

                <ChevronRight size={20} color="var(--muted)" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
