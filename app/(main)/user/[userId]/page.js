'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Star, ThumbsUp, Car } from 'lucide-react'

export default function UserProfilePage() {
  const { user, loading } = useAuth()
  const router            = useRouter()
  const params            = useParams()
  const userId            = params.userId

  const [profile,  setProfile]  = useState(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (userId) fetchProfile()
  }, [userId, loading, user])

  async function fetchProfile() {
    try {
      const res = await api.get(`/ratings/user/${userId}`)
      setProfile(res.data)
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setFetching(false)
    }
  }

  if (loading || fetching) return (
    <div style={{ color: 'var(--muted)', padding: '60px 0', textAlign: 'center' }}>Loading...</div>
  )

  if (!profile) return null

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* Profile Header */}
      <div className="card" style={{ marginBottom: '20px', textAlign: 'center' }}>
        <div style={{
          width:  '72px', height: '72px',
          background: 'var(--bg-input)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Syne', fontWeight: 800, fontSize: '28px',
          margin: '0 auto 16px',
        }}>
          👤
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
          {profile.averageScore ? (
            <>
              <Star size={20} color="var(--amber)" fill="var(--amber)" />
              <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '28px' }}>
                {profile.averageScore}
              </span>
            </>
          ) : (
            <span style={{ color: 'var(--muted)', fontSize: '16px' }}>No ratings yet</span>
          )}
        </div>

        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          {profile.totalRatings} rating{profile.totalRatings !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Ratings List */}
      {profile.recent.length > 0 && (
        <div className="card">
          <h3 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: '16px' }}>
            Recent Reviews
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {profile.recent.map((rating, i) => (
              <div key={i} style={{
                paddingBottom: i < profile.recent.length - 1 ? '16px' : 0,
                borderBottom:  i < profile.recent.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px', height: '32px',
                      background: 'var(--bg-input)',
                      borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700,
                    }}>
                      {rating.raterName?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '14px' }}>
                      {rating.raterName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {[1,2,3,4,5].map(star => (
                      <Star
                        key={star}
                        size={14}
                        color="var(--amber)"
                        fill={star <= rating.score ? 'var(--amber)' : 'transparent'}
                      />
                    ))}
                  </div>
                </div>
                {rating.comment && (
                  <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    "{rating.comment}"
                  </p>
                )}
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '6px' }}>
                  {new Date(rating.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}