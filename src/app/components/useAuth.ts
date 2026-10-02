// src/app/components/useAuth.ts
'use client'

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { SAP_CREDENTIAL_REJECTED_EVENT } from '@/lib/fetchWithTokenRefresh'

interface AuthState {
  csrfToken: string | null
  isAuthenticated: boolean
  userName: string
  loading: boolean
  /** Pesan kenapa sesi diakhiri / login ditolak (ditampilkan di halaman login) */
  authError: string | null
}

interface TokenResult {
  token: string | null
  /** Terisi bila SAP menolak kredensial (401) — JANGAN retry dengan password yang sama */
  rejected?: { code: string; message: string }
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>
  logout: (clearStorage?: boolean) => void
  checkAuth: () => Promise<boolean>
  refreshToken: () => Promise<string | null>
  /** Dipanggil saat SAP menolak password tersimpan: hapus kredensial & stop semua auto-login */
  handleCredentialRejected: (message?: string) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

// Interval refresh token (ms). Harus lebih pendek dari TTL SAP.
const TOKEN_REFRESH_INTERVAL_MS = 20 * 60 * 1000
const MAX_REFRESH_FAILURES = 3
const API_BASE = '/api/sap-proxy'
const AUTH_ERROR_KEY = 'sap_auth_error'
const DEFAULT_REJECTED_MSG =
  'Password SAP tidak valid (mungkin sudah diganti). Silakan login ulang dengan password terbaru.'

function readStoredAuthError(): string | null {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(AUTH_ERROR_KEY) : null
  } catch {
    return null
  }
}

