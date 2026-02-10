'use client'

import { useState, useEffect } from 'react'

interface AuthState {
  token: string | null
  csrfToken: string | null
  isAuthenticated: boolean
  userName: string
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    token: null,
    csrfToken: null,
    isAuthenticated: false,
    userName: '',
    loading: true
  })

  const API_BASE = '/api/sap-proxy'

  // ✅ Cek dari localStorage dulu
  const checkAuth = async (): Promise<boolean> => {
    try {
      // Cek localStorage
      const savedToken = localStorage.getItem('sap_csrf_token')
      const savedUser = localStorage.getItem('sap_username')

      if (savedToken && savedUser) {
        setState({
          token: savedToken,
          csrfToken: savedToken,
          isAuthenticated: true,
          userName: savedUser,
          loading: false
        })
        return true
      }

      // Kalau tidak ada, set loading false
      setState(prev => ({ ...prev, loading: false }))
      return false
    } catch (error) {
      console.error('Check auth error:', error)
      setState(prev => ({ ...prev, loading: false }))
      return false
    }
  }

  // Login dengan Basic Auth
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true }))
      
      console.log('🔐 Attempting login for:', username)
      
      const response = await fetch(API_BASE, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`
        }
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        setState(prev => ({ ...prev, loading: false }))
        return false
      }

      const csrfToken = response.headers.get('x-csrf-token')
      console.log('✅ Login success, CSRF:', csrfToken)
      
      // ✅ Simpan ke localStorage
      if (csrfToken) {
        localStorage.setItem('sap_csrf_token', csrfToken)
        localStorage.setItem('sap_username', username)
      }
      
      setState({
        token: csrfToken || null,
        csrfToken: csrfToken || null,
        isAuthenticated: true,
        userName: username,
        loading: false
      })
      return true
    } catch (error) {
      console.error('💥 Login exception:', error)
      setState(prev => ({ ...prev, loading: false }))
      return false
    }
  }

  // Logout
  const logout = () => {
    // ✅ Hapus dari localStorage
    localStorage.removeItem('sap_csrf_token')
    localStorage.removeItem('sap_username')
    
    setState({
      token: null,
      csrfToken: null,
      isAuthenticated: false,
      userName: '',
      loading: false
    })
  }

  useEffect(() => {
    checkAuth()
  }, [])

  return { ...state, login, logout, checkAuth }
}