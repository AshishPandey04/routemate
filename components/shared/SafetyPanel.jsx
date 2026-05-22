'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import api from '@/lib/api.js'
import { Shield, Share2, Phone, AlertTriangle, Copy } from 'lucide-react'

export default function SafetyPanel({ tripId, tripStatus }) {
  const [shareUrl, setShareUrl] = useState('')
  const [loadingShare, setLoadingShare] = useState(false)
  const [sosLoading, setSosLoading] = useState(false)
  const [emergency, setEmergency] = useState(null)

  const active = ['SCHEDULED', 'IN_TRANSIT'].includes(tripStatus)

  async function loadEmergency() {
    try {
      const res = await api.get('/safety/profile')
      setEmergency(res.data.emergencyContact)
    } catch { /* ignore */ }
  }

  async function handleShareLink() {
    setLoadingShare(true)
    try {
      const res = await api.post(`/safety/share/${tripId}`)
      setShareUrl(res.data.shareUrl)
      await navigator.clipboard.writeText(res.data.shareUrl)
      toast.success('Live trip link copied to clipboard')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not create share link')
    } finally {
      setLoadingShare(false)
    }
  }

  async function handleSOS() {
    if (!confirm('Send SOS alert? This logs your location and shows emergency contacts.')) {
      return
    }

    setSosLoading(true)
    try {
      let lat, lng
      if (navigator.geolocation) {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 8000,
            enableHighAccuracy: true,
          })
        })
        lat = pos.coords.latitude
        lng = pos.coords.longitude
      }

      const res = await api.post('/safety/sos', {
        tripId,
        lat,
        lng,
        message: 'SOS — need help on RouteMate trip',
      })

      if (res.data.shareUrl) {
        setShareUrl(res.data.shareUrl)
        await navigator.clipboard.writeText(res.data.shareUrl).catch(() => {})
      }

      const ec = res.data.emergencyContact
      if (ec?.phone) {
        setEmergency({
          emergencyContactName: ec.name,
          emergencyContactPhone: ec.phone,
        })
        toast.success(`SOS logged. Call ${ec.name || 'emergency contact'}: ${ec.phone}`, {
          duration: 8000,
        })
      } else {
        toast.warning(
          'SOS logged. Add an emergency contact in Safety Settings.',
          { duration: 6000 }
        )
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'SOS failed')
    } finally {
      setSosLoading(false)
    }
  }

  if (!active) return null

  return (
    <div
      className="card"
      style={{
        border: '1px solid rgba(239,68,68,0.25)',
        background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, transparent 60%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Shield size={20} color="var(--red)" />
        <h3 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '16px', margin: 0 }}>
          Safety
        </h3>
      </div>

      <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '16px', lineHeight: 1.5 }}>
        Share a live trip link with family or trigger SOS. Your emergency contact is shown after SOS.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          type="button"
          onClick={() => { loadEmergency(); handleShareLink() }}
          disabled={loadingShare}
          className="btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
          }}
        >
          <Share2 size={16} />
          {loadingShare ? 'Creating link…' : 'Copy live trip link'}
        </button>

        <button
          type="button"
          onClick={() => { loadEmergency(); handleSOS() }}
          disabled={sosLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            background: 'rgba(239,68,68,0.15)',
            color: 'var(--red)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '8px',
            padding: '12px',
            fontFamily: 'Syne',
            fontWeight: 700,
            fontSize: '14px',
            cursor: sosLoading ? 'wait' : 'pointer',
          }}
        >
          <AlertTriangle size={16} />
          {sosLoading ? 'Sending SOS…' : 'SOS — I need help'}
        </button>

        {emergency?.emergencyContactPhone && (
          <a
            href={`tel:${emergency.emergencyContactPhone}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              background: 'var(--bg-input)',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'var(--text)',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            <Phone size={16} color="var(--green)" />
            Call {emergency.emergencyContactName || 'Emergency'}: {emergency.emergencyContactPhone}
          </a>
        )}

        {shareUrl && (
          <div
            style={{
              fontSize: '12px',
              color: 'var(--muted)',
              wordBreak: 'break-all',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
            }}
          >
            <Copy size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{shareUrl}</span>
          </div>
        )}
      </div>
    </div>
  )
}
