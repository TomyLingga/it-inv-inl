// src/app/components/useAuth.ts
'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'

interface AuthState {
  csrfToken: string | null
  isAuthenticated: boolean
  userName: string
  loading: boolean
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>
  logout: (clearStorage?: boolean) => void
  checkAuth: () => Promise<boolean>
  refreshToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthContextType | null>(null)

// Interval refresh token (ms). Harus lebih pendek dari TTL SAP.
const TOKEN_REFRESH_INTERVAL_MS = 20 * 60 * 1000
const MAX_REFRESH_FAILURES = 3
const API_BASE = '/api/sap-proxy'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    csrfToken: null,
    isAuthenticated: false,
    userName: '',
    loading: true,
  })

  const credentialsRef = useRef<{ username: string; password: string } | null>(null)
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const failureCountRef = useRef(0)
  const isRefreshingRef = useRef<Promise<string | null> | null>(null)

  const stopRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }
    failureCountRef.current = 0
  }, [])

  /** Ambil CSRF token dari SAP menggunakan Basic Auth */
  const fetchCsrfToken = useCallback(async (
    username: string,
    password: string
  ): Promise<string | null> => {
    try {
      const response = await fetch(API_BASE, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
        },
      })
      if (!response.ok) return null
      return response.headers.get('x-csrf-token')
    } catch {
      return null
    }
  }, [])

  const logout = useCallback((clearStorage = true) => {
    stopRefreshInterval()
    credentialsRef.current = null

    if (clearStorage) {
      localStorage.removeItem('sap_csrf_token')
      localStorage.removeItem('sap_username')
      localStorage.removeItem('sap_password_enc')
    }

    setState({
      csrfToken: null,
      isAuthenticated: false,
      userName: '',
      loading: false,
    })
  }, [stopRefreshInterval])

  const startRefreshInterval = useCallback((username: string, password: string) => {
    stopRefreshInterval()

    refreshIntervalRef.current = setInterval(async () => {
      const creds = credentialsRef.current
      if (!creds) {
        stopRefreshInterval()
        return
      }

      console.log('🔄 Auto-refreshing SAP token...')
      const newToken = await fetchCsrfToken(creds.username, creds.password)

      if (newToken) {
        failureCountRef.current = 0
        localStorage.setItem('sap_csrf_token', newToken)
        setState(prev => ({ ...prev, csrfToken: newToken, isAuthenticated: true }))
      } else {
        failureCountRef.current += 1
        if (failureCountRef.current >= MAX_REFRESH_FAILURES) {
          logout(true)
        }
      }
    }, TOKEN_REFRESH_INTERVAL_MS)
  }, [stopRefreshInterval, fetchCsrfToken, logout])

  /**
   * Manual token refresh (deduplicated — hanya 1 request aktif)
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    if (isRefreshingRef.current) {
      return isRefreshingRef.current
    }

    let creds = credentialsRef.current
    if (!creds) {
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('sap_username') : null
      const savedPassEnc = typeof window !== 'undefined' ? localStorage.getItem('sap_password_enc') : null
      if (savedUser && savedPassEnc) {
        creds = { username: savedUser, password: atob(savedPassEnc) }
        credentialsRef.current = creds
      } else {
        return null
      }
    }

    const refreshPromise = (async () => {
      try {
        console.log('🔄 Single deduplicated token refresh triggered...')
        const newToken = await fetchCsrfToken(creds!.username, creds!.password)
        if (newToken) {
          failureCountRef.current = 0
          localStorage.setItem('sap_csrf_token', newToken)
          setState(prev => ({ ...prev, csrfToken: newToken, isAuthenticated: true }))
          return newToken
        }
        return null
      } finally {
        isRefreshingRef.current = null
      }
    })()

    isRefreshingRef.current = refreshPromise
    return refreshPromise
  }, [fetchCsrfToken])

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const savedToken   = localStorage.getItem('sap_csrf_token')
      const savedUser    = localStorage.getItem('sap_username')
      const savedPassEnc = localStorage.getItem('sap_password_enc')

      if (savedToken && savedUser && savedPassEnc) {
        const savedPass = atob(savedPassEnc)
        credentialsRef.current = { username: savedUser, password: savedPass }

        // Set state awal dari localStorage
        setState({
          csrfToken: savedToken,
          isAuthenticated: true,
          userName: savedUser,
          loading: false,
        })

        // Ambil token & cookie baru yang valid dari SAP (1x saja)
        const freshToken = await fetchCsrfToken(savedUser, savedPass)
        if (freshToken) {
          localStorage.setItem('sap_csrf_token', freshToken)
          setState(prev => ({ ...prev, csrfToken: freshToken, isAuthenticated: true, loading: false }))
        }

        startRefreshInterval(savedUser, savedPass)
        return true
      }

      setState(prev => ({ ...prev, loading: false }))
      return false
    } catch (error) {
      console.error('Check auth error:', error)
      setState(prev => ({ ...prev, loading: false }))
      return false
    }
  }, [fetchCsrfToken, startRefreshInterval])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true }))
      const csrfToken = await fetchCsrfToken(username, password)

      if (!csrfToken) {
        setState(prev => ({ ...prev, loading: false }))
        return false
      }

      localStorage.setItem('sap_csrf_token', csrfToken)
      localStorage.setItem('sap_username', username)
      localStorage.setItem('sap_password_enc', btoa(password))

      credentialsRef.current = { username, password }

      setState({
        csrfToken,
        isAuthenticated: true,
        userName: username,
        loading: false,
      })

      startRefreshInterval(username, password)
      return true
    } catch (error) {
      console.error('Login error:', error)
      setState(prev => ({ ...prev, loading: false }))
      return false
    }
  }, [fetchCsrfToken, startRefreshInterval])

  useEffect(() => {
    checkAuth()
    return () => stopRefreshInterval()
  }, [])

  return React.createElement(
    AuthContext.Provider,
    { value: { ...state, login, logout, checkAuth, refreshToken } },
    children
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
