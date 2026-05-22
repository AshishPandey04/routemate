'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import CityAutocomplete from '@/components/shared/CityAutocomplete.js'
import { ArrowRight, ArrowLeft, Plus, Trash2 } from 'lucide-react'

export default function CreateTripPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const [cars, setCars]   = useState([])
  const [carsLoading, setCarsLoading] = useState(true)
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
      if (res.data.cars.length === 1) {
        setForm(f => ({ ...f, carId: res.data.cars[0].id }))
      }
    } catch {
      toast.error('Failed to load cars')
    } finally {
      setCarsLoading(false)
    }
  }

  async function deleteCar(carId, e) {
    e.preventDefault()
    if (!confirm('Remove this car from your account?')) return
    try {
      await api.delete(`/cars/${carId}`)
      toast.success('Car removed')
      fetchCars()
      if (form.carId === carId) setForm(f => ({ ...f, carId: '' }))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove car')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.carId) {
      toast.error('Please select a car')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...form,
        pricePerKm: parseFloat(form.pricePerKm),
      }
      if (!form.offerReturn) delete payload.estimatedReturnDate

      await api.post('/trips', payload)
      toast.success('Trip created successfully!')
      router.push('/my-trips')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create trip')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || carsLoading) {
    return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '600px' }}>
      <button
        type="button"
        onClick={() => router.push('/my-trips')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'none', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', marginBottom: '24px', fontSize: '14px',
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
        Create a Trip
      </h1>
      <p style={{ color: 'var(--muted)', marginBottom: '32px' }}>
        List your car for a cross-city journey
      </p>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '20px' }}>Route</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                FROM CITY
              </label>
              <CityAutocomplete
                value={form.originCity}
                onChange={v => setForm({ ...form, originCity: v })}
                placeholder="e.g. Jaipur"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                TO CITY
              </label>
              <CityAutocomplete
                value={form.destCity}
                onChange={v => setForm({ ...form, destCity: v })}
                placeholder="e.g. Mumbai"
                pinColor="var(--muted)"
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
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: '20px',
          }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700 }}>Car & Pricing</h2>
            <Link
              href="/cars/add"
              style={{
                fontSize: '13px', color: 'var(--amber)', textDecoration: 'none',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <Plus size={14} /> Add car
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px' }}>
                SELECT CAR
              </label>
              {cars.length === 0 ? (
                <div style={{
                  padding: '16px', background: 'var(--bg-input)',
                  borderRadius: '8px', fontSize: '14px', color: 'var(--muted)',
                }}>
                  No cars registered.{' '}
                  <Link href="/cars/add" style={{ color: 'var(--amber)', fontWeight: 600 }}>
                    Add a car first
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {cars.map(car => (
                    <label
                      key={car.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px', background: form.carId === car.id ? 'rgba(245,159,11,0.1)' : 'var(--bg-input)',
                        border: `1px solid ${form.carId === car.id ? 'var(--amber)' : 'var(--border)'}`,
                        borderRadius: '8px', cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="carId"
                        value={car.id}
                        checked={form.carId === car.id}
                        onChange={() => setForm({ ...form, carId: car.id })}
                        style={{ accentColor: 'var(--amber)' }}
                      />
                      <span style={{ flex: 1, fontSize: '14px' }}>
                        {car.make} {car.model} · {car.plateNumber} · {car.totalSeats} seats
                        {car.isAC && ' · AC'}
                      </span>
                      <button
                        type="button"
                        onClick={e => deleteCar(car.id, e)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--muted)', padding: '4px',
                        }}
                        title="Remove car"
                      >
                        <Trash2 size={16} />
                      </button>
                    </label>
                  ))}
                </div>
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
          <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '20px' }}>Return Trip</h2>
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
          disabled={submitting || cars.length === 0}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <ArrowRight size={16} />
          {submitting ? 'Creating trip...' : 'Create Trip'}
        </button>
      </form>
    </div>
  )
}
