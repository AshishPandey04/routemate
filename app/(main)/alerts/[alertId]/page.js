'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api, { getErrorMessage } from '@/lib/api.js'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Bell, MapPin, Calendar, Trash2, ArrowLeft, AlertCircle } from 'lucide-react'

export default function AlertDetailPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const alertId = params.alertId

  const [alert, setAlert] = useState(null)
  const [fetching, setFetching] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [alertType, setAlertType] = useState(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (alertId) fetchAlertDetail()
  }, [user, loading, alertId])

  async function fetchAlertDetail() {
    try {
      setFetching(true)
      
      // Try both endpoints to find the alert
      try {
        const routeRes = await api.get(`/alerts/route/${alertId}`)
        setAlert(routeRes.data.alert)
        setAlertType('ROUTE')
      } catch {
        const returnRes = await api.get(`/alerts/return/${alertId}`)
        setAlert(returnRes.data.alert)
        setAlertType('RETURN')
      }
    } catch (err) {
      toast.error('Failed to load alert')
      router.push('/alerts')
    } finally {
      setFetching(false)
    }
  }

  async function deleteAlert() {
    if (!confirm('Delete this alert?')) return

    setDeleting(true)
    try {
      const endpoint = alertType === 'ROUTE' 
        ? `/alerts/route/${alertId}` 
        : `/alerts/return/${alertId}`
      
      await api.delete(endpoint)
      toast.success('Alert deleted successfully')
      router.push('/alerts')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete alert'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading alert...</div>
      </div>
    )
  }

  if (!alert) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700 mb-4">Alert not found</p>
          <Button onClick={() => router.push('/alerts')}>
            Go Back to Alerts
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold" style={{ color: '#0f172a' }}>Alert Details</h1>
          <div className="w-20" />
        </div>

        {/* Alert Type Badge */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold" style={{
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#3b82f6',
          }}>
            <Bell className="w-4 h-4" />
            {alertType === 'ROUTE' ? 'Route Alert' : 'Return Alert'}
          </div>
        </div>

        {/* Alert Details Card */}
        <div className="card" style={{
          background: '#ffffff',
          borderColor: 'rgba(226, 232, 240, 0.8)',
          padding: '32px',
        }}>
          {alertType === 'ROUTE' ? (
            <>
              {/* Route Alert Details */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    From City
                  </label>
                  <div className="flex items-center gap-4 p-4 rounded-lg border" style={{
                    background: '#f8fafc',
                    borderColor: 'rgba(226, 232, 240, 0.8)',
                  }}>
                    <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-lg font-semibold" style={{ color: '#0f172a' }}>{alert.fromCity}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    To City
                  </label>
                  <div className="flex items-center gap-4 p-4 rounded-lg border" style={{
                    background: '#f8fafc',
                    borderColor: 'rgba(226, 232, 240, 0.8)',
                  }}>
                    <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-lg font-semibold" style={{ color: '#0f172a' }}>{alert.toCity}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    Preferred Date
                  </label>
                  <div className="flex items-center gap-4 p-4 rounded-lg border" style={{
                    background: '#f8fafc',
                    borderColor: 'rgba(226, 232, 240, 0.8)',
                  }}>
                    <div className="w-10 h-10 bg-linear-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-lg font-semibold" style={{ color: '#0f172a' }}>
                      {new Date(alert.date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    Alert Status
                  </label>
                  <div className="p-4 rounded-lg border" style={{
                    background: 'rgba(16, 185, 129, 0.05)',
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                  }}>
                    <span className="font-semibold" style={{ color: '#047857' }}>
                      {alert.notified ? '✓ Notifications Sent' : '○ Waiting for trips'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    Created
                  </label>
                  <div className="p-4 rounded-lg border" style={{
                    background: '#f8fafc',
                    borderColor: 'rgba(226, 232, 240, 0.8)',
                  }}>
                    <span className="text-gray-600">
                      {new Date(alert.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Return Alert Details */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    Return From City
                  </label>
                  <div className="flex items-center gap-4 p-4 rounded-lg border" style={{
                    background: '#f8fafc',
                    borderColor: 'rgba(226, 232, 240, 0.8)',
                  }}>
                    <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-lg font-semibold" style={{ color: '#0f172a' }}>
                      {alert.returnSlot?.returnOrigin || 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    Return To City
                  </label>
                  <div className="flex items-center gap-4 p-4 rounded-lg border" style={{
                    background: '#f8fafc',
                    borderColor: 'rgba(226, 232, 240, 0.8)',
                  }}>
                    <div className="w-10 h-10 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-lg font-semibold" style={{ color: '#0f172a' }}>
                      {alert.returnSlot?.returnDestination || 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    Estimated Return Date
                  </label>
                  <div className="flex items-center gap-4 p-4 rounded-lg border" style={{
                    background: '#f8fafc',
                    borderColor: 'rgba(226, 232, 240, 0.8)',
                  }}>
                    <div className="w-10 h-10 bg-linear-to-br from-purple-100 to-purple-50 rounded-lg flex items-center justify-center shrink-0">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-lg font-semibold" style={{ color: '#0f172a' }}>
                      {new Date(alert.returnSlot?.estimatedReturnDate).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    Slot Status
                  </label>
                  <div className="p-4 rounded-lg border" style={{
                    background: 'rgba(59, 130, 246, 0.05)',
                    borderColor: 'rgba(59, 130, 246, 0.2)',
                  }}>
                    <span className="font-semibold text-blue-700">
                      {alert.returnSlot?.status || 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-3">
                    Alert Status
                  </label>
                  <div className="p-4 rounded-lg border" style={{
                    background: 'rgba(16, 185, 129, 0.05)',
                    borderColor: 'rgba(16, 185, 129, 0.2)',
                  }}>
                    <span className="font-semibold" style={{ color: '#047857' }}>
                      {alert.notified ? '✓ Notified' : '○ Pending notification'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <Button
            onClick={() => router.push('/alerts')}
            variant="outline"
            className="flex-1"
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '15px',
            }}
          >
            Back to Alerts
          </Button>
          <Button
            onClick={deleteAlert}
            disabled={deleting}
            className="flex-1 gap-2"
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '15px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#fff',
            }}
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? 'Deleting...' : 'Delete Alert'}
          </Button>
        </div>
      </div>
    </div>
  )
}
