'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin } from 'lucide-react'
import api from '@/lib/api.js'

export default function CityAutocomplete({
  value,
  onChange,
  placeholder = 'City',
  pinColor = 'var(--amber)',
  required = false,
  inputStyle = {},
}) {
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen]               = useState(false)
  const [loading, setLoading]         = useState(false)
  const debounceRef                   = useRef(null)
  const wrapRef                       = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleInput(val) {
    onChange(val)
    clearTimeout(debounceRef.current)
    if (val.length < 2) {
      setSuggestions([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get('/search/cities', { params: { q: val } })
        setSuggestions(res.data.cities || [])
        setOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function selectCity(city) {
    onChange(city.name)
    setSuggestions([])
    setOpen(false)
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <MapPin
        size={16}
        color={pinColor}
        style={{
          position:  'absolute',
          left:      '12px',
          top:       '50%',
          transform: 'translateY(-50%)',
          zIndex:    1,
          pointerEvents: 'none',
        }}
      />
      <input
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={e => handleInput(e.target.value)}
        onFocus={() => value.length >= 2 && suggestions.length > 0 && setOpen(true)}
        required={required}
        autoComplete="off"
        style={{ paddingLeft: '36px', ...inputStyle }}
      />
      {loading && (
        <span style={{
          position:  'absolute',
          right:     '12px',
          top:       '50%',
          transform: 'translateY(-50%)',
          fontSize:  '11px',
          color:     'var(--muted)',
        }}>
          ...
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul style={{
          position:     'absolute',
          top:          '100%',
          left:         0,
          right:        0,
          marginTop:    '4px',
          background:   'var(--bg-card)',
          border:       '1px solid var(--border)',
          borderRadius: '8px',
          listStyle:    'none',
          zIndex:       50,
          maxHeight:    '220px',
          overflowY:    'auto',
          boxShadow:    '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {suggestions.map(city => (
            <li
              key={city.placeId}
              onMouseDown={e => {
                e.preventDefault()
                selectCity(city)
              }}
              style={{
                padding:    '10px 14px',
                cursor:     'pointer',
                fontSize:   '14px',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ fontWeight: 600 }}>{city.name}</div>
              {city.fullName !== city.name && (
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  {city.fullName}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
