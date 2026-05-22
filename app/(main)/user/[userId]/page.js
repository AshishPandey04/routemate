'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import api from '@/lib/api.js'
import { ArrowLeft, Star } from 'lucide-react'

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.userId

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) fetchProfile()
  }, [userId])

  async function fetchProfile() {
    try {
      const res = await api.get(`/ratings/user/${userId}`)
      setProfile(res.data)
    } catch {
      toast.error('Failed to load profile')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '560px' }}>
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

      <div className="card" style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'rgba(245,159,11,0.2)', margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Star size={28} color="var(--amber)" fill="var(--amber)" />
        </div>
        <div style={{ fontFamily: 'Syne', fontSize: '36px', fontWeight: 800, color: 'var(--amber)' }}>
          {profile.averageScore ?? '—'}
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          {profile.totalRatings} rating{profile.totalRatings !== 1 ? 's' : ''}
        </p>
      </div>

      <h2 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px' }}>Recent reviews</h2>

      {profile.recent?.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>No reviews yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {profile.recent.map((r, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>{r.raterName}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={14} color="var(--amber)" fill="var(--amber)" />
                  {r.score}/5
                </span>
              </div>
              {r.comment && (
                <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px' }}>{r.comment}</p>
              )}
              <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
                {new Date(r.createdAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
