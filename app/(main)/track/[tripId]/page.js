'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Navigation, Send } from 'lucide-react'

export default function TrackingPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const params = useParams()
    const tripId = params.tripId

    const [location, setLocation] = useState(null)
    const [messages, setMessages] = useState([])
    const [message, setMessage] = useState('')
    const [trip, setTrip] = useState(null)
    const intervalRef = useRef(null)

    useEffect(() => {
        if (!loading && !user) router.push('/login')
        if (user && tripId) {
            fetchLatestLocation()
            fetchMessages()
            fetchTrip()

            // Poll location every 10 seconds
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }

            intervalRef.current = setInterval(fetchLatestLocation, 10000)
        }

        return () => clearInterval(intervalRef.current)
    }, [user, loading, tripId])

    async function fetchLatestLocation() {
        try {
            const res = await api.get(`/tracking/${tripId}/latest`)
            setLocation(res.data.location)
        } catch (error) {
            console.error(error)
        }
    }

    async function fetchTrip() {
        try {
            const res = await api.get(`/trips/${tripId}`)
            setTrip(res.data.trip)
        } catch (error) {
            console.error(error)
        }
    }

    async function fetchMessages() {
        try {
            const res = await api.get(`/messages/${tripId}`)
            setMessages(res.data.messages)
        } catch (error) {
            console.error(error)
        }
    }

    async function sendMessage(e) {
        e.preventDefault()
        if (!message.trim()) return

        try {
            await api.post(`/messages/${tripId}`, { content: message })
            setMessage('')
            setInterval(fetchMessages, 5000)
        } catch {
            toast.error('Failed to send message')
        }
    }

    if (loading) return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>

    return (
        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth < 768 ? '1fr' : '1fr 360px', gap: '24px', minHeight: '70vh' }}>

            {/* Map Area */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                {location ? (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'rgba(245,159,11,0.15)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            animation: 'pulse 2s infinite',
                        }}>
                            <Navigation size={36} color="var(--amber)" />
                        </div>

                        <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px' }}>
                            Live Location
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--muted)', fontSize: '14px' }}>
                            <div>📍 {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}</div>
                            {location.speed && <div>🚀 {Math.round(location.speed)} km/h</div>}
                            {location.nextWaypoint && (
                                <div style={{ marginTop: '8px' }}>
                                    <span className="badge badge-amber">
                                        Next: {location.nextWaypoint.cityName}
                                    </span>
                                </div>
                            )}
                            <div style={{ fontSize: '12px', marginTop: '8px' }}>
                                Last updated: {location.timestamp && (
                                    <div style={{ fontSize: '12px', marginTop: '8px' }}>
                                        Last updated: {new Date(location.timestamp).toLocaleTimeString()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Google Maps Link */}
                        {location.lat && (
                            <a
                                href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ marginTop: '20px', display: 'inline-block' }}
                            >
                                <button
                                    className="btn-secondary"
                                    style={{
                                        width: 'auto',
                                        padding: '8px 20px',
                                        fontSize: '13px'
                                    }}
                                >
                                    Open in Google Maps
                                </button>
                            </a>
                        )}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                        <Navigation size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <p style={{ fontFamily: 'Syne', fontWeight: 600 }}>
                            Waiting for location...
                        </p>
                        <p style={{ fontSize: '13px', marginTop: '8px' }}>
                            The driver hasn't shared their location yet
                        </p>
                    </div>
                )}
            </div>

            {/* Chat Panel */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
                    Trip Chat
                </h3>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    marginBottom: '16px',
                }}>
                    {messages.length === 0 ? (
                        <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
                            No messages yet. Say hi! 👋
                        </p>
                    ) : (
                        messages.map(msg => (
                            <div key={msg.id} style={{
                                alignSelf: msg.sender.id === user?.id ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                            }}>
                                <div style={{
                                    background: msg.sender.id === user?.id ? 'var(--amber)' : 'var(--bg-input)',
                                    color: msg.sender.id === user?.id ? '#000' : 'var(--text)',
                                    padding: '8px 12px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                }}>
                                    {msg.content}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                                    {msg.sender.name} · {new Date(msg.createdAt).toLocaleTimeString()}
                                </div>
                            </div>
                        ))
                    )}
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
                            background: 'var(--amber)',
                            border: 'none',
                            borderRadius: '8px',
                            width: '44px',
                            height: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        <Send size={16} color="#000" />
                    </button>
                </form>
            </div>
        </div >
    )
}