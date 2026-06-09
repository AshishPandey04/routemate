'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { openRazorpayCheckout } from '@/lib/razorpay-client.js'
import {
  ArrowRight, MapPin, Star, Snowflake,
  Users, Clock, ChevronRight, Car
} from 'lucide-react'

function TripDetailContent() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const params            = useParams()
  const searchParams      = useSearchParams()
  const tripId            = params.tripId

  // Pre-fill from search params
  const defaultBoarding  = searchParams.get('from')  || ''
  const defaultAlighting = searchParams.get('to')    || ''

  const [trip,        setTrip]        = useState(null)
  const [fetching,    setFetching]    = useState(true)
  const [booking,     setBooking]     = useState(false)
  const [seats,       setSeats]       = useState(1)
  const [boardingCity,  setBoardingCity]  = useState(defaultBoarding)
  const [alightingCity, setAlightingCity] = useState(defaultAlighting)

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
      router.push('/search')
    } finally {
      setFetching(false)
    }
  }

  async function handleBook() {
    if (!boardingCity || !alightingCity) {
      toast.error('Please select boarding and alighting cities')
      return
    }

    if (boardingCity === alightingCity) {
      toast.error('Boarding and alighting cities cannot be the same')
      return
    }

    setBooking(true)
    try {
      // Step 1 — Hold seats
      const holdRes = await api.post('/bookings/hold', {
        tripId,
        boardingCity,
        alightingCity,
        seatsRequested: seats,
      })

      const { razorpayOrderId, amount } = holdRes.data.data ?? holdRes.data

      // Step 2 — Open Razorpay checkout
      await openRazorpayCheckout({
        orderId: razorpayOrderId,
        amount,
        tripId,
        user,
        onSuccess: async (paymentData) => {
          try {
            // Step 3 — Confirm booking
            await api.post('/bookings/confirm', {
              tripId,
              ...paymentData,
            })
            toast.success('Booking confirmed! 🎉')
            router.push('/my-bookings')
          } catch (err) {
            const errData = err.response?.data?.error
            toast.error(
              typeof errData === 'string' ? errData : errData?.message || 'Booking confirmation failed'
            )
          }
        },
        onFailure: (reason) => {
          toast.error(reason || 'Payment cancelled')
          setBooking(false)
        },
      })
    } catch (err) {
      const errData = err.response?.data?.error
      toast.error(
        typeof errData === 'string' ? errData : errData?.message || 'Failed to initiate booking'
      )
      setBooking(false)
    }
  }

  if (loading || fetching) {
    return (
      <div style={{ color: 'var(--muted)', padding: '60px 0', textAlign: 'center' }}>
        Loading trip...
      </div>
    )
  }

  if (!trip) return null

  const cities    = trip.routeCities || []
  const avgRating = trip.driver?.avgRating

  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: '1fr 360px',
      gap:                 '24px',
      alignItems:          'start',
    }}>

      {/* Left — Trip Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Route Header */}
        <div className="card">
          <div style={{
            display:     'flex',
            alignItems:  'center',
            gap:         '12px',
            marginBottom: '20px',
          }}>
            <div>
              <div style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800 }}>
                {trip.originCity}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Origin</div>
            </div>
            <ArrowRight size={24} color="var(--amber)" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800 }}>
                {trip.destinationCity}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Destination</div>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <span className={`badge ${
                trip.status === 'SCHEDULED'  ? 'badge-amber' :
                trip.status === 'IN_TRANSIT' ? 'badge-green' :
                'badge-muted'
              }`}>
                {trip.status}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap:                 '16px',
            paddingTop:          '20px',
            borderTop:           '1px solid var(--border)',
          }}>
            {[
              { label: 'Distance',   value: `${trip.distanceKm} km` },
              { label: 'Departure',  value: new Date(trip.departureTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) },
              { label: 'Price/km',   value: `₹${trip.pricePerKm}` },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700 }}>{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Route Cities */}
        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '20px' }}>
            Route Stops
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {(trip.waypoints || []).map((waypoint, i) => (
              <div key={waypoint.id} style={{
                display:    'flex',
                alignItems: 'flex-start',
                gap:        '16px',
              }}>
                <div style={{
                  display:        'flex',
                  flexDirection:  'column',
                  alignItems:     'center',
                  flexShrink:     0,
                }}>
                  <div style={{
                    width:        '12px',
                    height:       '12px',
                    borderRadius: '50%',
                    background:   i === 0 || i === cities.length - 1 ? 'var(--amber)' : 'var(--border)',
                    border:       '2px solid var(--amber)',
                    flexShrink:   0,
                    marginTop:    '4px',
                  }} />
                  {i < (trip.waypoints?.length || 0) - 1 && (
                    <div style={{
                      width:      '2px',
                      height:     '32px',
                      background: 'var(--border)',
                    }} />
                  )}
                </div>
                <div style={{ paddingBottom: i < (trip.waypoints?.length || 0) - 1 ? '8px' : 0 }}>
                  <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '15px' }}>
                    {waypoint.cityName}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    ETA: {new Date(waypoint.estimatedArrival).toLocaleTimeString('en-IN', {
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Car Info */}
        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px' }}>
            Vehicle
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px',
              background: 'rgba(245,159,11,0.1)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Car size={22} color="var(--amber)" />
            </div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px' }}>
                {trip.car?.make} {trip.car?.model}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                {trip.car?.isAC && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#60a5fa' }}>
                    <Snowflake size={12} />AC
                  </span>
                )}
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {trip.car?.plateNumber}
                </span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '18px' }}>
                {trip.totalSeats}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>total seats</div>
            </div>
          </div>
        </div>

        {/* Driver Info */}
        <div className="card"
          style={{ cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => router.push(`/user/${trip.driver?.id}`)}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px' }}>
            Driver
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px',
              background: 'var(--bg-input)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne', fontWeight: 700, fontSize: '20px',
            }}>
              {trip.driver?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px' }}>
                {trip.driver?.name}
              </div>
              {trip.driver?.phone && (
                <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                  📞 {trip.driver.phone}
                </div>
              )}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {avgRating ? (
                <>
                  <Star size={16} color="var(--amber)" fill="var(--amber)" />
                  <span style={{ fontFamily: 'Syne', fontWeight: 700 }}>{avgRating}</span>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    ({trip.driver?.totalRatings})
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>No ratings yet</span>
              )}
              <ChevronRight size={16} color="var(--muted)" style={{ marginLeft: '4px' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Right — Booking Panel */}
      <div style={{ position: 'sticky', top: '88px' }}>
        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '20px', fontSize: '18px' }}>
            Book Your Seat
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Boarding City */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                BOARDING CITY
              </label>
              <select
                className="input"
                value={boardingCity}
                onChange={e => setBoardingCity(e.target.value)}
              >
                <option value="">Select boarding city</option>
                {cities.slice(0, -1).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Alighting City */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                ALIGHTING CITY
              </label>
              <select
                className="input"
                value={alightingCity}
                onChange={e => setAlightingCity(e.target.value)}
              >
                <option value="">Select alighting city</option>
                {cities.slice(1).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>

            {/* Seats */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                SEATS
              </label>
              <select
                className="input"
                value={seats}
                onChange={e => setSeats(parseInt(e.target.value))}
              >
                {[1,2,3,4].map(n => (
                  <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>
                ))}
              </select>
            </div>

            {/* Price Estimate */}
            {boardingCity && alightingCity && boardingCity !== alightingCity && (
              <div style={{
                background:   'rgba(245,159,11,0.08)',
                border:       '1px solid rgba(245,159,11,0.2)',
                borderRadius: '8px',
                padding:      '12px 16px',
              }}>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                  Estimated price
                </div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '24px', color: 'var(--amber)' }}>
                  ₹{estimatePrice(trip, cities, boardingCity, alightingCity, seats).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  for {seats} seat{seats > 1 ? 's' : ''} · {boardingCity} → {alightingCity}
                </div>
              </div>
            )}

            <button
              className="btn-primary"
              disabled={booking || trip.status === 'COMPLETED' || trip.status === 'CANCELLED'}
              onClick={handleBook}
              style={{ marginTop: '4px' }}
            >
              {booking ? 'Processing...' :
               trip.status === 'COMPLETED' ? 'Trip Completed' :
               trip.status === 'CANCELLED' ? 'Trip Cancelled' :
               'Book & Pay'}
            </button>

            <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
              Seat held for 8 minutes after clicking
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function estimatePrice(trip, cities, from, to, seats) {
  const fromIdx = cities.indexOf(from)
  const toIdx   = cities.indexOf(to)
  if (fromIdx === -1 || toIdx === -1 || fromIdx >= toIdx) return 0
  const fraction = (toIdx - fromIdx) / (cities.length - 1)
  return Math.round(trip.distanceKm * fraction * trip.pricePerKm * seats)
}

export default function TripDetailPage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading trip…</div>}>
      <TripDetailContent />
    </Suspense>
  )
}