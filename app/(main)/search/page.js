'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import api from '@/lib/api.js'
import CityAutocomplete from '@/components/shared/CityAutocomplete.js'
import {
  Search, Calendar, Users,
  ArrowRight, Navigation, RotateCcw,
  Star, Snowflake, Bell
} from 'lucide-react'

export default function SearchPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    from:  '',
    to:    '',
    date:  new Date().toISOString().split('T')[0],
    seats: 1,
  })

  const [results, setResults]   = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSearch(e) {
    e.preventDefault()
    if (!form.from || !form.to) {
      toast.error('Please enter both cities')
      return
    }
    setLoading(true)
    try {
      const res = await api.get('/search/trips', { params: form })
      setResults(res.data)
      const total = res.data.meta.totalResults
      if (total === 0) toast.info('No trips found. You can set an alert below.')
      else toast.success(`Found ${total} trip${total > 1 ? 's' : ''}`)
    } catch {
      toast.error('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function setRouteAlert() {
    try {
      await api.post('/alerts/route', {
        fromCity: form.from,
        toCity:   form.to,
        date:     form.date,
      })
      toast.success('Alert set! We\'ll notify you when a car is approaching.')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set alert')
    }
  }

  async function setReturnAlert(returnSlotId) {
    try {
      await api.post('/alerts/return', { returnSlotId })
      toast.success('You\'ll be notified when the driver confirms the return trip!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set alert')
    }
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
        Find a Ride
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
        Search across cities, board en-route, or find return trips
      </p>

      {/* Search Form */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <form onSubmit={handleSearch}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                FROM
              </label>
              <CityAutocomplete
                value={form.from}
                onChange={val => setForm({ ...form, from: val })}
                placeholder="Jaipur"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                TO
              </label>
              <CityAutocomplete
                value={form.to}
                onChange={val => setForm({ ...form, to: val })}
                placeholder="Mumbai"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                DATE
              </label>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                SEATS
              </label>
              <select
                className="input"
                value={form.seats}
                onChange={e => setForm({ ...form, seats: parseInt(e.target.value) })}
              >
                {[1,2,3,4].map(n => (
                  <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <Search size={16} />
            {loading ? 'Searching...' : 'Search Trips'}
          </button>
        </form>
      </div>

      {/* Results */}
      {results && (
        <div>
          {results.direct.length > 0 && (
            <ResultSection title="Direct Trips" icon={<ArrowRight size={18} color="var(--amber)" />}
              trips={results.direct} router={router} />
          )}

          {results.enRoute.length > 0 && (
            <ResultSection title="En-Route Boarding" icon={<Navigation size={18} color="var(--green)" />}
              trips={results.enRoute} router={router} badge="badge-green" badgeText="In Transit" />
          )}

          {results.returnTrips.length > 0 && (
            <ResultSection title="Return Trips" icon={<RotateCcw size={18} color="var(--muted)" />}
              trips={results.returnTrips} router={router}
              badge="badge-muted" badgeText="Return"
              isReturn onReturnAlert={setReturnAlert} />
          )}

          {/* No results + Route Alert CTA */}
          {results.meta.totalResults === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Search size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                No trips found
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px' }}>
                Set an alert and we'll notify you when a car is available on this route
              </p>
              <button
                className="btn-primary"
                style={{ width: 'auto', padding: '10px 28px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                onClick={setRouteAlert}
              >
                <Bell size={16} />
                Notify Me When Available
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultSection({ title, icon, trips, router, badge, badgeText, isReturn, onReturnAlert }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        {icon}
        <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '18px' }}>{title}</h2>
        <span style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '100px', padding: '2px 10px', fontSize: '12px', color: 'var(--muted)',
        }}>
          {trips.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {trips.map(trip => (
          <TripCard
            key={trip.tripId || trip.returnSlotId}
            trip={trip} router={router}
            badge={badge} badgeText={badgeText}
            isReturn={isReturn} onReturnAlert={onReturnAlert}
          />
        ))}
      </div>
    </div>
  )
}

function TripCard({ trip, router, badge, badgeText, isReturn, onReturnAlert }) {
  return (
    <div
      className="card"
      style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
      onClick={() => {
        if (isReturn) return
        router.push(`/trip/${trip.tripId}?from=${trip.boardingCity}&to=${trip.alightingCity}`)
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px' }}>
              {trip.boardingCity}
            </span>
            <ArrowRight size={14} color="var(--muted)" />
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px' }}>
              {trip.alightingCity || trip.destinationCity}
            </span>
            {badge && <span className={`badge ${badge}`}>{badgeText}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--muted)', fontSize: '13px', flexWrap: 'wrap' }}>
            {trip.departureTime && (
              <span>🕐 {new Date(trip.departureTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            )}
            {trip.driver?.name && <span>👤 {trip.driver.name}</span>}
            {trip.driver?.avgRating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={12} color="var(--amber)" fill="var(--amber)" />
                {trip.driver.avgRating}
              </span>
            )}
            {trip.car?.isAC && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
                <Snowflake size={12} /> AC
              </span>
            )}
            {trip.etaToBoarding && <span className="badge badge-green">{trip.etaToBoarding}</span>}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          {trip.pricePerSeat ? (
            <>
              <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '22px', color: 'var(--amber)' }}>
                ₹{trip.pricePerSeat.toLocaleString('en-IN')}
              </div>
              {trip.availableSeats && (
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  {trip.availableSeats} seat{trip.availableSeats > 1 ? 's' : ''} left
                </div>
              )}
            </>
          ) : isReturn ? (
            <button
              className="btn-secondary"
              style={{ width: 'auto', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={e => { e.stopPropagation(); onReturnAlert?.(trip.returnSlotId) }}
            >
              <Bell size={13} /> Notify Me
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}