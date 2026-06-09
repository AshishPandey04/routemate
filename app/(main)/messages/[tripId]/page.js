'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Send, MapPin, Users, ArrowLeft } from 'lucide-react'

export default function MessagesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const tripId = params.tripId

  const [messages, setMessages] = useState([])
  const [trip, setTrip] = useState(null)
  const [participants, setParticipants] = useState([])
  const [fetching, setFetching] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)
  const pollIntervalRef = useRef(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user && tripId) {
      fetchTripDetails()
      fetchMessages()
      // Poll for new messages every 10 seconds (was 2s - too aggressive)
      pollIntervalRef.current = setInterval(fetchMessages, 10000)
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    }
  }, [user, loading, tripId])

  // Auto-scroll to bottom - use instant scroll to avoid performance hit
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' })
    }
  }, [messages])

  async function fetchTripDetails() {
    try {
      const res = await api.get(`/trips/${tripId}`)
      setTrip(res.data.trip)

      // Fetch trip bookings to get participants
      const bookingsRes = await api.get(`/trips/${tripId}/bookings`)
      const uniqueParticipants = [
        res.data.trip.driver,
        ...bookingsRes.data.bookings.map(b => b.user)
      ].filter((u, i, arr) => i === arr.findIndex(a => a.id === u.id))
      
      setParticipants(uniqueParticipants)
    } catch (err) {
      toast.error('Failed to load trip details')
    }
  }

  async function fetchMessages() {
    try {
      const res = await api.get(`/messages/${tripId}`)
      setMessages(res.data.messages || [])
    } catch (err) {
      console.error('Failed to load messages')
    } finally {
      setFetching(false)
    }
  }

  async function handleSendMessage(e) {
    e.preventDefault()
    if (!newMessage.trim()) return

    setSending(true)
    try {
      await api.post(`/messages/${tripId}`, {
        content: newMessage
      })
      setNewMessage('')
      await fetchMessages()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading chat...</div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <p className="text-gray-700 mb-4">Trip not found</p>
          <Button onClick={() => router.push('/my-trips')}>
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-start justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#0f172a' }}>Trip Chat</h1>

            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {trip.originCity} → {trip.destinationCity}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        <div className="max-w-4xl mx-auto w-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Send className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-center">No messages yet. Start a conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderId === user.id ? 'justify-end' : 'justify-start'
                } mb-4`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    message.senderId === user.id
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-200 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p className="text-xs font-semibold mb-1 opacity-90">
                    {message.sender?.name || 'User'}
                  </p>
                  <p className="wrap-break-word text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.senderId === user.id ? 'text-blue-100' : 'text-gray-600'
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <Input
              type="text"
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              style={{
                borderRadius: '12px',
                borderWidth: '2px',
                padding: '12px 16px',
                fontSize: '14px',
              }}
            />
            <Button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="gap-2"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                borderRadius: '12px',
                padding: '12px 20px',
                fontWeight: 600,
              }}
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
