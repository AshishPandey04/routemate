'use client'

import { useState, useRef, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import api from '@/lib/api.js'

export default function CityAutocomplete({ value, onChange, placeholder }) {
  const [query,       setQuery]       = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [open,        setOpen]        = useState(false)
  const [loading,     setLoading]     = useState(false)
  const timerRef                      = useRef(null)
  const wrapperRef                    = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    onChange(val)

    clearTimeout(timerRef.current)
    if (val.length < 2) { setSuggestions([]); setOpen(false); return }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get(`/search/cities?q=${encodeURIComponent(val)}`)
        setSuggestions(res.data.cities || [])
        setOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  function select(city) {
    setQuery(city.name)
    onChange(city.name)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <MapPin size={16} color="var(--amber)" style={{
          position: 'absolute', left: '12px',
          top: '50%', transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }} />
        <input
          className="input"
          placeholder={placeholder || 'Enter city'}
          value={query}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          style={{ paddingLeft: '36px' }}
          autoComplete="off"
        />
        {loading && (
          <span style={{
            position: 'absolute', right: '12px',
            top: '50%', transform: 'translateY(-50%)',
            fontSize: '11px', color: 'var(--muted)',
          }}>
            ...
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <div style={{
          position:    'absolute',
          top:         '100%',
          left:        0,
          right:       0,
          background:  'var(--bg-card)',
          border:      '1px solid var(--border)',
          borderRadius: '8px',
          marginTop:   '4px',
          zIndex:      200,
          overflow:    'hidden',
          boxShadow:   '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {suggestions.map((city, i) => (
            <div
              key={i}
              onClick={() => select(city)}
              style={{
                padding:    '12px 16px',
                cursor:     'pointer',
                fontSize:   '14px',
                borderBottom: i < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.15s',
                display:    'flex',
                alignItems: 'center',
                gap:        '10px',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <MapPin size={13} color="var(--muted)" />
              <div>
                <div style={{ fontWeight: 600 }}>{city.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{city.fullName}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}