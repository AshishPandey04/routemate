'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api, { getErrorMessage } from '@/lib/api.js'
import { Wallet, IndianRupee, Clock, ArrowDownToLine, TrendingUp } from 'lucide-react'

export default function WalletPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [wallet,        setWallet]        = useState(null)
  const [payoutAmount,  setPayoutAmount]  = useState('')
  const [submitting,    setSubmitting]    = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user && !['DRIVER', 'BOTH', 'ADMIN'].includes(user.role)) router.push('/dashboard')
    if (user) fetchWallet()
  }, [user, loading])

  async function fetchWallet() {
    try {
      const res = await api.get('/wallet')
      setWallet(res.data.wallet)
    } catch {
      toast.error('Failed to load wallet')
    }
  }

  async function requestPayout(e) {
    e.preventDefault()
    const amount = parseFloat(payoutAmount)
    if (!amount || amount < 100) { toast.error('Minimum payout is ₹100'); return }
    setSubmitting(true)
    try {
      await api.post('/wallet/payouts', { amount })
      toast.success('Payout requested')
      setPayoutAmount('')
      fetchWallet()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Payout request failed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !wallet) return <Skeleton />

  const stats = [
    { icon:<Wallet size={20} color="#10b981" />,      label:'Available',         value:`₹${wallet.balance.toLocaleString('en-IN')}`,              accent:'#10b981', bg:'rgba(16,185,129,0.08)' },
    { icon:<Clock size={20} color="#f59e0b" />,        label:'Pending',           value:`₹${wallet.pendingBalance.toLocaleString('en-IN')}`,        accent:'#f59e0b', bg:'rgba(245,159,11,0.08)' },
    { icon:<TrendingUp size={20} color="#3b82f6" />,   label:'Lifetime Earnings', value:`₹${(wallet.totalEarnings||0).toLocaleString('en-IN')}`,    accent:'#3b82f6', bg:'rgba(59,130,246,0.08)' },
  ]

  return (
    <div style={{ maxWidth:'760px' }}>
      <h1 style={{ fontFamily:'Syne', fontSize:'32px', fontWeight:800, marginBottom:'4px' }}>Driver Earnings</h1>
      <p style={{ color:'var(--muted)', fontSize:'14px', marginBottom:'32px' }}>
        85% of each booking goes to you after trip completion · 15% platform fee
      </p>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'16px', marginBottom:'28px' }}>
        {stats.map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.accent}22`, borderRadius:'16px', padding:'20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
              {s.icon}
              <span style={{ fontSize:'12px', color:'var(--muted)', fontWeight:600 }}>{s.label}</span>
            </div>
            <div style={{ fontFamily:'Syne', fontWeight:800, fontSize:'28px', color:s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Payout request */}
      <div className="card" style={{ marginBottom:'24px' }}>
        <h2 style={{ fontFamily:'Syne', fontWeight:700, fontSize:'18px', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
          <ArrowDownToLine size={18} color="var(--blue)" /> Request Payout
        </h2>
        <form onSubmit={requestPayout} style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
          <input
            className="input"
            type="number"
            min="100"
            step="1"
            placeholder="Amount (min ₹100)"
            value={payoutAmount}
            onChange={e => setPayoutAmount(e.target.value)}
            style={{ flex:'1 1 200px' }}
          />
          <button type="submit" className="btn-primary" disabled={submitting} style={{ width:'auto', padding:'12px 28px' }}>
            {submitting ? 'Requesting…' : 'Withdraw'}
          </button>
        </form>
      </div>

      {/* Payout history */}
      <div className="card" style={{ marginBottom:'24px' }}>
        <h2 style={{ fontFamily:'Syne', fontWeight:700, fontSize:'18px', marginBottom:'16px' }}>Payout History</h2>
        {!wallet.payouts?.length ? (
          <p style={{ color:'var(--muted)', fontSize:'14px' }}>No payouts yet</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
            {wallet.payouts.map((p, i) => (
              <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom: i < wallet.payouts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontFamily:'Syne', fontWeight:700 }}>₹{p.amount.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize:'12px', color:'var(--muted)' }}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</div>
                </div>
                <span style={{
                  background: p.status === 'PAID' ? 'rgba(16,185,129,0.1)' : p.status === 'REJECTED' ? 'rgba(239,68,68,0.1)' : 'rgba(245,159,11,0.1)',
                  color:      p.status === 'PAID' ? '#047857' : p.status === 'REJECTED' ? '#991b1b' : '#b45309',
                  padding:'4px 12px', borderRadius:'100px', fontSize:'12px', fontWeight:700,
                }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="card">
        <h2 style={{ fontFamily:'Syne', fontWeight:700, fontSize:'18px', marginBottom:'16px' }}>Recent Transactions</h2>
        {!wallet.transactions?.length ? (
          <p style={{ color:'var(--muted)', fontSize:'14px' }}>No transactions yet</p>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:'0' }}>
            {wallet.transactions.map((t, i) => (
              <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom: i < wallet.transactions.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <div style={{ fontSize:'14px', fontWeight:500 }}>{t.description || t.type}</div>
                  <div style={{ fontSize:'12px', color:'var(--muted)' }}>
                    {new Date(t.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })} · {t.type}
                  </div>
                </div>
                <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:'16px', color: t.amount >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {t.amount >= 0 ? '+' : ''}₹{Math.abs(t.amount).toLocaleString('en-IN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ maxWidth:'760px' }}>
      <div style={{ height:'40px', background:'var(--bg-input)', borderRadius:'8px', marginBottom:'32px', width:'200px' }} />
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'16px', marginBottom:'28px' }}>
        {[1,2,3].map(i => <div key={i} style={{ height:'100px', background:'var(--bg-input)', borderRadius:'16px' }} />)}
      </div>
      <div style={{ height:'120px', background:'var(--bg-input)', borderRadius:'16px' }} />
    </div>
  )
}
