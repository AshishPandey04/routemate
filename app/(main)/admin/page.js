'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api, { getErrorMessage } from '@/lib/api.js'
import {
  LayoutDashboard,
  AlertCircle,
  XCircle,
  Wallet,
  Shield,
} from 'lucide-react'

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'disputes', label: 'Disputes', icon: AlertCircle },
  { id: 'cancelled', label: 'Cancelled trips', icon: XCircle },
  { id: 'payouts', label: 'Payouts', icon: Wallet },
]

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [disputes, setDisputes] = useState([])
  const [cancelled, setCancelled] = useState([])
  const [payouts, setPayouts] = useState([])
  const [reconciliation, setReconciliation] = useState(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (!loading && user && !user.isAdmin) {
      toast.error('Admin access only')
      router.push('/dashboard')
    }
  }, [user, loading])

  useEffect(() => {
    if (user?.isAdmin) loadTab(tab)
  }, [user, tab])

  async function loadTab(t) {
    try {
      if (t === 'overview') {
        const res = await api.get('/admin/overview')
        setOverview(res.data)
      } else if (t === 'disputes') {
        const res = await api.get('/admin/disputes')
        setDisputes(res.data.disputes)
      } else if (t === 'cancelled') {
        const res = await api.get('/admin/cancelled-trips')
        setCancelled(res.data.trips)
      } else if (t === 'payouts') {
        const res = await api.get('/admin/payouts')
        setPayouts(res.data.payouts)
        setReconciliation(res.data.reconciliation)
      }
    } catch {
      toast.error('Failed to load admin data')
    }
  }

  async function resolveDispute(id, status) {
    try {
      await api.patch(`/admin/disputes/${id}`, {
        status,
        resolution: status === 'RESOLVED' ? 'Resolved by admin' : undefined,
        adminNote: `Marked ${status}`,
      })
      toast.success('Dispute updated')
      loadTab('disputes')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Update failed'))
    }
  }

  async function processPayout(id, status) {
    const bankRef = status === 'PAID' ? prompt('Bank / UTR reference (optional)') : null
    try {
      await api.patch(`/admin/payouts/${id}`, {
        status,
        bankRef: bankRef || undefined,
        adminNote: `Admin marked ${status}`,
      })
      toast.success('Payout updated')
      loadTab('payouts')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Update failed'))
    }
  }

  if (loading || !user?.isAdmin) {
    return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading…</div>
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
        Admin dashboard
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '24px' }}>
        Disputes, cancelled trips, payout reconciliation, and SOS alerts.
      </p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: tab === id ? '2px solid var(--blue)' : '1px solid var(--border)',
              background: tab === id ? 'rgba(59,130,246,0.1)' : 'var(--bg-card)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              ['Open disputes', overview.stats.openDisputes],
              ['Cancelled trips', overview.stats.cancelledTrips],
              ['Pending payouts', overview.stats.pendingPayouts],
              ['Pending payout ₹', overview.stats.pendingPayoutAmount],
              ['Gross revenue', `₹${overview.stats.grossRevenue?.toLocaleString('en-IN')}`],
              ['Est. platform fees', `₹${overview.stats.estimatedPlatformFees?.toLocaleString('en-IN')}`],
            ].map(([label, val]) => (
              <div key={label} className="card">
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{label}</div>
                <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '22px' }}>{val}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--red)" /> Recent SOS alerts
            </h2>
            {overview.recentSos?.length === 0 ? (
              <p style={{ color: 'var(--muted)' }}>No SOS alerts</p>
            ) : (
              overview.recentSos.map((s) => (
                <div key={s.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: '14px' }}>
                  <strong>{s.user.name}</strong> on {s.trip.originCity} → {s.trip.destinationCity}
                  <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                    {new Date(s.createdAt).toLocaleString('en-IN')}
                    {s.lat != null && ` · ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'disputes' && (
        <div className="card">
          {disputes.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>No disputes</p>
          ) : (
            disputes.map((d) => (
              <div key={d.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <span className={`badge badge-amber`}>{d.status}</span>
                  <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {new Date(d.createdAt).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <p style={{ margin: '8px 0', fontSize: '14px' }}>{d.reason}</p>
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {d.reporter.name} · Booking ₹{d.booking.totalAmount} ·{' '}
                  {d.booking.trip.originCity} → {d.booking.trip.destinationCity}
                </p>
                {d.status === 'OPEN' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button type="button" className="btn-primary" style={{ width: 'auto', padding: '8px 12px', fontSize: '12px' }} onClick={() => resolveDispute(d.id, 'UNDER_REVIEW')}>
                      Review
                    </button>
                    <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '8px 12px', fontSize: '12px' }} onClick={() => resolveDispute(d.id, 'RESOLVED')}>
                      Resolve
                    </button>
                    <button type="button" style={{ width: 'auto', padding: '8px 12px', fontSize: '12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer' }} onClick={() => resolveDispute(d.id, 'REJECTED')}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'cancelled' && (
        <div className="card">
          {cancelled.map((t) => (
            <div key={t.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
              <strong>{t.originCity} → {t.destinationCity}</strong>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
                Driver: {t.driver.name} · {t.cancellationNote || 'No reason'}
              </div>
              <div style={{ fontSize: '13px', marginTop: '8px' }}>
                Reconciliation: bookings ₹{t.reconciliation.bookingTotal} · refunds ₹
                {t.reconciliation.refundTotal} · net ₹{t.reconciliation.netRetained}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'payouts' && (
        <div>
          {reconciliation && (
            <p style={{ color: 'var(--muted)', marginBottom: '16px', fontSize: '14px' }}>
              Gross payments: ₹{reconciliation.grossPayments?.toLocaleString('en-IN')} · Driver share:{' '}
              {(reconciliation.driverShareRate * 100).toFixed(0)}%
            </p>
          )}
          <div className="card">
            {payouts.map((p) => (
              <div key={p.id} style={{ padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>₹{p.amount.toLocaleString('en-IN')}</span>
                  <span className="badge badge-amber">{p.status}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  {p.wallet.user.name} · {p.wallet.user.email}
                </div>
                {p.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                    <button type="button" className="btn-primary" style={{ width: 'auto', padding: '8px 12px', fontSize: '12px' }} onClick={() => processPayout(p.id, 'PAID')}>
                      Mark paid
                    </button>
                    <button type="button" className="btn-secondary" style={{ width: 'auto', padding: '8px 12px', fontSize: '12px' }} onClick={() => processPayout(p.id, 'REJECTED')}>
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
