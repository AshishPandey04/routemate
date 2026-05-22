'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import TripMap from '@/components/maps/TripMap.jsx'
import { MapPin, Navigation } from 'lucide-react'

export default function PublicSharePage() {
  const params = useParams()
  const token = params?.token
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) return
    fetchTrack()
    const id = setInterval(fetchTrack, 15000)
    return () => clearInterval(id)
  }, [token])

  async function fetchTrack() {
    try {
      const res = await axios.get(`/api/track/public/${token}`)
      setData(res.data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Link invalid or expired')
    }
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <p style={{ color: 'var(--red)', fontWeight: 600 }}>{error}</p>
      </div>
    )
  }

  if (!data) {
    return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '48px' }}>Loading trip…</div>
  }

  const { trip, location } = data

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
          {trip.originCity} → {trip.destinationCity}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          Driver: {trip.driverName} · Status:{' '}
          <span className={trip.status === 'IN_TRANSIT' ? 'badge-green' : 'badge-amber'}>
            {trip.status}
          </span>
        </p>
      </div>

      <TripMap trip={trip} liveLocation={location} height={400} />

      <div className="card" style={{ marginTop: '16px' }}>
        {location ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Navigation size={20} color="var(--green)" />
            <span>
              Last update: {new Date(location.timestamp).toLocaleTimeString('en-IN')}
              {location.speed != null && ` · ${Math.round(location.speed)} km/h`}
            </span>
            <a
              href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--amber)', fontWeight: 600, fontSize: '14px' }}
            >
              Open in Maps →
            </a>
          </div>
        ) : (
          <p style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} /> Waiting for live location…
          </p>
        )}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '16px', textAlign: 'center' }}>
        This is a read-only safety link. Do not share publicly.
      </p>
    </div>
  )
}
