'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import api from '@/lib/api.js'
import { Car } from 'lucide-react'

export default function SignupPage() {
  const router  = useRouter()
  const [step, setStep]       = useState(1)  // 1=form, 2=otp
  const [loading, setLoading] = useState(false)
  const [userId, setUserId]   = useState(null)
  const [otp, setOtp]         = useState('')

  const [form, setForm] = useState({
    name:     '',
    email:    '',
    phone:    '',
    password: '',
    role:     'BOTH',
  })

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await api.post('/auth/signup', form)
      setUserId(res.data.userId)
      setStep(2)
      toast.success('OTP sent to your phone!')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/auth/verify-otp', {
        phone: form.phone,
        otp,
      })
      toast.success('Phone verified! Please login.')
      router.push('/login')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid OTP')
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
          display:        'flex',
          alignItems:     'center',
          gap:            '8px',
          marginBottom:   '40px',
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
          {step === 1 ? (
            <>
              <h1 style={{
                fontFamily: 'Syne', fontSize: '26px',
                fontWeight: 800, marginBottom: '8px'
              }}>
                Create account
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>
                Join RouteMate today
              </p>

              <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--muted)' }}>
                    Full Name
                  </label>
                  <input
                    className="input"
                    placeholder="Rahul Sharma"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--muted)' }}>
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
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--muted)' }}>
                    Phone Number
                  </label>
                  <input
                    className="input"
                    type="tel"
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--muted)' }}>
                    Password
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--muted)' }}>
                    I want to
                  </label>
                  <select
                    className="input"
                    value={form.role}
                    onChange={e => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="BOTH">Both drive and ride</option>
                    <option value="DRIVER">Only drive</option>
                    <option value="RIDER">Only ride</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ marginTop: '8px' }}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 style={{
                fontFamily: 'Syne', fontSize: '26px',
                fontWeight: 800, marginBottom: '8px'
              }}>
                Verify your phone
              </h1>
              <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '28px' }}>
                Enter the OTP sent to {form.phone}
              </p>

              <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <input
                  className="input"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  maxLength={6}
                  style={{ fontSize: '24px', textAlign: 'center', letterSpacing: '8px' }}
                  required
                />

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={async () => {
                    try {
                      await api.post('/auth/resend-otp', { phone: form.phone })
                      toast.success('OTP resent!')
                    } catch {
                      toast.error('Failed to resend OTP')
                    }
                  }}
                >
                  Resend OTP
                </button>
              </form>
            </>
          )}

          <p style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize:  '14px',
            color:     'var(--muted)',
          }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--amber)', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}