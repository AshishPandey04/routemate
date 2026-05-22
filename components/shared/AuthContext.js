'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const token = localStorage.getItem('token')
      if (!token) { setLoading(false); return }

      const res = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(res.data.user)
    } catch {
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  function login(userData, token) {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  async function logout() {
    try {
      await axios.post('/api/auth/logout')
    } catch {}
    localStorage.removeItem('token')
    setUser(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}