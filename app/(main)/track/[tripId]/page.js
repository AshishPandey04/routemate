'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Navigation, Send, Radio, MapPin } from 'lucide-react'

export default function TrackingPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const params            = useParams()
  const tripId            = params.tripId

  const [location, setLocation]   = useState(null)
  const [messages, setMessages]   = useState([])
  const [message, setMessage]     = useState('')
  const [trip, setTrip]           = useState(null)
  const [sharing, setSharing]     = useState(false)
  const [gridCols, setGridCols]   = useState('1fr 360px')

  const pollRef       = useRef(null)
  const watchRef      = useRef(null)
  const messagesEndRef = useRef(null)

  const isDriver = trip?.isDriver && trip?.status === 'IN_TRANSIT'

  useEffect(() => {
    function updateCols() {
      setGridCols(window.innerWidth < 768 ? '1fr' : '1fr 360px')
    }
    updateCols()
    window.addEventListener('resize', updateCols)
    return () => window.removeEventListener('resize', updateCols)
  }, [])

  const fetchLatestLocation = useCallback(async () => {
    try {
      const res = await api.get(`/tracking/${tripId}/latest`)
      setLocation(res.data.location)
    } catch {
      /* rider may wait for first ping */
    }
  }, [tripId])

  const fetchTrip = useCallback(async () => {
    try {
      const res = await api.get(`/trips/${tripId}`)
      setTrip(res.data.trip)
    } catch {
      toast.error('Failed to load trip')
    }
  }, [tripId])

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/messages/${tripId}`)
      setMessages(res.data.messages)
    } catch {
      /* optional */
    }
  }, [tripId])

  const sendGpsPing = useCallback(async (position) => {
    try {
      await api.post('/tracking/ping', {
        tripId,
        lat:     position.coords.latitude,
        lng:     position.coords.longitude,
        speed:   position.coords.speed != null
          ? position.coords.speed * 3.6
          : undefined,
        heading: position.coords.heading ?? undefined,
      })
      await fetchLatestLocation()
    } catch (err) {
      console.error('GPS ping failed', err)
    }
  }, [tripId, fetchLatestLocation])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (!user || !tripId) return

    fetchTrip()
    fetchMessages()
    fetchLatestLocation()

    pollRef.current = setInterval(fetchLatestLocation, 10000)
    const msgPoll = setInterval(fetchMessages, 8000)

    return () => {
      clearInterval(pollRef.current)
      clearInterval(msgPoll)
      if (watchRef.current != null) {
        navigator.geolocation.clearWatch(watchRef.current)
      }
    }
  }, [user, loading, tripId, fetchTrip, fetchMessages, fetchLatestLocation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function startSharingLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported on this device')
      return
    }

    setSharing(true)
    watchRef.current = navigator.geolocation.watchPosition(
      pos => sendGpsPing(pos),
      err => {
        toast.error(err.message || 'Could not access location')
        setSharing(false)
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    )
    toast.success('Sharing your live location with riders')
  }

  function stopSharingLocation() {
    if (watchRef.current != null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setSharing(false)
    toast.info('Stopped sharing location')
  }

  async function sendMessage(e) {
    e.preventDefault()
    if (!message.trim()) return

    try {
      await api.post(`/messages/${tripId}`, { content: message })
      setMessage('')
      fetchMessages()
    } catch {
      toast.error('Failed to send message')
    }
  }

  if (loading || !trip) {
    return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Syne', fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>
          {trip.originCity} → {trip.destinationCity}
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          {isDriver ? 'Driver view — share GPS so riders can track you' : 'Live trip tracking & chat'}
        </p>
      </div>

      {isDriver && (
        <div className="card" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Radio size={18} color={sharing ? 'var(--green)' : 'var(--muted)'} />
              <div>
                <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '15px' }}>
                  GPS Sharing {sharing ? 'ON' : 'OFF'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                  Updates every few seconds while driving
                </div>
              </div>
            </div>
            {sharing ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={stopSharingLocation}
                style={{ width: 'auto', padding: '10px 20px' }}
              >
                Stop Sharing
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={startSharingLocation}
                style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <MapPin size={16} /> Start Sharing Location
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '24px', minHeight: '60vh' }}>
        <div className="card" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '320px',
        }}>
          {location?.lat != null ? (
            <div style={{ width: '100%', textAlign: 'center' }}>
              <div style={{
                width: '80px', height: '80px',
                background: 'rgba(245,159,11,0.15)', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <Navigation size={36} color="var(--amber)" />
              </div>

              <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px' }}>
                Live Location
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '14px' }}>
                <div>📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</div>
                {location.speed != null && (
                  <div>🚀 {Math.round(location.speed)} km/h</div>
                )}
                {location.nextWaypoint && (
                  <span className="badge badge-amber" style={{ marginTop: '8px' }}>
                    Next: {location.nextWaypoint.cityName}
                  </span>
                )}
                {location.timestamp && (
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    Last updated: {new Date(location.timestamp).toLocaleTimeString()}
                  </div>
                )}
              </div>

              <a
                href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ marginTop: '20px', display: 'inline-block' }}
              >
                <button className="btn-secondary" style={{ width: 'auto', padding: '8px 20px', fontSize: '13px' }}>
                  Open in Google Maps
                </button>
              </a>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
              <Navigation size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
              <p style={{ fontFamily: 'Syne', fontWeight: 600 }}>Waiting for location...</p>
              <p style={{ fontSize: '13px', marginTop: '8px' }}>
                {isDriver
                  ? 'Tap "Start Sharing Location" to broadcast your GPS'
                  : "The driver hasn't shared their location yet"}
              </p>
            </div>
          )}
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px', maxHeight: '70vh' }}>
          <h3 style={{
            fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px',
            paddingBottom: '16px', borderBottom: '1px solid var(--border)',
          }}>
            Trip Chat
          </h3>

          <div style={{
            flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
            gap: '12px', marginBottom: '16px',
          }}>
            {messages.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                No messages yet. Say hi! 👋
              </p>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.sender.id === user?.id ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                  }}
                >
                  <div style={{
                    background: msg.sender.id === user?.id ? 'var(--amber)' : 'var(--bg-input)',
                    color: msg.sender.id === user?.id ? '#000' : 'var(--text)',
                    padding: '8px 12px', borderRadius: '12px', fontSize: '13px',
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                    {msg.sender.name} · {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input
              className="input"
              placeholder="Type a message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="submit"
              style={{
                background: 'var(--amber)', border: 'none', borderRadius: '8px',
                width: '44px', height: '44px', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              }}
            >
              <Send size={16} color="#000" />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
