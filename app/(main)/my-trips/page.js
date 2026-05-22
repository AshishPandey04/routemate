'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api, { getErrorMessage } from '@/lib/api.js'
import { Plus, ArrowRight, Car, MapPin, Clock, Users, IndianRupee, Navigation, CheckCircle } from 'lucide-react'

export default function MyTripsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [trips,    setTrips]    = useState([])
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) fetchTrips()
  }, [user, loading])

  async function fetchTrips() {
    try {
      const res = await api.get('/trips/my-trips')
      setTrips(res.data.trips)
    } catch {
      toast.error('Failed to load trips')
    } finally {
      setFetching(false)
    }
  }

  async function startTrip(tripId) {
    try {
      await api.patch(`/trips/${tripId}/start`)
      toast.success('Trip started!')
      fetchTrips()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start trip'))
    }
  }

  async function completeTrip(tripId) {
    try {
      await api.patch(`/trips/${tripId}/complete`)
      toast.success('Trip completed!')
      fetchTrips()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to complete trip'))
    }
  }

  if (loading || fetching) return <Skeleton />

  const active    = trips.filter(t => t.status === 'IN_TRANSIT')
  const scheduled = trips.filter(t => t.status === 'SCHEDULED')
  const past      = trips.filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED')

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'32px', flexWrap:'wrap', gap:'16px' }}>
        <div>
          <h1 style={{ fontFamily:'Syne', fontSize:'32px', fontWeight:800, marginBottom:'4px' }}>My Trips</h1>
          <p style={{ color:'var(--muted)', fontSize:'14px' }}>{trips.length} trip{trips.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          className="btn-primary"
          style={{ width:'auto', padding:'10px 24px', display:'flex', alignItems:'center', gap:'8px' }}
          onClick={() => router.push('/my-trips/create')}
        >
          <Plus size={16} /> New Trip
        </button>
      </div>

      {trips.length === 0 ? (
        <EmptyState onAction={() => router.push('/my-trips/create')} />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'32px' }}>
          {active.length > 0 && (
            <TripGroup label="🟢 Active" trips={active} onStart={startTrip} onComplete={completeTrip} router={router} />
          )}
          {scheduled.length > 0 && (
            <TripGroup label="🕐 Scheduled" trips={scheduled} onStart={startTrip} onComplete={completeTrip} router={router} />
          )}
          {past.length > 0 && (
            <TripGroup label="Past" trips={past} onStart={startTrip} onComplete={completeTrip} router={router} />
          )}
        </div>
      )}
    </div>
  )
}

function TripGroup({ label, trips, onStart, onComplete, router }) {
  return (
    <div>
      <div style={{ fontSize:'11px', fontWeight:700, color:'var(--muted)', letterSpacing:'1px', marginBottom:'12px' }}>
        {label}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
        {trips.map(trip => (
          <TripCard key={trip.id} trip={trip} onStart={onStart} onComplete={onComplete} router={router} />
        ))}
      </div>
    </div>
  )
}

function TripCard({ trip, onStart, onComplete, router }) {
  const statusColor = {
    SCHEDULED:  { bg:'rgba(245,159,11,0.1)',  color:'#b45309',  label:'Scheduled'  },
    IN_TRANSIT: { bg:'rgba(16,185,129,0.1)',  color:'#047857',  label:'In Transit' },
    COMPLETED:  { bg:'rgba(100,116,139,0.1)', color:'#475569',  label:'Completed'  },
    CANCELLED:  { bg:'rgba(239,68,68,0.1)',   color:'#991b1b',  label:'Cancelled'  },
  }[trip.status] || { bg:'var(--bg-input)', color:'var(--muted)', label: trip.status }

  return (
    <div className="card" style={{ padding:'20px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'16px' }}>

        {/* Left info */}
        <div style={{ flex:1, minWidth:'200px' }}>
          {/* Route */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'12px' }}>
            <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:'18px' }}>{trip.originCity}</span>
            <ArrowRight size={16} color="var(--amber)" />
            <span style={{ fontFamily:'Syne', fontWeight:800, fontSize:'18px' }}>{trip.destinationCity}</span>
            <span style={{ background:statusColor.bg, color:statusColor.color, padding:'3px 10px', borderRadius:'100px', fontSize:'11px', fontWeight:700 }}>
              {statusColor.label}
            </span>
          </div>

          {/* Meta grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:'8px' }}>
            {[
              { icon:<Clock size={13} />,        text: new Date(trip.departureTime).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) },
              { icon:<Car size={13} />,           text: `${trip.car.make} ${trip.car.model} · ${trip.car.plateNumber}` },
              { icon:<Users size={13} />,         text: `${trip.bookingsCount} booking${trip.bookingsCount !== 1 ? 's' : ''}` },
              { icon:<IndianRupee size={13} />,   text: `₹${(trip.totalEarnings || 0).toLocaleString('en-IN')} earned` },
            ].map((m, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'var(--muted)' }}>
                {m.icon} {m.text}
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:'flex', flexDirection:'column', gap:'8px', alignItems:'flex-end' }}>
          {trip.status === 'SCHEDULED' && (
            <button className="btn-primary" style={{ width:'auto', padding:'9px 20px', fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}
              onClick={() => onStart(trip.id)}>
              <Navigation size={14} /> Start Trip
            </button>
          )}
          {trip.status === 'IN_TRANSIT' && (
            <>
              <button className="btn-primary" style={{ width:'auto', padding:'9px 20px', fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}
                onClick={() => router.push(`/track/${trip.id}`)}>
                <Navigation size={14} /> Live Track
              </button>
              <button className="btn-secondary" style={{ width:'auto', padding:'9px 20px', fontSize:'13px', display:'flex', alignItems:'center', gap:'6px' }}
                onClick={() => onComplete(trip.id)}>
                <CheckCircle size={14} /> Complete
              </button>
            </>
          )}
          <button
            onClick={() => router.push(`/my-trips/${trip.id}`)}
            style={{ background:'none', border:'none', cursor:'pointer', fontSize:'12px', color:'var(--muted)', padding:'4px 0' }}
          >
            View details →
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onAction }) {
  return (
    <div style={{ textAlign:'center', padding:'80px 24px' }}>
      <div style={{ width:'72px', height:'72px', background:'var(--bg-input)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
        <Car size={32} color="var(--muted)" />
      </div>
      <h2 style={{ fontFamily:'Syne', fontWeight:700, fontSize:'20px', marginBottom:'8px' }}>No trips yet</h2>
      <p style={{ color:'var(--muted)', fontSize:'14px', marginBottom:'24px' }}>Create your first trip and start earning</p>
      <button className="btn-primary" style={{ width:'auto', padding:'12px 28px' }} onClick={onAction}>
        Create Your First Trip
      </button>
    </div>
  )
}

function Skeleton() {
  return (
    <div>
      <div style={{ height:'40px', background:'var(--bg-input)', borderRadius:'8px', marginBottom:'32px', width:'200px' }} />
      {[1,2,3].map(i => (
        <div key={i} style={{ height:'120px', background:'var(--bg-input)', borderRadius:'16px', marginBottom:'12px', opacity: 1 - i * 0.2 }} />
      ))}
    </div>
  )
}