function clearStoredCredentials() {
  localStorage.removeItem('sap_csrf_token')
  localStorage.removeItem('sap_username')
  localStorage.removeItem('sap_password_enc')
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    csrfToken: null,
    isAuthenticated: false,
    userName: '',
    loading: true,
    authError: null,
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
    password: string,
    explicitLogin = false
  ): Promise<TokenResult> => {
    try {
      const response = await fetch(API_BASE, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
          ...(explicitLogin ? { 'x-sap-login': '1' } : {}),
        },
      })
      if (response.status === 401) {
        const json = await response.json().catch(() => ({})) as any
        return {
          token: null,
          rejected: {
            code: json?.error || 'INVALID_CREDENTIALS',
            message: json?.message || DEFAULT_REJECTED_MSG,
          },
        }
      }
      if (!response.ok) return { token: null }
      return { token: response.headers.get('x-csrf-token') }
    } catch {
      return { token: null }
    }
  }, [])

  const logout = useCallback((clearStorage = true) => {
    stopRefreshInterval()
    credentialsRef.current = null

    if (clearStorage) {
      clearStoredCredentials()
    }

    setState(prev => ({
      csrfToken: null,
      isAuthenticated: false,
      userName: '',
      loading: false,
      authError: clearStorage ? null : prev.authError,
    }))
  }, [stopRefreshInterval])

  /**
   * SAP menolak password tersimpan (password diganti / akun dikunci).
   * Hapus kredensial dari storage SEKARANG supaya tidak ada auto-login lagi
   * (interval, tab lain, reload halaman) yang menambah hitungan salah password di SAP.
   */
  const handleCredentialRejected = useCallback((message?: string) => {
    const msg = message || DEFAULT_REJECTED_MSG
    console.error('❌ SAP credential rejected — stopping all auto re-login:', msg)
    stopRefreshInterval()
    credentialsRef.current = null
    try {
      clearStoredCredentials()
      localStorage.setItem(AUTH_ERROR_KEY, msg)
    } catch {
      // ignore storage errors
    }
    setState({
      csrfToken: null,
      isAuthenticated: false,
      userName: '',
      loading: false,
      authError: msg,
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
      const { token: newToken, rejected } = await fetchCsrfToken(creds.username, creds.password)

      if (rejected) {
        // Password ditolak SAP → stop seketika, jangan coba lagi
        handleCredentialRejected(rejected.message)
        return
      }

      if (newToken) {
        failureCountRef.current = 0
        localStorage.setItem('sap_csrf_token', newToken)
        setState(prev => ({ ...prev, csrfToken: newToken, isAuthenticated: true }))
      } else {
        // Hanya gangguan jaringan / server — boleh dicoba lagi di interval berikutnya
        failureCountRef.current += 1
        if (failureCountRef.current >= MAX_REFRESH_FAILURES) {
          logout(true)
        }
      }
    }, TOKEN_REFRESH_INTERVAL_MS)
  }, [stopRefreshInterval, fetchCsrfToken, logout, handleCredentialRejected])

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
        const { token: newToken, rejected } = await fetchCsrfToken(creds!.username, creds!.password)
        if (rejected) {
          handleCredentialRejected(rejected.message)
          return null
        }
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
  }, [fetchCsrfToken, handleCredentialRejected])

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const savedToken   = localStorage.getItem('sap_csrf_token')
      const savedUser    = localStorage.getItem('sap_username')
      const savedPassEnc = localStorage.getItem('sap_password_enc')

      if (savedToken && savedUser && savedPassEnc) {
        const savedPass = atob(savedPassEnc)
        credentialsRef.current = { username: savedUser, password: savedPass }

        // Verifikasi password tersimpan ke SAP DULU (1x saja) sebelum menandai
        // sesi aktif. Kalau state di-set authenticated lebih awal, halaman langsung
        // menembak request data secara paralel dengan password yang mungkin sudah
        // diganti → beberapa salah-password sekaligus di SAP.
        const { token: freshToken, rejected } = await fetchCsrfToken(savedUser, savedPass)
        if (rejected) {
          handleCredentialRejected(rejected.message)
          return false
        }
        if (freshToken) {
          localStorage.setItem('sap_csrf_token', freshToken)
        }

        // Token baru, atau token tersimpan bila SAP sementara tidak bisa dihubungi
        setState({
          csrfToken: freshToken || savedToken,
          isAuthenticated: true,
          userName: savedUser,
          loading: false,
          authError: null,
        })

        startRefreshInterval(savedUser, savedPass)
        return true
      }

      setState(prev => ({ ...prev, loading: false, authError: readStoredAuthError() }))
      return false
    } catch (error) {
      console.error('Check auth error:', error)
      setState(prev => ({ ...prev, loading: false }))
      return false
    }
  }, [fetchCsrfToken, startRefreshInterval, handleCredentialRejected])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true }))
      const { token: csrfToken, rejected } = await fetchCsrfToken(username, password, true)

      if (!csrfToken) {
        setState(prev => ({
          ...prev,
          loading: false,
          authError: rejected?.message || 'Login gagal. Server SAP tidak dapat dihubungi.',
        }))
        return false
      }

      try { localStorage.removeItem(AUTH_ERROR_KEY) } catch { /* ignore */ }
      localStorage.setItem('sap_csrf_token', csrfToken)
      localStorage.setItem('sap_username', username)
      localStorage.setItem('sap_password_enc', btoa(password))

      credentialsRef.current = { username, password }

      setState({
        csrfToken,
        isAuthenticated: true,
        userName: username,
        loading: false,
        authError: null,
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

  // Sinkron antar tab: bila tab lain logout / mendeteksi password ditolak,
  // tab ini ikut berhenti (tidak lanjut auto-refresh dengan password lama).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sap_password_enc' && !e.newValue && credentialsRef.current) {
        const msg = readStoredAuthError()
        if (msg) handleCredentialRejected(msg)
        else logout(false)
      }
    }
    // Dipancarkan fetchWithTokenRefresh saat API data mendapat INVALID_CREDENTIALS
    const onRejected = (e: Event) => {
      handleCredentialRejected((e as CustomEvent<{ message?: string }>).detail?.message)
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener(SAP_CREDENTIAL_REJECTED_EVENT, onRejected)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener(SAP_CREDENTIAL_REJECTED_EVENT, onRejected)
    }
  }, [handleCredentialRejected, logout])

  return React.createElement(
    AuthContext.Provider,
    { value: { ...state, login, logout, checkAuth, refreshToken, handleCredentialRejected } },
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
