'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthContext.js'
import { Menu, X, Car, MapPin } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const router           = useRouter()
  const [open, setOpen]  = useState(false)

  return (
    <nav style={{
      background:   'rgba(15,15,15,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      position:     'sticky',
      top:          0,
      zIndex:       100,
    }}>
      <div style={{
        maxWidth: '1200px',
        margin:   '0 auto',
        padding:  '0 24px',
        height:   '64px',
        display:  'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <Link href="/" style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '8px',
          textDecoration: 'none',
        }}>
          <div style={{
            width:      '32px',
            height:     '32px',
            background: 'var(--amber)',
            borderRadius: '8px',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Car size={18} color="#000" />
          </div>
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize:   '20px',
            color:      'var(--text)',
          }}>
            Route<span style={{ color: 'var(--amber)' }}>Mate</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '8px',
        }}>
          {user ? (
            <>
              <Link href="/search" style={{
                color:          'var(--muted)',
                textDecoration: 'none',
                padding:        '8px 16px',
                borderRadius:   '8px',
                fontSize:       '14px',
                transition:     'color 0.2s',
              }}>
                Find a Ride
              </Link>

              {(user.role === 'DRIVER' || user.role === 'BOTH') && (
                <Link href="/my-trips" style={{
                  color:          'var(--muted)',
                  textDecoration: 'none',
                  padding:        '8px 16px',
                  borderRadius:   '8px',
                  fontSize:       '14px',
                }}>
                  My Trips
                </Link>
              )}

              <Link href="/my-bookings" style={{
                color:          'var(--muted)',
                textDecoration: 'none',
                padding:        '8px 16px',
                borderRadius:   '8px',
                fontSize:       '14px',
              }}>
                My Bookings
              </Link>

              <div style={{
                display:    'flex',
                alignItems: 'center',
                gap:        '12px',
                marginLeft: '8px',
                paddingLeft: '16px',
                borderLeft: '1px solid var(--border)',
              }}>
                <span style={{
                  fontSize:   '14px',
                  color:      'var(--muted)',
                  fontFamily: 'Syne, sans-serif',
                }}>
                  {user.name.split(' ')[0]}
                </span>
                <button
                  onClick={logout}
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link href="/login">
                <button
                  className="btn-secondary"
                  style={{ width: 'auto', padding: '8px 20px' }}
                >
                  Login
                </button>
              </Link>
              <Link href="/signup">
                <button
                  className="btn-primary"
                  style={{ width: 'auto', padding: '8px 20px' }}
                >
                  Sign Up
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}