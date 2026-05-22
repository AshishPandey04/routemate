'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import TripMap from '@/components/maps/TripMap.jsx'
import SafetyPanel from '@/components/shared/SafetyPanel.jsx'
import { getSocket, disconnectSocket } from '@/lib/socket.js'
import { Navigation, Send, MapPin, Zap, ZapOff } from 'lucide-react'

export default function TrackingPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const params = useParams()
    const tripId = params?.tripId

    const [location, setLocation] = useState(null)
    const [messages, setMessages] = useState([])
    const [message, setMessage] = useState('')
    const [trip, setTrip] = useState(null)
    const [isDriver, setIsDriver] = useState(false)
    const [sharing, setSharing] = useState(false)
    const [mounted, setMounted] = useState(false)

    const intervalRef = useRef(null)
    const watchIdRef = useRef(null)
    const chatBottomRef = useRef(null)
    const socketRef = useRef(null)

    // Prevent SSR issues
    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (!loading && !user) router.push('/login')
        if (user && tripId) {
            fetchTrip()
            fetchLatestLocation()
            fetchMessages()

            // Fallback poll (socket handles live updates when server is running)
            intervalRef.current = setInterval(() => {
                fetchLatestLocation()
                fetchMessages()
            }, 30000)
        }

        return () => {
            clearInterval(intervalRef.current)
            stopSharingLocation()
        }
    }, [user, loading, tripId])

    // Real-time location via Socket.io
    useEffect(() => {
        if (!user || !tripId) return

        let cancelled = false

        async function connectSocket() {
            try {
                const res = await api.get('/auth/socket-token')
                const token = res.data.token
                if (!token || cancelled) return

                const socket = getSocket(token)
                socketRef.current = socket

                const onLocation = (loc) => {
                    if (loc?.lat != null) setLocation(loc)
                }

                socket.off('location-update', onLocation)
                socket.on('location-update', onLocation)
                socket.emit('join-trip', { tripId })

                if (!socket.connected) {
                    socket.once('connect', () => {
                        socket.emit('join-trip', { tripId })
                    })
                }
            } catch {
                // Socket optional; polling still works
            }
        }

        connectSocket()

        return () => {
            cancelled = true
            const socket = socketRef.current
            if (socket) {
                socket.emit('leave-trip', { tripId })
                socket.off('location-update')
            }
            disconnectSocket()
            socketRef.current = null
        }
    }, [user, tripId])

    // Determine if current user is the driver
    useEffect(() => {
        if (trip && user) {
            setIsDriver(trip.driverId === user.id)
        }
    }, [trip, user])

    // Auto-scroll chat to bottom
    useEffect(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function fetchTrip() {
        try {
            const res = await api.get(`/trips/${tripId}`)
            setTrip(res.data.trip)
        } catch { }
    }

    async function fetchLatestLocation() {
        try {
            const res = await api.get(`/tracking/${tripId}/latest`)
            setLocation(res.data.location)
        } catch { }
    }

    async function fetchMessages() {
        try {
            const res = await api.get(`/messages/${tripId}`)
            setMessages(res.data.messages)
        } catch { }
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

    // ─── GPS Sharing (Driver Only) ───────────────────────────
    function startSharingLocation() {
        if (!navigator.geolocation) {
            toast.error('Geolocation is not supported on this device')
            return
        }

        setSharing(true)
        toast.success('Location sharing started')

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (pos) => {
                const { latitude, longitude, speed, heading } = pos.coords
                try {
                    await api.post('/tracking/ping', {
                        tripId,
                        lat: latitude,
                        lng: longitude,
                        speed: speed != null ? speed * 3.6 : null, // m/s → km/h
                        heading: heading,
                    })
                    // Update local location display for driver too
                    setLocation(prev => ({
                        ...prev,
                        lat: latitude,
                        lng: longitude,
                        speed: speed != null ? speed * 3.6 : null,
                        heading,
                        timestamp: new Date().toISOString(),
                    }))
                } catch { }
            },
            (err) => {
                console.error('GPS error:', err)
                toast.error('GPS error: ' + err.message)
                setSharing(false)
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000,
            }
        )
    }

    function stopSharingLocation() {
        if (watchIdRef.current != null) {
            navigator.geolocation?.clearWatch(watchIdRef.current)
            watchIdRef.current = null
        }
        setSharing(false)
    }

    function handleToggleSharing() {
        if (sharing) {
            stopSharingLocation()
            toast.info('Location sharing stopped')
        } else {
            startSharingLocation()
        }
    }

    // ─── Don't render on server ──────────────────────────────
    if (!mounted) return null
    if (loading) return (
        <div style={{ color: 'var(--muted)', padding: '40px 0', textAlign: 'center' }}>
            Loading...
        </div>
    )

    return (
        <div>
          {/* Page Header */}
          <div style={{ marginBottom: '24px' }}>
            <h1
              style={{
                fontFamily: 'Syne',
                fontSize: '28px',
                fontWeight: 800,
                marginBottom: '4px',
              }}
            >
              {isDriver ? 'Drive Mode' : 'Live Tracking'}
            </h1>
      
            {trip && (
              <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                {trip.originCity} → {trip.destinationCity} ·{' '}
                <span
                  className={`badge ${
                    trip.status === 'IN_TRANSIT'
                      ? 'badge-green'
                      : 'badge-amber'
                  }`}
                >
                  {trip.status}
                </span>
              </p>
            )}
          </div>
      
          <div className="track-layout">
            {/* LEFT PANEL */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* LIVE MAP */}
              {trip && (
                <TripMap
                  trip={trip}
                  liveLocation={location}
                  height={440}
                />
              )}

              {/* LIVE STATS */}
              <div className="card" style={{ padding: '16px 20px' }}>
                {location ? (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        marginBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: sharing ? 'var(--green)' : 'var(--amber)',
                            animation: 'pulse 2s infinite',
                          }}
                        />
                        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '15px' }}>
                          {sharing ? 'Sharing live' : 'Live position'}
                        </span>
                      </div>
                      {location.speed != null && (
                        <span style={{ fontSize: '14px', color: 'var(--muted)' }}>
                          {Math.round(location.speed)} km/h
                        </span>
                      )}
                    </div>

                    {location.nextWaypoint && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(245,159,11,0.1)',
                          border: '1px solid rgba(245,159,11,0.2)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          marginBottom: '12px',
                          fontSize: '13px',
                        }}
                      >
                        <MapPin size={14} color="var(--amber)" />
                        <span>
                          Next: <strong>{location.nextWaypoint.cityName}</strong>
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '8px',
                        fontSize: '12px',
                        color: 'var(--muted)',
                      }}
                    >
                      <span>
                        Updated{' '}
                        {location.timestamp
                          ? new Date(location.timestamp).toLocaleTimeString('en-IN')
                          : '—'}
                      </span>
                      <a
                        href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        Open in Google Maps →
                      </a>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '8px 0' }}>
                    <Navigation size={32} style={{ marginBottom: '12px', opacity: 0.35 }} />
                    <p style={{ fontFamily: 'Syne', fontWeight: 600, marginBottom: '6px' }}>
                      {isDriver
                        ? 'Start sharing your location'
                        : 'Waiting for driver location…'}
                    </p>
                    <p style={{ fontSize: '13px' }}>
                      {isDriver
                        ? 'The map shows your route; riders see you once sharing starts.'
                        : 'The driver marker appears when they start sharing GPS.'}
                    </p>
                  </div>
                )}
              </div>
      
              <SafetyPanel tripId={tripId} tripStatus={trip?.status} />

              {/* DRIVER CONTROLS */}
              {isDriver && (
                <div className="card">
                  <h3
                    style={{
                      fontFamily: 'Syne',
                      fontWeight: 700,
                      marginBottom: '12px',
                      fontSize: '16px',
                    }}
                  >
                    Location Sharing
                  </h3>
      
                  <p
                    style={{
                      color: 'var(--muted)',
                      fontSize: '13px',
                      marginBottom: '16px',
                      lineHeight: 1.5,
                    }}
                  >
                    {sharing
                      ? '🟢 Your location is being shared with riders every few seconds.'
                      : 'Share your GPS location so riders can track you in real time.'}
                  </p>
      
                  <button
                    onClick={handleToggleSharing}
                    style={{
                      background: sharing
                        ? 'rgba(239,68,68,0.1)'
                        : 'var(--amber)',
                      color: sharing ? 'var(--red)' : '#000',
                      border: sharing
                        ? '1px solid rgba(239,68,68,0.3)'
                        : 'none',
                      borderRadius: '8px',
                      padding: '12px 24px',
                      fontFamily: 'Syne',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: 'pointer',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {sharing ? (
                      <>
                        <ZapOff size={16} />
                        Stop Sharing Location
                      </>
                    ) : (
                      <>
                        <Zap size={16} />
                        Start Sharing Location
                      </>
                    )}
                  </button>
                </div>
              )}
      
              {/* WAYPOINTS */}
              {trip?.waypoints?.length > 0 && (
                <div className="card">
                  <h3
                    style={{
                      fontFamily: 'Syne',
                      fontWeight: 700,
                      marginBottom: '16px',
                    }}
                  >
                    Route Stops
                  </h3>
      
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {trip.waypoints.map((wp, i) => (
                      <div
                        key={wp.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div>{wp.cityName}</div>
      
                          <div
                            style={{
                              fontSize: '12px',
                              color: 'var(--muted)',
                            }}
                          >
                            ETA{' '}
                            {new Date(
                              wp.estimatedArrival
                            ).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
      
            {/* RIGHT PANEL */}
            <div
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: '75vh',
                position: 'sticky',
                top: '88px',
              }}
            >
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px', marginBottom: '10px' }}>
                  Trip Chat
                </h3>
                {/* Legend */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {[
                    { color: '#3b82f6', label: 'You'    },
                    { color: '#f59e0b', label: 'Driver' },
                    { color: '#64748b', label: 'Riders' },
                  ].map(l => (
                    <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--muted)' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                      {l.label}
                    </span>
                  ))}
                </div>
              </div>
      
              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '16px',
                  paddingRight: '4px',
                }}
              >
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px', marginTop: '32px' }}>
                    No messages yet. Say hello! 👋
                  </div>
                )}

                {messages.map((msg) => {
                  const senderId   = msg.senderId ?? msg.sender?.id
                  const isMe       = !!user?.id && senderId === user.id
                  const isDriver   = !!trip?.driverId && senderId === trip.driverId
                  const senderName = msg.sender?.name || 'Rider'
                  const initial    = senderName[0].toUpperCase()

                  // Colours:
                  // Me      → blue  (right)
                  // Driver  → amber (left)
                  // Riders  → slate (left)
                  const bubbleBg = isMe
                    ? 'linear-gradient(135deg,#3b82f6,#2563eb)'
                    : isDriver
                      ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                      : '#334155'

                  const avatarBg = isMe
                    ? 'linear-gradient(135deg,#3b82f6,#2563eb)'
                    : isDriver
                      ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                      : 'linear-gradient(135deg,#64748b,#475569)'

                  const label = isMe
                    ? 'You'
                    : isDriver
                      ? `${senderName} · Driver`
                      : senderName

                  const time = new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit', minute: '2-digit', hour12: true,
                  })

                  return (
                    <div
                      key={msg.id}
                      style={{
                        display:        'flex',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        alignItems:     'flex-end',
                        gap:            '6px',
                      }}
                    >
                      {/* Avatar — left side for others */}
                      {!isMe && (
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: avatarBg, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, flexShrink: 0,
                        }}>
                          {initial}
                        </div>
                      )}

                      {/* Bubble */}
                      <div style={{ maxWidth: '80%' }}>
                        <div style={{
                          background:   bubbleBg,
                          color:        '#fff',
                          padding:      '8px 12px',
                          borderRadius: isMe ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                          boxShadow:    '0 2px 6px rgba(0,0,0,0.15)',
                        }}>
                          {/* Sender label */}
                          <div style={{
                            fontSize: '10px', fontWeight: 700,
                            color: 'rgba(255,255,255,0.8)',
                            marginBottom: '3px', letterSpacing: '0.3px',
                          }}>
                            {label}
                          </div>

                          {/* Message text */}
                          <div style={{ fontSize: '13px', lineHeight: '1.45', wordBreak: 'break-word' }}>
                            {msg.content}
                          </div>

                          {/* Time */}
                          <div style={{
                            fontSize: '10px', marginTop: '4px',
                            color: 'rgba(255,255,255,0.6)', textAlign: 'right',
                          }}>
                            {time}
                          </div>
                        </div>
                      </div>

                      {/* Avatar — right side for me */}
                      {isMe && (
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: avatarBg, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, flexShrink: 0,
                        }}>
                          {(user?.name || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  )
                })}

                <div ref={chatBottomRef} />
              </div>
      
              {/* Message Input */}
              <form
                onSubmit={sendMessage}
                style={{
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <input
                  className="input"
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  style={{ flex: 1 }}
                />
      
                <button
                  type="submit"
                  disabled={!message.trim()}
                  style={{
                    background: message.trim()
                      ? 'var(--amber)'
                      : 'var(--bg-input)',
                    border: 'none',
                    borderRadius: '8px',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Send
                    size={16}
                    color={
                      message.trim()
                        ? '#000'
                        : 'var(--muted)'
                    }
                  />
                </button>
              </form>
            </div>
          </div>
      
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            .track-layout {
              display: grid;
              grid-template-columns: 1fr 360px;
              gap: 24px;
              align-items: start;
            }
            @media (max-width: 900px) {
              .track-layout {
                grid-template-columns: 1fr;
              }
            }
          `}</style>
        </div>
      )}