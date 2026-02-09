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

  const API_BASE = '/api/sap-proxy' // ← PAKAI PROXY

  // Cek token valid
  const checkAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch(API_BASE, {
        method: 'GET',
        credentials: 'include',
      })

      if (response.ok) {
        const csrfToken = response.headers.get('x-csrf-token')
        setState({
          token: csrfToken || null,
          csrfToken: csrfToken || null,
          isAuthenticated: true,
          userName: 'SAP User',
          loading: false
        })
        return true
      }
      
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
      
      const response = await fetch(API_BASE, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`
        }
      })

      if (!response.ok) {
        setState(prev => ({ ...prev, loading: false }))
        return false
      }

      const csrfToken = response.headers.get('x-csrf-token')
      
      setState({
        token: csrfToken || null,
        csrfToken: csrfToken || null,
        isAuthenticated: true,
        userName: username,
        loading: false
      })
      return true
    } catch (error) {
      console.error('Login error:', error)
      setState(prev => ({ ...prev, loading: false }))
      return false
    }
  }

  // Logout
  const logout = () => {
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