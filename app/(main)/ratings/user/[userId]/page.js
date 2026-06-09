'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Star, MessageSquare, User, Calendar, ArrowLeft, AlertCircle } from 'lucide-react'

export default function UserRatingsPage() {
  const { user: currentUser, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const userId = params.userId

  const [user, setUser] = useState(null)
  const [ratings, setRatings] = useState([])
  const [stats, setStats] = useState(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!authLoading && !currentUser) router.push('/login')
    if (userId) fetchUserRatings()
  }, [currentUser, authLoading, userId])

  async function fetchUserRatings() {
    try {
      setFetching(true)
      const [userRes, ratingsRes] = await Promise.all([
        api.get(`/users/${userId}`),
        api.get(`/ratings/user/${userId}`)
      ])
      
      setUser(userRes.data.user)
      setRatings(ratingsRes.data.ratings || [])
      setStats(ratingsRes.data.stats)
    } catch (err) {
      toast.error('Failed to load user ratings')
      router.push('/my-trips')
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

  if (authLoading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">User not found</p>
          <Button onClick={() => router.back()}>
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-8 font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* User Profile Header */}
        <div className="card mb-8" style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
          borderColor: 'rgba(59, 130, 246, 0.2)',
          padding: '40px',
        }}>
          <div className="flex items-start gap-6 mb-8">
            <div className="w-24 h-24 bg-linear-to-br from-blue-200 to-purple-200 rounded-full flex items-center justify-center shrink-0">
              <User className="w-12 h-12 text-blue-700" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-1" style={{ color: '#0f172a' }}>{user.name}</h1>
              <p className="text-gray-600 mb-3 font-medium">{user.role}</p>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {renderStars(Math.round(stats?.averageScore || 0))}
                </div>
                <span className="font-bold text-xl text-blue-600">
                  {stats?.averageScore?.toFixed(1) || '0'}
                </span>
                <span className="text-gray-600">
                  ({stats?.totalRatings || 0} rating{stats?.totalRatings !== 1 ? 's' : ''})
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t" style={{
              borderColor: 'rgba(59, 130, 246, 0.2)',
            }}>
              <div>
                <p className="text-3xl font-bold text-green-600">{stats.fiveStarCount || 0}</p>
                <p className="text-sm text-gray-600 mt-1">5 Star Ratings</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600">{stats.fourStarCount || 0}</p>
                <p className="text-sm text-gray-600 mt-1">4 Star Ratings</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-amber-600">{stats.threeStarCount || 0}</p>
                <p className="text-sm text-gray-600 mt-1">3 Star Ratings</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-red-600">{stats.lowStarCount || 0}</p>
                <p className="text-sm text-gray-600 mt-1">1-2 Star Ratings</p>
              </div>
            </div>
          )}
        </div>

        {/* Ratings List Header */}
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#0f172a' }}>Ratings & Reviews</h2>

        {ratings.length === 0 ? (
          <div className="card text-center" style={{
            background: '#ffffff',
            borderColor: 'rgba(226, 232, 240, 0.8)',
          }}>
            <div className="py-8">
              <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No ratings yet</p>
            </div>
          </div>
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
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-base" style={{ color: '#0f172a' }}>
                        {rating.rater?.name || 'Anonymous'}
                      </h3>
                      <p className="text-sm text-gray-500">
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
                      <p className="text-gray-700 text-sm italic">"{rating.comment}"</p>
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
