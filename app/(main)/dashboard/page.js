'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/shared/AuthContext.js'
import { Search, Plus, BookOpen, Car, Wallet, Shield, Bell, MapPin } from 'lucide-react'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading])

  if (loading || !user) return <LoadingScreen />

  const isDriver = user.role === 'DRIVER' || user.role === 'BOTH'
  const isRider  = user.role === 'RIDER'  || user.role === 'BOTH'

  const riderActions = [
    { href: '/search',      icon: <Search size={22} color="#f59e0b" />,   label: 'Find a Ride',   desc: 'Search trips across cities',   accent: false },
    { href: '/my-bookings', icon: <BookOpen size={22} color="#3b82f6" />, label: 'My Bookings',   desc: 'View & manage your bookings',  accent: false },
    { href: '/alerts',      icon: <Bell size={22} color="#8b5cf6" />,     label: 'My Alerts',     desc: 'Trip & return notifications',  accent: false },
  ]

  const driverActions = [
    { href: '/my-trips',        icon: <Car size={22} color="#10b981" />,     label: 'My Trips',    desc: 'Manage your routes',          accent: false },
    { href: '/my-trips/create', icon: <Plus size={22} color="#fff" />,       label: 'Create Trip', desc: 'List a new journey',          accent: true  },
    { href: '/cars',            icon: <Car size={22} color="#f59e0b" />,     label: 'My Cars',     desc: 'Manage your vehicles',        accent: false },
    { href: '/wallet',          icon: <Wallet size={22} color="#10b981" />,  label: 'Earnings',    desc: 'Wallet & payouts',            accent: false },
  ]

  return (
    <div>
      {/* ── Hero greeting ── */}
      <div style={{
        background:   'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '20px',
        padding:      '36px 32px',
        marginBottom: '32px',
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* decorative circles */}
        <div style={{ position:'absolute', top:'-40px', right:'-40px', width:'180px', height:'180px', borderRadius:'50%', background:'rgba(245,159,11,0.08)' }} />
        <div style={{ position:'absolute', bottom:'-20px', right:'80px', width:'100px', height:'100px', borderRadius:'50%', background:'rgba(59,130,246,0.08)' }} />

        <div style={{ position:'relative' }}>
          <div style={{ fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'6px', fontWeight:500 }}>
            Good {getTimeOfDay()} ·{' '}
            <span style={{ color:'rgba(255,255,255,0.7)' }}>
              {new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long' })}
            </span>
          </div>
          <h1 style={{ fontFamily:'Syne', fontSize:'clamp(26px,4vw,36px)', fontWeight:800, color:'#fff', marginBottom:'12px' }}>
            Welcome back, {user.name.split(' ')[0]} 👋
          </h1>
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
            <span style={{
              background: user.role === 'DRIVER' ? 'rgba(245,159,11,0.2)' : user.role === 'BOTH' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
              color:      user.role === 'DRIVER' ? '#fbbf24' : user.role === 'BOTH' ? '#34d399' : '#60a5fa',
              padding:    '4px 12px', borderRadius:'100px', fontSize:'12px', fontWeight:700,
            }}>
              {user.role === 'BOTH' ? '🚗 Driver + Rider' : user.role === 'DRIVER' ? '🚗 Driver' : '👤 Rider'}
            </span>
            <span style={{ background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', padding:'4px 12px', borderRadius:'100px', fontSize:'12px' }}>
              {user.email}
            </span>
          </div>
        </div>
      </div>

      {/* ── Rider actions ── */}
      {isRider && (
        <section style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'var(--muted)', letterSpacing:'1px', marginBottom:'14px' }}>
            RIDER
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'14px' }}>
            {riderActions.map(a => <ActionCard key={a.href} {...a} />)}
          </div>
        </section>
      )}

      {/* ── Driver actions ── */}
      {isDriver && (
        <section style={{ marginBottom:'32px' }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:'var(--muted)', letterSpacing:'1px', marginBottom:'14px' }}>
            DRIVER
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'14px' }}>
            {driverActions.map(a => <ActionCard key={a.href} {...a} />)}
          </div>
        </section>
      )}

      {/* ── Common ── */}
      <section>
        <div style={{ fontSize:'11px', fontWeight:700, color:'var(--muted)', letterSpacing:'1px', marginBottom:'14px' }}>
          ACCOUNT
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'14px' }}>
          <ActionCard href="/safety" icon={<Shield size={22} color="#ef4444" />} label="Safety" desc="Emergency contact & SOS" />
        </div>
      </section>
    </div>
  )
}

function ActionCard({ href, icon, label, desc, accent }) {
  return (
    <Link href={href} style={{ textDecoration:'none' }}>
      <div style={{
        background:   accent ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--bg-card)',
        border:       accent ? 'none' : '1px solid var(--border)',
        borderRadius: '16px',
        padding:      '20px',
        cursor:       'pointer',
        transition:   'all 0.25s ease',
        boxShadow:    accent ? '0 4px 20px rgba(245,159,11,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
        display:      'flex',
        alignItems:   'center',
        gap:          '16px',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = accent
            ? '0 8px 28px rgba(245,159,11,0.4)'
            : '0 8px 24px rgba(59,130,246,0.12)'
          if (!accent) e.currentTarget.style.borderColor = 'var(--blue)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = accent ? '0 4px 20px rgba(245,159,11,0.3)' : '0 1px 3px rgba(0,0,0,0.06)'
          if (!accent) e.currentTarget.style.borderColor = 'var(--border)'
        }}
      >
        <div style={{
          width:'44px', height:'44px', borderRadius:'12px', flexShrink:0,
          background: accent ? 'rgba(0,0,0,0.15)' : 'var(--bg-input)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontFamily:'Syne', fontWeight:700, fontSize:'15px', color: accent ? '#000' : 'var(--text)', marginBottom:'2px' }}>
            {label}
          </div>
          <div style={{ fontSize:'12px', color: accent ? 'rgba(0,0,0,0.6)' : 'var(--muted)' }}>
            {desc}
          </div>
        </div>
      </div>
    </Link>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function LoadingScreen() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'var(--muted)', fontFamily:'Syne' }}>
      Loading...
    </div>
  )
}
