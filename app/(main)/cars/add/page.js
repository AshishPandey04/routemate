'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Car } from 'lucide-react'

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
      toast.success('Car registered successfully!')
      router.push('/cars')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add car')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '480px' }}>
      <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
        Add a Car
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
        Register your vehicle for cross-city trips
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {[
              { label: 'MAKE',         key: 'make',        placeholder: 'e.g. Maruti' },
              { label: 'MODEL',        key: 'model',       placeholder: 'e.g. Swift Dzire' },
              { label: 'PLATE NUMBER', key: 'plateNumber', placeholder: 'e.g. RJ14AB1234' },
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                  {field.label}
                </label>
                <input
                  className="input"
                  placeholder={field.placeholder}
                  value={form[field.key]}
                  onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  required
                />
              </div>
            ))}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                  YEAR
                </label>
                <input
                  className="input"
                  type="number"
                  min="2000"
                  max={new Date().getFullYear()}
                  value={form.year}
                  onChange={e => setForm({ ...form, year: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                  SEATS
                </label>
                <select
                  className="input"
                  value={form.totalSeats}
                  onChange={e => setForm({ ...form, totalSeats: e.target.value })}
                >
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={n}>{n} seat{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
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
                Air conditioned
              </label>
            </div>

          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
          style={{ marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Car size={16} />
          {submitting ? 'Registering...' : 'Register Car'}
        </button>
      </form>
    </div>
  )
}