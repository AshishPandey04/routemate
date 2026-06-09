'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api from '@/lib/api.js'
import { Bell, AlertCircle, MapPin, Calendar, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function AlertsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [alerts, setAlerts] = useState([])
  const [fetching, setFetching] = useState(true)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) fetchAlerts()
  }, [user, loading])

  async function fetchAlerts() {
    try {
      setFetching(true)
      // Parallel requests with error handling per request
      const [routeRes, returnRes] = await Promise.allSettled([
        api.get('/alerts/route'),
        api.get('/alerts/return')
      ])
      
      const allAlerts = [
        ...(routeRes.status === 'fulfilled' ? routeRes.value.data.alerts?.map(a => ({ ...a, type: 'ROUTE' })) || [] : []),
        ...(returnRes.status === 'fulfilled' ? returnRes.value.data.alerts?.map(a => ({ ...a, type: 'RETURN' })) || [] : [])
      ]
      setAlerts(allAlerts)
    } catch (err) {
      toast.error('Failed to load alerts')
    } finally {
      setFetching(false)
    }
  }

  async function deleteAlert(alertId, type) {
    if (!confirm('Delete this alert?')) return
    
    setDeleting(alertId)
    try {
      const endpoint = type === 'ROUTE' ? '/alerts/route' : '/alerts/return'
      await api.delete(`${endpoint}/${alertId}`)
      toast.success('Alert deleted')
      fetchAlerts()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete alert')
    } finally {
      setDeleting(null)
    }
  }

  if (loading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading alerts...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#0f172a' }}>My Alerts</h1>
            <p className="text-gray-600 text-sm">Manage your trip and return alerts</p>
          </div>
        </div>

        {alerts.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-700 font-semibold mb-2">No alerts set yet</p>
            <p className="text-gray-500 mb-6 text-sm">Start creating alerts to get notified about trips matching your preferences</p>
            <Button onClick={() => router.push('/search')} style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              color: '#fff',
              maxWidth: '200px',
              margin: '0 auto',
            }}>
              Create Alert
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <div key={alert.id} className="card" style={{
                background: '#ffffff',
                borderColor: 'rgba(226, 232, 240, 0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-linear-to-br from-blue-100 to-blue-50 rounded-lg flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold mb-2" style={{ color: '#0f172a' }}>
                      {alert.type === 'ROUTE' ? 'Route Alert' : 'Return Alert'}
                    </h3>
                    <div className="space-y-1">
                      {alert.type === 'ROUTE' ? (
                        <>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span>{alert.fromCity} → {alert.toCity}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>{new Date(alert.date).toLocaleDateString()}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span>{alert.returnSlot?.returnOrigin} → {alert.returnSlot?.returnDestination}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>{new Date(alert.returnSlot?.estimatedReturnDate).toLocaleDateString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteAlert(alert.id, alert.type)}
                  disabled={deleting === alert.id}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  style={{ padding: '8px 12px' }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
