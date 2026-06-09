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
      // ✅ FIXED: Token is now in HttpOnly cookie, automatically sent with requests
      const res = await axios.get('/api/auth/me', {
        withCredentials: true // Include cookies in requests
      })
      const u = res.data.data?.user || res.data.user
      setUser(u ? { ...u, isAdmin: u.isAdmin ?? false } : null)
    } catch (error) {
      // Clear any invalid state
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  function login(userData, token) {
    // ✅ FIXED: Token is now set in HttpOnly cookie by the login endpoint
    // No need to store in localStorage
    setUser(userData)
  }

  async function logout() {
    try {
      await axios.post('/api/auth/logout', {}, {
        withCredentials: true // Include cookies
      })
    } catch (error) {
      // Continue logout even if request fails
      console.error('[Logout]', error.message)
    } finally {
      setUser(null)
      // Server clears the cookie, client-side cleanup
      window.location.href = '/'
    }
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