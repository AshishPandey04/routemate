'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api, { getErrorMessage } from '@/lib/api.js'
import { Send, MapPin, Users, ArrowLeft } from 'lucide-react'

export default function MessagesPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const params            = useParams()
  const tripId            = params.tripId

  const [messages,   setMessages]   = useState([])
  const [trip,       setTrip]       = useState(null)
  const [fetching,   setFetching]   = useState(true)
  const [sending,    setSending]    = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef  = useRef(null)
  const pollIntervalRef = useRef(null)

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get(`/messages/${tripId}`)
      setMessages(res.data.messages || [])
    } catch {
      console.error('Failed to load messages')
    } finally {
      setFetching(false)
    }
  }, [tripId])

  const fetchTripDetails = useCallback(async () => {
    try {
      const res = await api.get(`/trips/${tripId}`)
      setTrip(res.data.trip)
    } catch {
      toast.error('Failed to load trip details')
    }
  }, [tripId])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user && tripId) {
      fetchTripDetails()
      fetchMessages()
      pollIntervalRef.current = setInterval(fetchMessages, 10000)
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [user, loading, tripId, fetchTripDetails, fetchMessages])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [messages])

  async function handleSendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSending(true)
    try {
      await api.post(`/messages/${tripId}`, { content: newMessage })
      setNewMessage('')
      await fetchMessages()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to send message'))
    } finally {
      setSending(false)
    }
  }

  if (loading || fetching) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--muted)' }}>Loading chat...</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ marginBottom: '16px' }}>Trip not found</p>
          <button className="btn-primary" onClick={() => router.push('/my-trips')}>Go Back</button>
        </div>
      </div>
    )
  }

  const driverId = trip.driverId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 68px)' }}>

      {/* ── Header ── */}
      <div style={{
        background:   'var(--bg-card)',
        borderBottom: '1px solid var(--border)',
        padding:      '16px 24px',
        flexShrink:   0,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '6px',
            color:      '#3b82f6',
            fontWeight: 600,
            fontSize:   '14px',
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            marginBottom: '12px',
            padding:    0,
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '22px', marginBottom: '8px' }}>
          Trip Chat
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted)' }}>
            <MapPin size={14} color="#3b82f6" />
            {trip.originCity} → {trip.destinationCity}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--muted)' }}>
            <Users size={14} color="#3b82f6" />
            {trip.driver?.name} (Driver)
          </span>
        </div>

        {/* Color legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
            <span style={{ color: 'var(--muted)' }}>You</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ color: 'var(--muted)' }}>Driver</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#64748b', display: 'inline-block' }} />
            <span style={{ color: 'var(--muted)' }}>Rider</span>
          </span>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{
        flex:       1,
        overflowY:  'auto',
        padding:    '20px 24px',
        display:    'flex',
        flexDirection: 'column',
        gap:        '12px',
      }}>
        {messages.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--muted)' }}>
            <Send size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const senderId = msg.senderId ?? msg.sender?.id
            const isMe     = !!user?.id && senderId === user.id
            const isDriver = !!trip?.driverId && senderId === trip.driverId

            // bubble colours
            const bg = isMe
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
                ? `${msg.sender?.name || 'Driver'} · Driver`
                : msg.sender?.name || 'Rider'

            const time = new Date(msg.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit', minute: '2-digit', hour12: true,
            })

            const initial = (msg.sender?.name || 'U')[0].toUpperCase()

            return (
              <div
                key={msg.id}
                style={{
                  display:        'flex',
                  justifyContent: isMe ? 'flex-end' : 'flex-start',
                  alignItems:     'flex-end',
                  gap:            '8px',
                }}
              >
                {/* Left avatar (others) */}
                {!isMe && (
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: avatarBg, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {initial}
                  </div>
                )}

                {/* Bubble */}
                <div style={{
                  maxWidth:     '65%',
                  background:   bg,
                  color:        '#fff',
                  padding:      '10px 14px',
                  borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  boxShadow:    '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                  {/* Name */}
                  <div style={{
                    fontSize:      '11px',
                    fontWeight:    700,
                    marginBottom:  '4px',
                    color:         'rgba(255,255,255,0.85)',
                    letterSpacing: '0.3px',
                  }}>
                    {label}
                  </div>

                  {/* Content */}
                  <div style={{
                    fontSize:  '14px',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </div>

                  {/* Time */}
                  <div style={{
                    fontSize:   '11px',
                    marginTop:  '6px',
                    color:      'rgba(255,255,255,0.65)',
                    textAlign:  'right',
                  }}>
                    {time}
                  </div>
                </div>

                {/* Right avatar (me) */}
                {isMe && (
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: avatarBg, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700, flexShrink: 0,
                  }}>
                    {(user?.name || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div style={{
        background:   'var(--bg-card)',
        borderTop:    '1px solid var(--border)',
        padding:      '16px 24px',
        flexShrink:   0,
      }}>
        <form
          onSubmit={handleSendMessage}
          style={{ display: 'flex', gap: '12px', alignItems: 'center' }}
        >
          <input
            className="input"
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            disabled={sending}
            style={{ flex: 1, borderRadius: '24px', padding: '12px 18px' }}
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={sending || !newMessage.trim()}
            style={{
              width: 'auto', padding: '12px 20px',
              borderRadius: '24px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <Send size={16} />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}
