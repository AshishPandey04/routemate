'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { openRazorpayCheckout } from '@/lib/razorpay-client.js'
import {
  ArrowLeft, ArrowRight, Star, Users, MapPin
} from 'lucide-react'

function TripBookingContent() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const params            = useParams()
  const searchParams        = useSearchParams()
  const tripId            = params.tripId

  const [trip, setTrip]           = useState(null)
  const [fetching, setFetching]   = useState(true)
  const [booking, setBooking]     = useState(false)

  const [boardingCity, setBoardingCity]   = useState(searchParams.get('from') || '')
  const [alightingCity, setAlightingCity] = useState(searchParams.get('to') || '')
  const [seatsRequested, setSeatsRequested] = useState(
    parseInt(searchParams.get('seats') || '1', 10)
  )

  useEffect(() => {
    if (!trip?.routeCities?.length) return
    const boardIdx = trip.routeCities.indexOf(boardingCity)
    const alightIdx = trip.routeCities.indexOf(alightingCity)
    if (boardIdx >= 0 && (alightIdx <= boardIdx || alightIdx < 0)) {
      const next = trip.routeCities[boardIdx + 1]
      if (next) setAlightingCity(next)
    }
  }, [boardingCity, trip?.routeCities])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user && tripId) fetchTrip()
  }, [user, loading, tripId])

  async function fetchTrip() {
    try {
      const res = await api.get(`/trips/${tripId}`)
      const t = res.data.trip
      setTrip(t)

      if (!boardingCity && t.routeCities?.length) {
        setBoardingCity(t.routeCities[0])
      }
      if (!alightingCity && t.routeCities?.length) {
        setAlightingCity(t.routeCities[t.routeCities.length - 1])
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Trip not found')
      router.push('/search')
    } finally {
      setFetching(false)
    }
  }

  function getSegmentPrice() {
    if (!trip?.segmentAvailability || !boardingCity || !alightingCity) return null
    const key = `${boardingCity}-${alightingCity}`
    const seats = trip.segmentAvailability[key]
    if (seats == null) return null

    const fromIdx = trip.routeCities.indexOf(boardingCity)
    const toIdx   = trip.routeCities.indexOf(alightingCity)
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= toIdx) return null

    const fraction = (toIdx - fromIdx) / (trip.routeCities.length - 1)
    const perSeat  = Math.round(trip.distanceKm * fraction * trip.pricePerKm)
    return { perSeat, total: perSeat * seatsRequested, available: seats }
  }

  const priceInfo = trip ? getSegmentPrice() : null

  async function handleBook() {
    if (!boardingCity || !alightingCity) {
      toast.error('Select boarding and alighting cities')
      return
    }
    if (boardingCity === alightingCity) {
      toast.error('Boarding and alighting must be different')
      return
    }

    setBooking(true)
    try {
      const holdRes = await api.post('/bookings/hold', {
        tripId,
        boardingCity,
        alightingCity,
        seatsRequested,
      })

      const { razorpayOrderId, amount } = holdRes.data

      await openRazorpayCheckout({
        orderId:   razorpayOrderId,
        amount,
        userName:  user.name,
        userEmail: user.email,
        userPhone: user.phone,
        onSuccess: async (response) => {
          try {
            await api.post('/bookings/confirm', {
              tripId,
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            toast.success('Booking confirmed!')
            router.push('/my-bookings')
          } catch (err) {
            toast.error(err.response?.data?.error || 'Payment received but confirmation failed')
          }
        },
        onDismiss: () => toast.info('Payment cancelled'),
      })
    } catch (err) {
      if (err.message !== 'Payment cancelled') {
        toast.error(err.response?.data?.error || err.message || 'Booking failed')
      }
    } finally {
      setBooking(false)
    }
  }

  if (loading || fetching) {
    return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>
  }

  if (!trip) return null

  const cities = trip.routeCities || []
  const canBook = trip.status === 'SCHEDULED' || trip.status === 'IN_TRANSIT'

  return (
    <div style={{ maxWidth: '720px' }}>
      <button
        type="button"
        onClick={() => router.push('/search')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', marginBottom: '24px', fontSize: '14px',
        }}
      >
        <ArrowLeft size={16} /> Back to search
      </button>

      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <h1 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800 }}>
            {trip.originCity}
          </h1>
          <ArrowRight size={20} color="var(--muted)" />
          <h1 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800 }}>
            {trip.destinationCity}
          </h1>
          <span className={`badge ${trip.status === 'IN_TRANSIT' ? 'badge-green' : 'badge-amber'}`}>
            {trip.status}
          </span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          {new Date(trip.departureTime).toLocaleString('en-IN')} · {trip.car.make} {trip.car.model}
          {trip.car.isAC && ' · AC'}
        </p>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px' }}>Driver</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>{trip.driver.name}</span>
          {trip.driver.avgRating && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
              <Star size={14} color="var(--amber)" fill="var(--amber)" />
              {trip.driver.avgRating} ({trip.driver.totalRatings} reviews)
            </span>
          )}
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
            onClick={() => router.push(`/user/${trip.driver.id}`)}
          >
            View profile
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '12px' }}>Route</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {cities.map((city, i) => (
            <span key={city + i} style={{
              background: i === 0 || i === cities.length - 1 ? 'var(--amber)' : 'var(--bg-input)',
              color: i === 0 || i === cities.length - 1 ? '#000' : 'var(--text)',
              padding: '4px 10px', borderRadius: '100px', fontSize: '12px',
              fontFamily: 'Syne', fontWeight: 600,
            }}>
              {city}
            </span>
          ))}
        </div>
      </div>

      {canBook ? (
        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '20px' }}>
            Book your seats
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                BOARD AT
              </label>
              <select
                className="input"
                value={boardingCity}
                onChange={e => setBoardingCity(e.target.value)}
              >
                {cities.slice(0, -1).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                ALIGHT AT
              </label>
              <select
                className="input"
                value={alightingCity}
                onChange={e => setAlightingCity(e.target.value)}
              >
                {cities.filter((c, i) => {
                  const boardIdx = cities.indexOf(boardingCity)
                  return i > boardIdx
                }).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                SEATS
              </label>
              <div style={{ position: 'relative' }}>
                <Users size={16} color="var(--muted)" style={{
                  position: 'absolute', left: '12px', top: '50%',
                  transform: 'translateY(-50%)', pointerEvents: 'none',
                }} />
                <select
                  className="input"
                  value={seatsRequested}
                  onChange={e => setSeatsRequested(parseInt(e.target.value))}
                  style={{ paddingLeft: '36px' }}
                >
                  {[1, 2, 3, 4].map(n => (
                    <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {priceInfo && (
            <div style={{
              background: 'var(--bg-input)', borderRadius: '8px',
              padding: '16px', marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Price per seat</span>
                <span style={{ fontWeight: 600 }}>₹{priceInfo.perSeat.toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Seats available</span>
                <span style={{ fontWeight: 600 }}>{priceInfo.available}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                paddingTop: '12px', borderTop: '1px solid var(--border)',
              }}>
                <span style={{ fontFamily: 'Syne', fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '22px', color: 'var(--amber)' }}>
                  ₹{priceInfo.total.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn-primary"
            disabled={booking || !priceInfo || priceInfo.available < seatsRequested}
            onClick={handleBook}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            <MapPin size={16} />
            {booking ? 'Processing...' : `Pay & Book · ₹${priceInfo?.total?.toLocaleString('en-IN') || '—'}`}
          </button>

          <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '12px', textAlign: 'center' }}>
            Seats held for 8 minutes during payment
          </p>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', color: 'var(--muted)' }}>
          This trip is no longer available for booking
        </div>
      )}
    </div>
  )
}

export default function TripBookingPage() {
  return (
    <Suspense fallback={<div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>}>
      <TripBookingContent />
    </Suspense>
  )
}
