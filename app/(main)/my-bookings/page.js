'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api, { getErrorMessage } from '@/lib/api.js'
import { ArrowRight, MapPin, Navigation, Star, X, AlertCircle, Car, Clock, Users } from 'lucide-react'

export default function MyBookingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [bookings,         setBookings]         = useState([])
  const [fetching,         setFetching]         = useState(true)
  const [ratingBooking,    setRatingBooking]    = useState(null)
  const [ratingForm,       setRatingForm]       = useState({ score: 5, comment: '' })
  const [submittingRating, setSubmittingRating] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) fetchBookings()
  }, [user, loading])

  async function fetchBookings() {
    try {
      setFetching(true)
      const res = await api.get('/bookings/my-bookings')
      setBookings(res.data.bookings)
    } catch {
      toast.error('Failed to load bookings')
    } finally {
      setFetching(false)
    }
  }

  async function cancelBooking(bookingId) {
    if (!confirm('Cancel this booking?')) return
    try {
      const res = await api.post(`/bookings/${bookingId}/cancel`)
      toast.success(`Booking cancelled. Refund: ₹${res.data.refundAmount ?? 0}`)
      setBookings(prev => prev.filter(b => b.id !== bookingId))
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to cancel'))
    }
  }

  async function fileDispute(bookingId) {
    const reason = prompt('Describe the issue (min 10 characters):')
    if (!reason || reason.length < 10) { toast.error('Please provide a longer description'); return }
    try {
      await api.post('/disputes', { bookingId, reason })
      toast.success('Dispute submitted. Admin will review within 48 hours.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not submit dispute'))
    }
  }

  async function submitRating(e) {
    e.preventDefault()
    if (!ratingBooking) return
    setSubmittingRating(true)
    try {
      await api.post('/ratings', { bookingId: ratingBooking.id, score: ratingForm.score, comment: ratingForm.comment || undefined })
      toast.success('Thanks for your rating!')
      setRatingBooking(null)
      setRatingForm({ score: 5, comment: '' })
      fetchBookings()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit rating'))
    } finally {
      setSubmittingRating(false)
    }
  }

  if (loading || fetching) return <Skeleton />

  const confirmed  = bookings.filter(b => b.status === 'CONFIRMED')
  const completed  = bookings.filter(b => b.status === 'COMPLETED')
  const cancelled  = bookings.filter(b => b.status === 'CANCELLED')

  return (
    <div>
      <h1 style={{ fontFamily:'Syne', fontSize:'32px', fontWeight:800, marginBottom:'4px' }}>My Bookings</h1>
      <p style={{ color:'var(--muted)', fontSize:'14px', marginBottom:'32px' }}>
        {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
      </p>

      {bookings.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 24px' }}>
          <div style={{ width:'72px', height:'72px', background:'var(--bg-input)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <MapPin size={32} color="var(--muted)" />
          </div>
          <h2 style={{ fontFamily:'Syne', fontWeight:700, fontSize:'20px', marginBottom:'8px' }}>No bookings yet</h2>
          <p style={{ color:'var(--muted)', fontSize:'14px', marginBottom:'24px' }}>Find a trip and book your seat</p>
          <button className="btn-primary" style={{ width:'auto', padding:'12px 28px' }} onClick={() => router.push('/search')}>
            Find a Ride
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'32px' }}>
          {confirmed.length > 0 && <BookingGroup label="✅ Confirmed" bookings={confirmed} onCancel={cancelBooking} onDispute={fileDispute} onRate={b => { setRatingBooking(b); setRatingForm({ score:5, comment:'' }) }} router={router} />}
          {completed.length > 0 && <BookingGroup label="🏁 Completed" bookings={completed} onCancel={cancelBooking} onDispute={fileDispute} onRate={b => { setRatingBooking(b); setRatingForm({ score:5, comment:'' }) }} router={router} />}
          {cancelled.length > 0 && <BookingGroup label="Cancelled"   bookings={cancelled} onCancel={cancelBooking} onDispute={fileDispute} onRate={b => { setRatingBooking(b); setRatingForm({ score:5, comment:'' }) }} router={router} />}
        </div>
      )}

      {/* Rating Modal */}
      {ratingBooking && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200, padding:'24px' }}>
          <div className="card" style={{ width:'100%', maxWidth:'420px', position:'relative' }}>
            <button type="button" onClick={() => setRatingBooking(null)}
              style={{ position:'absolute', top:'16px', right:'16px', background:'none', border:'none', cursor:'pointer', color:'var(--muted)' }}>
              <X size={20} />
            </button>
            <h2 style={{ fontFamily:'Syne', fontWeight:700, marginBottom:'6px' }}>Rate your trip</h2>
            <p style={{ color:'var(--muted)', fontSize:'13px', marginBottom:'20px' }}>
              {ratingBooking.boardingCity} → {ratingBooking.alightingCity} with {ratingBooking.trip.driver.name}
            </p>
            <form onSubmit={submitRating} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
              <div>
                <div style={{ fontSize:'12px', color:'var(--muted)', marginBottom:'10px', fontWeight:600 }}>SCORE</div>
                <div style={{ display:'flex', gap:'8px' }}>
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setRatingForm({ ...ratingForm, score:n })}
                      style={{ background: ratingForm.score >= n ? 'var(--amber)' : 'var(--bg-input)', border:'1px solid var(--border)', borderRadius:'10px', width:'48px', height:'48px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.15s' }}>
                      <Star size={20} color={ratingForm.score >= n ? '#000' : 'var(--muted)'} fill={ratingForm.score >= n ? '#000' : 'none'} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'var(--muted)', marginBottom:'8px', fontWeight:600 }}>COMMENT (OPTIONAL)</div>
                <textarea className="input" rows={3} placeholder="How was the ride?" value={ratingForm.comment}
                  onChange={e => setRatingForm({ ...ratingForm, comment:e.target.value })} style={{ resize:'vertical' }} />
              </div>
              <button type="submit" className="btn-primary" disabled={submittingRating}>
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function BookingGroup({ label, bookings, onCancel, onDispute, onRate, router }) {
  return (
    <div>
      <div style={{ fontSize:'11px', fontWeight:700, color:'var(--muted)', letterSpacing:'1px', marginBottom:'12px' }}>{label}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {bookings.map(b => <BookingCard key={b.id} booking={b} onCancel={onCancel} onDispute={onDispute} onRate={onRate} router={router} />)}
      </div>
    </div>
  )
}

