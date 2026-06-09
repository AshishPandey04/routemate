'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
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

    // Prevent SSR issues
    useEffect(() => { setMounted(true) }, [])

    useEffect(() => {
        if (!loading && !user) router.push('/login')
        if (user && tripId) {
            fetchTrip()
            fetchLatestLocation()
            fetchMessages()

            // Poll location every 10 seconds
            intervalRef.current = setInterval(() => {
                fetchLatestLocation()
                fetchMessages()
            }, 10000)
        }

        return () => {
            clearInterval(intervalRef.current)
            stopSharingLocation()
        }
    }, [user, loading, tripId])

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
      
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 360px',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* LEFT PANEL */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* LOCATION CARD */}
              <div
                className="card"
                style={{
                  minHeight: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {location ? (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    {/* Pulsing Icon */}
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        background: sharing
                          ? 'rgba(34,197,94,0.15)'
                          : 'rgba(245,159,11,0.15)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        animation: 'pulse 2s infinite',
                      }}
                    >
                      <Navigation
                        size={36}
                        color={sharing ? 'var(--green)' : 'var(--amber)'}
                        style={{
                          transform:
                            location.heading != null
                              ? `rotate(${location.heading}deg)`
                              : 'none',
                          transition: 'transform 0.5s ease',
                        }}
                      />
                    </div>
      
                    {/* Location Data */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '16px',
                        marginBottom: '20px',
                        padding: '16px',
                        background: 'var(--bg-input)',
                        borderRadius: '10px',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--muted)',
                            marginBottom: '4px',
                          }}
                        >
                          LAT
                        </div>
      
                        <div
                          style={{
                            fontFamily: 'Syne',
                            fontWeight: 700,
                            fontSize: '14px',
                          }}
                        >
                          {location.lat?.toFixed(5)}
                        </div>
                      </div>
      
                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--muted)',
                            marginBottom: '4px',
                          }}
                        >
                          LNG
                        </div>
      
                        <div
                          style={{
                            fontFamily: 'Syne',
                            fontWeight: 700,
                            fontSize: '14px',
                          }}
                        >
                          {location.lng?.toFixed(5)}
                        </div>
                      </div>
      
                      <div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--muted)',
                            marginBottom: '4px',
                          }}
                        >
                          SPEED
                        </div>
      
                        <div
                          style={{
                            fontFamily: 'Syne',
                            fontWeight: 700,
                            fontSize: '14px',
                          }}
                        >
                          {location.speed != null
                            ? `${Math.round(location.speed)} km/h`
                            : '—'}
                        </div>
                      </div>
                    </div>
      
                    {/* Next Waypoint */}
                    {location.nextWaypoint && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          background: 'rgba(245,159,11,0.1)',
                          border: '1px solid rgba(245,159,11,0.2)',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          marginBottom: '16px',
                          fontSize: '13px',
                        }}
                      >
                        <MapPin size={14} color="var(--amber)" />
      
                        <span>
                          Next:{' '}
                          <strong>
                            {location.nextWaypoint.cityName}
                          </strong>
                        </span>
                      </div>
                    )}
      
                    {/* Last Updated */}
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--muted)',
                        marginBottom: '16px',
                      }}
                    >
                      Updated{' '}
                      {new Date(location.timestamp).toLocaleTimeString(
                        'en-IN'
                      )}
                    </div>
      
                    {/* Google Maps Link */}
                    <a
                      href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{
                        display: 'inline-block',
                        padding: '8px 20px',
                        fontSize: '13px',
                        textDecoration: 'none',
                      }}
                    >
                      Open in Google Maps
                    </a>
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: 'center',
                      color: 'var(--muted)',
                    }}
                  >
                    <Navigation
                      size={48}
                      style={{
                        marginBottom: '16px',
                        opacity: 0.3,
                      }}
                    />
      
                    <p
                      style={{
                        fontFamily: 'Syne',
                        fontWeight: 600,
                        marginBottom: '8px',
                      }}
                    >
                      {isDriver
                        ? 'Start sharing your location'
                        : 'Waiting for driver location...'}
                    </p>
      
                    <p style={{ fontSize: '13px' }}>
                      {isDriver
                        ? 'Tap the button below to begin'
                        : "You'll see the car here once the driver starts sharing"}
                    </p>
                  </div>
                )}
              </div>
      
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
              <h3
                style={{
                  fontFamily: 'Syne',
                  fontWeight: 700,
                  marginBottom: '16px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                Trip Chat
              </h3>
      
              {/* Messages */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '16px',
                }}
              >
                {messages.map((msg) => {
                  const isMe = msg.sender?.id === user?.id
      
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: isMe
                          ? 'flex-end'
                          : 'flex-start',
                        maxWidth: '85%',
                      }}
                    >
                      <div
                        style={{
                          background: isMe
                            ? 'var(--amber)'
                            : 'var(--bg-input)',
                          color: isMe ? '#000' : 'var(--text)',
                          padding: '9px 13px',
                          borderRadius: isMe
                            ? '12px 12px 4px 12px'
                            : '12px 12px 12px 4px',
                        }}
                      >
                        {msg.content}
                      </div>
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
      
          {/* Pulse animation */}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>
        </div>
      )}