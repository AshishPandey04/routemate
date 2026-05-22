'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { ArrowRight } from 'lucide-react'

export default function CreateTripPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const [cars, setCars]   = useState([])
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({
    carId:               '',
    originCity:          '',
    destCity:            '',
    departureTime:       '',
    pricePerKm:          2,
    allowSharing:        true,
    offerReturn:         false,
    estimatedReturnDate: '',
  })

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) fetchCars()
  }, [user, loading])

  async function fetchCars() {
    try {
      const res = await api.get('/cars')
      setCars(res.data.cars)
    } catch {
      toast.error('Failed to load cars')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.carId) { toast.error('Please select a car'); return }

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        pricePerKm: parseFloat(form.pricePerKm),
      }
      if (!form.offerReturn) delete payload.estimatedReturnDate

      const res = await api.post('/trips', payload)
      toast.success('Trip created successfully!')
      router.push(`/my-trips`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create trip')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
        Create a Trip
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
        List your car for a cross-city journey
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '20px' }}>
            Route
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                FROM CITY
              </label>
              <input
                className="input"
                placeholder="e.g. Jaipur"
                value={form.originCity}
                onChange={e => setForm({ ...form, originCity: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                TO CITY
              </label>
              <input
                className="input"
                placeholder="e.g. Mumbai"
                value={form.destCity}
                onChange={e => setForm({ ...form, destCity: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                DEPARTURE TIME
              </label>
              <input
                className="input"
                type="datetime-local"
                value={form.departureTime}
                onChange={e => setForm({ ...form, departureTime: e.target.value })}
                required
              />
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '20px' }}>
            Car & Pricing
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                SELECT CAR
              </label>
              {cars.length === 0 ? (
                <div style={{
                  padding:      '16px',
                  background:   'var(--bg-input)',
                  borderRadius: '8px',
                  fontSize:     '14px',
                  color:        'var(--muted)',
                }}>
                  No cars registered.{' '}
                  <button
                    type="button"
                    style={{ color: 'var(--amber)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => router.push('/cars/add')}
                  >
                    Add a car first
                  </button>
                </div>
              ) : (
                <select
                  className="input"
                  value={form.carId}
                  onChange={e => setForm({ ...form, carId: e.target.value })}
                  required
                >
                  <option value="">Select a car</option>
                  {cars.map(car => (
                    <option key={car.id} value={car.id}>
                      {car.make} {car.model} · {car.plateNumber} · {car.totalSeats} seats
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                PRICE PER KM (₹)
              </label>
              <input
                className="input"
                type="number"
                min="0.5"
                max="20"
                step="0.5"
                value={form.pricePerKm}
                onChange={e => setForm({ ...form, pricePerKm: e.target.value })}
                required
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="allowSharing"
                checked={form.allowSharing}
                onChange={e => setForm({ ...form, allowSharing: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--amber)' }}
              />
              <label htmlFor="allowSharing" style={{ fontSize: '14px', cursor: 'pointer' }}>
                Allow seat sharing (riders can book individual seats)
              </label>
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '20px' }}>
            Return Trip
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                id="offerReturn"
                checked={form.offerReturn}
                onChange={e => setForm({ ...form, offerReturn: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--amber)' }}
              />
              <label htmlFor="offerReturn" style={{ fontSize: '14px', cursor: 'pointer' }}>
                I plan to return (let riders at destination know)
              </label>
            </div>

            {form.offerReturn && (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                  ESTIMATED RETURN DATE
                </label>
                <input
                  className="input"
                  type="datetime-local"
                  value={form.estimatedReturnDate}
                  onChange={e => setForm({ ...form, estimatedReturnDate: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={submitting}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <ArrowRight size={16} />
          {submitting ? 'Creating trip...' : 'Create Trip'}
        </button>
      </form>
    </div>
  )
}