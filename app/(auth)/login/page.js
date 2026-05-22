'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Car } from 'lucide-react'

export default function LoginPage() {
  const router        = useRouter()
  const { login }     = useAuth()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const res     = await api.post('/auth/login', form)
      const payload = res.data.data ?? res.data
      login(payload.user, payload.token)
      toast.success(`Welcome back, ${payload.user.name.split(' ')[0]}!`)
      router.push('/dashboard')
    } catch (err) {
      const errData = err.response?.data?.error
      toast.error(
        typeof errData === 'string' ? errData : errData?.message || 'Login failed'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{
          display:       'flex',
          alignItems:    'center',
          gap:           '8px',
          marginBottom:  '40px',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'var(--amber)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Car size={20} color="#000" />
          </div>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '22px' }}>
            Route<span style={{ color: 'var(--amber)' }}>Mate</span>
          </span>
        </div>

        <div className="card">
          <h1 style={{
            fontFamily:   'Syne',
            fontSize:     '26px',
            fontWeight:   800,
            marginBottom: '8px',
          }}>
            Welcome back
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>
            Sign in to your account
          </p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display:      'block',
                fontSize:     '13px',
                fontWeight:   600,
                marginBottom: '8px',
                color:        'var(--muted)',
              }}>
                Email
              </label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{
                display:      'block',
                fontSize:     '13px',
                fontWeight:   600,
                marginBottom: '8px',
                color:        'var(--muted)',
              }}>
                Password
              </label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{
            textAlign:  'center',
            marginTop:  '24px',
            fontSize:   '14px',
            color:      'var(--muted)',
          }}>
            Don't have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}