function BookingCard({ booking: b, onCancel, onDispute, onRate, router }) {
  const statusStyle = {
    CONFIRMED: { bg:'rgba(16,185,129,0.1)',  color:'#047857' },
    COMPLETED: { bg:'rgba(245,159,11,0.1)',  color:'#b45309' },
    CANCELLED: { bg:'rgba(239,68,68,0.1)',   color:'#991b1b' },
  }[b.status] || { bg:'var(--bg-input)', color:'var(--muted)' }

  return (
    <div className="card" style={{ padding:'20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'16px' }}>

        {/* Left */}
        <div style={{ flex:1, minWidth:'200px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
            <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:'17px' }}>{b.boardingCity}</span>
            <ArrowRight size={14} color="var(--amber)" />
            <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:'17px' }}>{b.alightingCity}</span>
            <span style={{ background:statusStyle.bg, color:statusStyle.color, padding:'3px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:700 }}>
              {b.status}
            </span>
            {b.rating && (
              <span style={{ display:'flex', alignItems:'center', gap:'4px', background:'rgba(245,159,11,0.1)', color:'#b45309', padding:'3px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:700 }}>
                <Star size={10} fill="#b45309" color="#b45309" /> {b.rating.score}/5
              </span>
            )}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'6px' }}>
            {[
              { icon:<Car size={12} />,   text:`${b.trip.car.make} ${b.trip.car.model}` },
              { icon:<Users size={12} />, text:`${b.trip.driver.name}${b.trip.driver.phone ? ' · ' + b.trip.driver.phone : ''}` },
              { icon:<Clock size={12} />, text: new Date(b.trip.departureTime).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) },
              { icon:<Users size={12} />, text:`${b.seatsBooked} seat${b.seatsBooked > 1 ? 's' : ''}` },
            ].map((m, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'var(--muted)' }}>
                {m.icon} {m.text}
              </div>
            ))}
          </div>
        </div>

        {/* Right */}
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:'24px', color:'var(--amber)', marginBottom:'12px' }}>
            ₹{b.totalAmount.toLocaleString('en-IN')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', alignItems:'flex-end' }}>
            {(b.trip.status === 'IN_TRANSIT' || b.trip.status === 'SCHEDULED') && b.status === 'CONFIRMED' && (
              <button className="btn-primary" style={{ width:'auto', padding:'8px 16px', fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}
                onClick={() => router.push(`/track/${b.trip.id}`)}>
                <Navigation size={13} />
                {b.trip.status === 'IN_TRANSIT' ? 'Track Live' : 'Trip Chat'}
              </button>
            )}
            {b.status === 'CONFIRMED' && b.trip.status === 'SCHEDULED' && (
              <button className="btn-secondary" style={{ width:'auto', padding:'8px 16px', fontSize:'13px' }} onClick={() => onCancel(b.id)}>
                Cancel
              </button>
            )}
            {(b.status === 'CONFIRMED' || b.status === 'CANCELLED') && (
              <button onClick={() => onDispute(b.id)}
                style={{ background:'none', border:'1px solid var(--border)', borderRadius:'8px', cursor:'pointer', padding:'8px 14px', fontSize:'12px', color:'var(--muted)', display:'flex', alignItems:'center', gap:'5px' }}>
                <AlertCircle size={13} /> Dispute
              </button>
            )}
            {b.status === 'COMPLETED' && !b.rating && (
              <button className="btn-secondary" style={{ width:'auto', padding:'8px 16px', fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}
                onClick={() => onRate(b)}>
                <Star size={13} color="var(--amber)" /> Rate Driver
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div>
      <div style={{ height:'40px', background:'var(--bg-input)', borderRadius:'8px', marginBottom:'32px', width:'200px' }} />
      {[1,2,3].map(i => (
        <div key={i} style={{ height:'130px', background:'var(--bg-input)', borderRadius:'16px', marginBottom:'12px', opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  )
}
