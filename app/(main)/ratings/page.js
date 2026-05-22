'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import { getCache, setCache, getCacheKey } from '@/lib/cache.js'
import api from '@/lib/api.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Star, MessageSquare, User, MapPin, Calendar } from 'lucide-react'

export default function RatingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [ratings, setRatings] = useState([])
  const [stats, setStats] = useState(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) fetchRatings()
  }, [user, loading])

  async function fetchRatings() {
    try {
      setFetching(true)
      // Check cache first
      const cacheKey = getCacheKey(`/ratings/user/${user.id}`, { userId: user.id })
      const cached = getCache(cacheKey)
      
      if (cached) {
        setRatings(cached.ratings || [])
        setStats(cached.stats)
        setFetching(false)
        return
      }

      const res = await api.get(`/ratings/user/${user.id}`)
      setRatings(res.data.ratings || [])
      setStats(res.data.stats)
      
      // Cache for 5 minutes
      setCache(cacheKey, { ratings: res.data.ratings, stats: res.data.stats }, 5 * 60 * 1000)
    } catch (err) {
      toast.error('Failed to load ratings')
    } finally {
      setFetching(false)
    }
  }

  const renderStars = (score) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= score
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const getRatingTypeLabel = (type) => {
    return type === 'RIDER_TO_DRIVER' ? 'From Rider' : 'From Driver'
  }

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading ratings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2" style={{ color: '#0f172a' }}>My Ratings</h1>
        <p className="text-gray-600 mb-8">View all ratings and reviews from your trips</p>

        {/* Stats Card */}
        {stats && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average Rating Card */}
            <div className="card" style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
              borderColor: 'rgba(59, 130, 246, 0.2)',
              padding: '32px',
              textAlign: 'center',
            }}>
              <p className="text-gray-600 text-sm font-medium mb-3">Average Rating</p>
              <div className="flex justify-center mb-3">
                {renderStars(Math.round(stats.averageScore))}
              </div>
              <p className="text-5xl font-bold text-blue-600">
                {stats.averageScore?.toFixed(1) || '0'}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)',
                borderColor: 'rgba(16, 185, 129, 0.2)',
              }}>
                <p className="text-gray-600 text-sm font-medium mb-2">Total Ratings</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalRatings || 0}</p>
              </div>
              <div className="card" style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
                borderColor: 'rgba(245, 158, 11, 0.2)',
              }}>
                <p className="text-gray-600 text-sm font-medium mb-2">5 Star Ratings</p>
                <p className="text-3xl font-bold text-amber-600">{stats.fiveStarCount || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Ratings List */}
        {ratings.length === 0 ? (
          <Card className="p-8 text-center">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No ratings yet</p>
            <p className="text-sm text-gray-400">
              Your ratings will appear here as you complete trips and bookings
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {ratings.map((rating) => (
              <div key={rating.id} className="card" style={{
                background: '#ffffff',
                borderColor: 'rgba(226, 232, 240, 0.8)',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: '16px',
                alignItems: 'start',
              }}>
                <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-base" style={{ color: '#0f172a' }}>
                        {rating.rater?.name || 'User'}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {getRatingTypeLabel(rating.type)}
                      </p>
                    </div>
                  </div>

                  {/* Rating Score */}
                  <div className="mb-3">
                    {renderStars(rating.score)}
                  </div>

                  {/* Comment */}
                  {rating.comment && (
                    <div className="mb-3 p-3 rounded-lg border" style={{
                      background: 'rgba(59, 130, 246, 0.05)',
                      borderColor: 'rgba(59, 130, 246, 0.15)',
                    }}>
                      <p className="text-gray-700 text-sm">{rating.comment}</p>
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(rating.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
