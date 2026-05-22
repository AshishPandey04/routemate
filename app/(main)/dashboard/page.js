'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/components/shared/AuthContext.js'
import { Search, Plus, BookOpen, Car } from 'lucide-react'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading])

  if (loading || !user) return <LoadingScreen />

  const isDriver = user.role === 'DRIVER' || user.role === 'BOTH'

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '4px' }}>
          Good {getTimeOfDay()},
        </p>
        <h1 style={{
          fontFamily: 'Syne',
          fontSize:   '32px',
          fontWeight: 800,
        }}>
          {user.name} 👋
        </h1>
      </div>

      {/* Quick Actions */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`,
        gap:                 '16px',
        marginBottom:        '40px',
      }}>
        <Link href="/search" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            cursor:     'pointer',
            transition: 'border-color 0.2s',
            display:    'flex',
            alignItems: 'center',
            gap:        '16px',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{
              width:      '48px',
              height:     '48px',
              background: 'rgba(245,159,11,0.15)',
              borderRadius: '12px',
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Search size={22} color="var(--amber)" />
            </div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '4px' }}>
                Find a Ride
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Search across cities
              </div>
            </div>
          </div>
        </Link>

        <Link href="/my-bookings" style={{ textDecoration: 'none' }}>
          <div className="card" style={{
            cursor:     'pointer',
            transition: 'border-color 0.2s',
            display:    'flex',
            alignItems: 'center',
            gap:        '16px',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{
              width:      '48px',
              height:     '48px',
              background: 'rgba(245,159,11,0.15)',
              borderRadius: '12px',
              display:    'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <BookOpen size={22} color="var(--amber)" />
            </div>
            <div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '4px' }}>
                My Bookings
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                View your trips
              </div>
            </div>
          </div>
        </Link>

        {isDriver && (
          <>
            <Link href="/my-trips" style={{ textDecoration: 'none' }}>
              <div className="card" style={{
                cursor:     'pointer',
                transition: 'border-color 0.2s',
                display:    'flex',
                alignItems: 'center',
                gap:        '16px',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--amber)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{
                  width:      '48px',
                  height:     '48px',
                  background: 'rgba(245,159,11,0.15)',
                  borderRadius: '12px',
                  display:    'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Car size={22} color="var(--amber)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '4px' }}>
                    My Trips
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    Manage your routes
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/my-trips/create" style={{ textDecoration: 'none' }}>
              <div style={{
                background:   'var(--amber)',
                borderRadius: '12px',
                padding:      '24px',
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
                gap:          '16px',
                transition:   'opacity 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div style={{
                  width:      '48px',
                  height:     '48px',
                  background: 'rgba(0,0,0,0.15)',
                  borderRadius: '12px',
                  display:    'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Plus size={22} color="#000" />
                </div>
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, color: '#000', marginBottom: '4px' }}>
                    Create Trip
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(0,0,0,0.6)' }}>
                    List a new journey
                  </div>
                </div>
              </div>
            </Link>
          </>
        )}
      </div>

      {/* Role Badge */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <span className={`badge ${user.role === 'DRIVER' ? 'badge-amber' : user.role === 'BOTH' ? 'badge-green' : 'badge-muted'}`}>
          {user.role === 'BOTH' ? '🚗 Driver + Rider' : user.role === 'DRIVER' ? '🚗 Driver' : '👤 Rider'}
        </span>
        <span className="badge badge-muted">
          {user.email}
        </span>
      </div>
    </div>
  )
}

function getTimeOfDay() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

function LoadingScreen() {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      height:         '60vh',
      color:          'var(--muted)',
      fontFamily:     'Syne',
    }}>
      Loading...
    </div>
  )
}