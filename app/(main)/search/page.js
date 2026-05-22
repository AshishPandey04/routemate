'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import api from '@/lib/api.js'
import CityAutocomplete from '@/components/shared/CityAutocomplete.js'
import {
  Search, MapPin, Calendar, Users,
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

  const [results, setResults]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [alertLoading, setAlertLoading] = useState(false)

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
      if (total === 0) {
        toast.info('No trips found. Set a route alert to get notified.')
      } else {
        toast.success(`Found ${total} trip${total > 1 ? 's' : ''}`)
      }
    } catch {
      toast.error('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function setRouteAlert() {
    if (!form.from || !form.to || !form.date) {
      toast.error('Enter from, to, and date first')
      return
    }
    setAlertLoading(true)
    try {
      const res = await api.post('/alerts/route', {
        fromCity: form.from,
        toCity:   form.to,
        date:     form.date,
      })
      toast.success(res.data.message || 'Route alert set!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set alert')
    } finally {
      setAlertLoading(false)
    }
  }

  return (
    <div>
      <h1 style={{
        fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, marginBottom: '8px',
      }}>
        Find a Ride
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
        Search across cities, board en-route, or find return trips
      </p>

      <div className="card" style={{ marginBottom: '32px' }}>
        <form onSubmit={handleSearch}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '16px',
          }}>
            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'var(--muted)', marginBottom: '8px',
              }}>
                FROM
              </label>
              <CityAutocomplete
                value={form.from}
                onChange={v => setForm({ ...form, from: v })}
                placeholder="Jaipur"
                pinColor="var(--amber)"
                required
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'var(--muted)', marginBottom: '8px',
              }}>
                TO
              </label>
              <CityAutocomplete
                value={form.to}
                onChange={v => setForm({ ...form, to: v })}
                placeholder="Mumbai"
                pinColor="var(--muted)"
                required
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'var(--muted)', marginBottom: '8px',
              }}>
                DATE
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={16} color="var(--muted)" style={{
                  position: 'absolute', left: '12px', top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <input
                  className="input"
                  type="date"
                  value={form.date}
                  onChange={e => setForm({ ...form, date: e.target.value })}
                  style={{ paddingLeft: '36px' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: 'var(--muted)', marginBottom: '8px',
              }}>
                SEATS
              </label>
              <div style={{ position: 'relative' }}>
                <Users size={16} color="var(--muted)" style={{
                  position: 'absolute', left: '12px', top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <select
                  className="input"
                  value={form.seats}
                  onChange={e => setForm({ ...form, seats: parseInt(e.target.value) })}
                  style={{ paddingLeft: '36px' }}
                >
                  {[1, 2, 3, 4].map(n => (
                    <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            <Search size={16} />
            {loading ? 'Searching...' : 'Search Trips'}
          </button>
        </form>
      </div>

      {results && (
        <div>
          {results.direct.length > 0 && (
            <ResultSection
              title="Direct Trips"
              icon={<ArrowRight size={18} color="var(--amber)" />}
              trips={results.direct}
              form={form}
              router={router}
            />
          )}

          {results.enRoute.length > 0 && (
            <ResultSection
              title="En-Route Boarding"
              icon={<Navigation size={18} color="var(--green)" />}
              trips={results.enRoute}
              form={form}
              router={router}
              badge="badge-green"
              badgeText="In Transit"
            />
          )}

          {results.returnTrips.length > 0 && (
            <ResultSection
              title="Return Trips"
              icon={<RotateCcw size={18} color="var(--muted)" />}
              trips={results.returnTrips}
              form={form}
              router={router}
              badge="badge-muted"
              badgeText="Return"
              isReturn
            />
          )}

          {results.meta.totalResults === 0 && (
            <div style={{
              textAlign: 'center', padding: '60px 24px', color: 'var(--muted)',
            }}>
              <Search size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontFamily: 'Syne', fontSize: '18px', marginBottom: '8px' }}>
                No trips found
              </p>
              <p style={{ fontSize: '14px', marginBottom: '24px' }}>
                Try another date, or get notified when a car is heading your way
              </p>
              <button
                type="button"
                className="btn-primary"
                disabled={alertLoading}
                onClick={setRouteAlert}
                style={{
                  width: 'auto', padding: '12px 24px', margin: '0 auto',
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                }}
              >
                <Bell size={16} />
                {alertLoading ? 'Setting alert...' : 'Notify me on this route'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultSection({ title, icon, trips, form, router, badge, badgeText, isReturn }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px',
      }}>
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
            trip={trip}
            form={form}
            router={router}
            badge={badge}
            badgeText={badgeText}
            isReturn={isReturn}
          />
        ))}
      </div>
    </div>
  )
}

function TripCard({ trip, form, router, badge, badgeText, isReturn }) {
  const [watching, setWatching] = useState(false)

  async function watchReturn(e) {
    e.stopPropagation()
    if (!trip.returnSlotId) return
    setWatching(true)
    try {
      const res = await api.post('/alerts/return', {
        returnSlotId: trip.returnSlotId,
      })
      toast.success(res.data.message || 'You will be notified when return is confirmed')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to set alert')
    } finally {
      setWatching(false)
    }
  }

  function goToTrip() {
    if (isReturn) return
    const params = new URLSearchParams({
      from:  trip.boardingCity || form.from,
      to:    trip.alightingCity || form.to,
      seats: String(form.seats),
    })
    router.push(`/trip/${trip.tripId}?${params}`)
  }

  return (
    <div
      className="card"
      style={{ cursor: isReturn ? 'default' : 'pointer', transition: 'border-color 0.2s' }}
      onClick={goToTrip}
      onMouseEnter={e => { if (!isReturn) e.currentTarget.style.borderColor = 'var(--amber)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap',
          }}>
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px' }}>
              {trip.boardingCity}
            </span>
            <ArrowRight size={14} color="var(--muted)" />
            <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px' }}>
              {trip.alightingCity || trip.destinationCity}
            </span>
            {badge && <span className={`badge ${badge}`}>{badgeText}</span>}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--muted)',
            fontSize: '13px', flexWrap: 'wrap',
          }}>
            {trip.departureTime && (
              <span>
                🕐 {new Date(trip.departureTime).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short',
                })}
              </span>
            )}
            {trip.driver?.name && <span>👤 {trip.driver.name}</span>}
            {trip.driver?.avgRating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Star size={12} color="var(--amber)" fill="var(--amber)" />
                {trip.driver.avgRating}
              </span>
            )}
            {trip.car?.isAC && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Snowflake size={12} color="#60a5fa" /> AC
              </span>
            )}
            {trip.etaToBoarding && (
              <span className="badge badge-green">{trip.etaToBoarding}</span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          {trip.pricePerSeat != null && (
            <div style={{
              fontFamily: 'Syne', fontWeight: 800, fontSize: '22px', color: 'var(--amber)',
            }}>
              ₹{trip.pricePerSeat.toLocaleString('en-IN')}
            </div>
          )}
          {trip.availableSeats != null && (
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
              {trip.availableSeats} seat{trip.availableSeats > 1 ? 's' : ''} left
            </div>
          )}
          {isReturn && trip.estimatedReturnDate && (
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
              Returns {new Date(trip.estimatedReturnDate).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short',
              })}
            </div>
          )}
          {isReturn && (
            <button
              type="button"
              className="btn-secondary"
              disabled={watching}
              onClick={watchReturn}
              style={{
                width: 'auto', padding: '8px 14px', fontSize: '12px', marginTop: '10px',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Bell size={14} />
              {watching ? 'Saving...' : 'Notify me'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
