'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useAuth } from '@/components/shared/AuthContext.js'
import api, { getErrorMessage } from '@/lib/api.js'
import { Shield, Phone, User, CheckCircle } from 'lucide-react'

export default function SafetySettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [form,   setForm]   = useState({ emergencyContactName: '', emergencyContactPhone: '' })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (user) loadProfile()
  }, [user, loading])

  async function loadProfile() {
    try {
      const res = await api.get('/safety/profile')
      const ec = res.data.emergencyContact || {}
      setForm({
        emergencyContactName:  ec.emergencyContactName  || '',
        emergencyContactPhone: ec.emergencyContactPhone || '',
      })
    } catch { /* ignore */ }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.patch('/safety/profile', form)
      toast.success('Emergency contact saved')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      toast.error(getErrorMessage(err, 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div style={{ color:'var(--muted)' }}>Loading…</div>

  return (
    <div style={{ maxWidth:'520px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'14px', marginBottom:'8px' }}>
        <div style={{ width:'48px', height:'48px', background:'rgba(239,68,68,0.1)', borderRadius:'14px', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Shield size={24} color="var(--red)" />
        </div>
        <div>
          <h1 style={{ fontFamily:'Syne', fontSize:'28px', fontWeight:800 }}>Safety Settings</h1>
          <p style={{ color:'var(--muted)', fontSize:'13px' }}>Emergency contact & SOS</p>
        </div>
      </div>

      <p style={{ color:'var(--muted)', fontSize:'14px', marginBottom:'32px', lineHeight:1.6 }}>
        This contact will be notified if you trigger SOS during a live trip.
        Your family can also track you via the shared trip link.
      </p>

      {/* Info banner */}
      <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:'12px', padding:'14px 16px', marginBottom:'24px', display:'flex', gap:'10px', alignItems:'flex-start' }}>
        <Shield size={16} color="var(--red)" style={{ flexShrink:0, marginTop:'2px' }} />
        <p style={{ fontSize:'13px', color:'var(--muted)', lineHeight:1.5 }}>
          In an emergency, press SOS on the live tracking page. Your contact will receive your real-time location.
        </p>
      </div>

      <form onSubmit={handleSave} className="card">
        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
          <div>
            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', fontWeight:700, color:'var(--muted)', marginBottom:'8px', letterSpacing:'0.5px' }}>
              <User size={13} /> CONTACT NAME
            </label>
            <input
              className="input"
              value={form.emergencyContactName}
              onChange={e => setForm({ ...form, emergencyContactName: e.target.value })}
              placeholder="e.g. Parent / Spouse"
              required
            />
          </div>

          <div>
            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', fontWeight:700, color:'var(--muted)', marginBottom:'8px', letterSpacing:'0.5px' }}>
              <Phone size={13} /> PHONE NUMBER
            </label>
            <input
              className="input"
              value={form.emergencyContactPhone}
              onChange={e => setForm({ ...form, emergencyContactPhone: e.target.value })}
              placeholder="9876543210"
              pattern="[6-9][0-9]{9}"
              required
            />
            <p style={{ fontSize:'12px', color:'var(--muted)', marginTop:'6px' }}>10-digit Indian mobile number</p>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}
          >
            {saved ? <><CheckCircle size={16} /> Saved!</> : saving ? 'Saving…' : 'Save Emergency Contact'}
          </button>
        </div>
      </form>
    </div>
  )
}
