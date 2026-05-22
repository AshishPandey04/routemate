'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Plus, Car, Trash2, Snowflake } from 'lucide-react'

export default function CarsPage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const [cars, setCars]   = useState([])
  const [fetching, setFetching] = useState(true)

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
    } finally {
      setFetching(false)
    }
  }

  async function deleteCar(carId) {
    if (!confirm('Remove this car?')) return
    try {
      await api.delete(`/cars/${carId}`)
      toast.success('Car removed')
      fetchCars()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove car')
    }
  }

  if (loading || fetching) return (
    <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>
  )

  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px',
      }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontSize: '32px', fontWeight: 800, marginBottom: '4px' }}>
            My Cars
          </h1>
          <p style={{ color: 'var(--muted)' }}>{cars.length} registered vehicle{cars.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
          onClick={() => router.push('/cars/add')}
        >
          <Plus size={16} /> Add Car
        </button>
      </div>

      {cars.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <Car size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <p style={{ fontFamily: 'Syne', fontSize: '18px', marginBottom: '8px' }}>No cars yet</p>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '10px 24px', marginTop: '16px' }}
            onClick={() => router.push('/cars/add')}
          >
            Add Your First Car
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {cars.map(car => (
            <div key={car.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '48px', height: '48px',
                    background: 'rgba(245,159,11,0.1)',
                    borderRadius: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Car size={22} color="var(--amber)" />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px' }}>
                      {car.make} {car.model}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '2px' }}>
                      {car.plateNumber} · {car.year}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => deleteCar(car.id)}
                  style={{
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--muted)',
                    padding: '4px', borderRadius: '6px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{
                display: 'flex', gap: '12px', marginTop: '16px',
                paddingTop: '16px', borderTop: '1px solid var(--border)',
                fontSize: '13px', color: 'var(--muted)',
              }}>
                <span>💺 {car.totalSeats} seats</span>
                {car.isAC && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
                    <Snowflake size={12} /> AC
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}