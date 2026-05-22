'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api, { getErrorMessage } from '@/lib/api.js'
import { Bell, MapPin, Calendar, Trash2, RotateCcw, Search } from 'lucide-react'

export default function AlertsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [alerts,   setAlerts]   = useState([])
  const [fetching, setFetching] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) fetchAlerts()
  }, [user, loading])

  async function fetchAlerts() {
    try {
      setFetching(true)
      const [routeRes, returnRes] = await Promise.allSettled([
        api.get('/alerts/route'),
        api.get('/alerts/return'),
      ])
      const all = [
        ...(routeRes.status  === 'fulfilled' ? routeRes.value.data.alerts?.map(a => ({ ...a, type:'ROUTE'  })) || [] : []),
        ...(returnRes.status === 'fulfilled' ? returnRes.value.data.alerts?.map(a => ({ ...a, type:'RETURN' })) || [] : []),
      ]
      setAlerts(all)
    } catch {
      toast.error('Failed to load alerts')
    } finally {
      setFetching(false)
    }
  }

  async function deleteAlert(alertId, type) {
    if (!confirm('Delete this alert?')) return
    setDeleting(alertId)
    try {
      const endpoint = type === 'ROUTE' ? '/alerts/route' : '/alerts/return'
      await api.delete(`${endpoint}/${alertId}`)
      toast.success('Alert deleted')
      fetchAlerts()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete alert'))
    } finally {
      setDeleting(null)
    }
  }

  if (loading || fetching) return <Skeleton />

  const routeAlerts  = alerts.filter(a => a.type === 'ROUTE')
  const returnAlerts = alerts.filter(a => a.type === 'RETURN')

  return (
    <div style={{ maxWidth:'720px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'8px' }}>
        <div style={{ width:'44px', height:'44px', background:'rgba(59,130,246,0.1)', borderRadius:'12px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Bell size={22} color="var(--blue)" />
        </div>
        <div>
          <h1 style={{ fontFamily:'Syne', fontSize:'28px', fontWeight:800 }}>My Alerts</h1>
          <p style={{ color:'var(--muted)', fontSize:'13px' }}>{alerts.length} active alert{alerts.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <p style={{ color:'var(--muted)', fontSize:'14px', marginBottom:'32px' }}>
        We'll notify you when a matching trip becomes available.
      </p>

      {alerts.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 24px' }}>
          <div style={{ width:'72px', height:'72px', background:'var(--bg-input)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <Bell size={32} color="var(--muted)" />
          </div>
          <h2 style={{ fontFamily:'Syne', fontWeight:700, fontSize:'20px', marginBottom:'8px' }}>No alerts yet</h2>
          <p style={{ color:'var(--muted)', fontSize:'14px', marginBottom:'24px' }}>
            Search for a trip and set an alert when no results are found
          </p>
          <button className="btn-primary" style={{ width:'auto', padding:'12px 28px' }} onClick={() => router.push('/search')}>
            Search Trips
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'32px' }}>
          {routeAlerts.length > 0 && (
            <AlertGroup
              label="🔔 Route Alerts"
              desc="Notify when a car is available on this route"
              alerts={routeAlerts}
              onDelete={deleteAlert}
              deleting={deleting}
              renderMeta={a => (
                <>
                  <MetaRow icon={<MapPin size={13} />}    text={`${a.fromCity} → ${a.toCity}`} />
                  <MetaRow icon={<Calendar size={13} />}  text={new Date(a.date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })} />
                </>
              )}
            />
          )}
          {returnAlerts.length > 0 && (
            <AlertGroup
              label="↩️ Return Alerts"
              desc="Notify when driver confirms return trip"
              alerts={returnAlerts}
              onDelete={deleteAlert}
              deleting={deleting}
              renderMeta={a => (
                <>
                  <MetaRow icon={<MapPin size={13} />}    text={`${a.returnSlot?.returnOrigin} → ${a.returnSlot?.returnDestination}`} />
                  <MetaRow icon={<Calendar size={13} />}  text={new Date(a.returnSlot?.estimatedReturnDate).toLocaleDateString('en-IN', { day:'numeric', month:'long' })} />
                </>
              )}
            />
          )}
        </div>
      )}
    </div>
  )
}

function AlertGroup({ label, desc, alerts, onDelete, deleting, renderMeta }) {
  return (
    <div>
      <div style={{ fontSize:'11px', fontWeight:700, color:'var(--muted)', letterSpacing:'1px', marginBottom:'12px' }}>{label}</div>
      <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
        {alerts.map(alert => (
          <div key={alert.id} className="card" style={{ padding:'18px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'14px', flex:1 }}>
              <div style={{ width:'40px', height:'40px', background:'rgba(59,130,246,0.08)', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Bell size={18} color="var(--blue)" />
              </div>
              <div>
                <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:'14px', marginBottom:'6px' }}>
                  {alert.type === 'ROUTE' ? 'Route Alert' : 'Return Alert'}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:'3px' }}>
                  {renderMeta(alert)}
                </div>
              </div>
            </div>
            <button
              onClick={() => onDelete(alert.id, alert.type)}
              disabled={deleting === alert.id}
              style={{ background:'none', border:'none', cursor:'pointer', color:'var(--muted)', padding:'8px', borderRadius:'8px', transition:'color 0.2s', flexShrink:0 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetaRow({ icon, text }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', color:'var(--muted)' }}>
      {icon} {text}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ maxWidth:'720px' }}>
      <div style={{ height:'40px', background:'var(--bg-input)', borderRadius:'8px', marginBottom:'32px', width:'200px' }} />
      {[1,2,3].map(i => <div key={i} style={{ height:'80px', background:'var(--bg-input)', borderRadius:'16px', marginBottom:'10px', opacity: 1 - i * 0.2 }} />)}
    </div>
  )
}
