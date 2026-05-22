'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { ArrowLeft, Car } from 'lucide-react'

export default function AddCarPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    make:        '',
    model:       '',
    year:        new Date().getFullYear(),
    plateNumber: '',
    totalSeats:  4,
    isAC:        true,
  })

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (!loading && user && user.role === 'RIDER') {
      toast.error('Only drivers can register cars')
      router.push('/dashboard')
    }
  }, [user, loading])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/cars', {
        ...form,
        year:       parseInt(form.year),
        totalSeats: parseInt(form.totalSeats),
      })
      toast.success('Car registered!')
      router.push('/my-trips/create')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add car')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '520px' }}>
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', marginBottom: '24px', fontSize: '14px',
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <Car size={28} color="var(--amber)" />
        <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800 }}>Add a Car</h1>
      </div>
      <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
        Register your vehicle before listing trips
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                MAKE
              </label>
              <input
                className="input"
                placeholder="e.g. Maruti"
                value={form.make}
                onChange={e => setForm({ ...form, make: e.target.value })}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                MODEL
              </label>
              <input
                className="input"
                placeholder="e.g. Swift"
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                  YEAR
                </label>
                <input
                  className="input"
                  type="number"
                  min="2000"
                  max="2026"
                  value={form.year}
                  onChange={e => setForm({ ...form, year: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                  SEATS
                </label>
                <select
                  className="input"
                  value={form.totalSeats}
                  onChange={e => setForm({ ...form, totalSeats: e.target.value })}
                >
                  {[2, 3, 4, 5, 6].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                PLATE NUMBER
              </label>
              <input
                className="input"
                placeholder="e.g. RJ14AB1234"
                value={form.plateNumber}
                onChange={e => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="isAC"
                checked={form.isAC}
                onChange={e => setForm({ ...form, isAC: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--amber)' }}
              />
              <label htmlFor="isAC" style={{ fontSize: '14px', cursor: 'pointer' }}>
                Air conditioned (AC)
              </label>
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : 'Register Car'}
        </button>
      </form>
    </div>
  )
}
