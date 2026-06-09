'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './AuthContext.js'
import { Menu, X, Car, MapPin, Bell, User } from 'lucide-react'

export default function Navbar() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <nav style={{
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 24px',
        height: '68px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <Link href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
          }}>
            <Car size={20} color="#fff" />
          </div>
          <span style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: '22px',
            color: '#0f172a',
            letterSpacing: '-0.5px',
          }}>
            Route<span style={{ color: '#3b82f6' }}>Mate</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          {user ? (
            <>
              {/* Find a Ride - for RIDER and BOTH only */}
              {(user.role === 'RIDER' || user.role === 'BOTH') && (
                <Link href="/search" style={{
                  color: '#475569',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.3s ease',
                  display: 'inline-block',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#3b82f6'
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}>
                  Find a Ride
                </Link>
              )}

              {/* My Trips - for DRIVER and BOTH */}
              {(user.role === 'DRIVER' || user.role === 'BOTH') && (
                <Link href="/my-trips" style={{
                  color: '#475569',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.3s ease',
                  display: 'inline-block',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#3b82f6'
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}>
                  My Trips
                </Link>
              )}

              {/* My Cars - for DRIVER and BOTH */}
              {(user.role === 'DRIVER' || user.role === 'BOTH') && (
                <Link href="/cars" style={{
                  color: '#475569',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.3s ease',
                  display: 'inline-block',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#3b82f6'
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}>
                  My Cars
                </Link>
              )}

              {/* My Bookings - for RIDER and BOTH only */}
              {(user.role === 'RIDER' || user.role === 'BOTH') && (
                <Link href="/my-bookings" style={{
                  color: '#475569',
                  textDecoration: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.3s ease',
                  display: 'inline-block',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#3b82f6'
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#475569'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}>
                  My Bookings
                </Link>
              )}

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginLeft: '8px',
                paddingLeft: '16px',
                borderLeft: '1px solid rgba(226, 232, 240, 0.7)',
              }}>
                <span style={{
                  fontSize: '14px',
                  color: '#0f172a',
                  fontFamily: 'Syne, sans-serif',
                  fontWeight: 600,
                }}>
                  {user.name.split(' ')[0]}
                </span>
                <button
                  onClick={logout}
                  className="btn-secondary"
                  style={{ 
                    width: 'auto', 
                    padding: '8px 16px', 
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
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