// src/app/components/useAuth.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface AuthState {
  csrfToken: string | null
  isAuthenticated: boolean
  userName: string
  loading: boolean
}

// Durasi token sebelum di-refresh (dalam milidetik).
// Set lebih pendek dari TTL asli SAP agar tidak sempat expired.
// Contoh: SAP expired 30 menit → kita refresh tiap 20 menit.
const TOKEN_REFRESH_INTERVAL_MS = 5 * 60 * 1000

const API_BASE = '/api/sap-proxy'

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    csrfToken: null,
    isAuthenticated: false,
    userName: '',
    loading: true,
  })

  // Simpan credentials di ref — tidak perlu re-render, tapi tetap tersedia saat refresh
  const credentialsRef = useRef<{ username: string; password: string } | null>(null)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
      refreshTimerRef.current = null
    }
  }

  /** Ambil CSRF token dari SAP menggunakan Basic Auth */
  const fetchCsrfToken = async (username: string, password: string): Promise<string | null> => {
    const response = await fetch(API_BASE, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`,
      },
    })

    if (!response.ok) return null
    return response.headers.get('x-csrf-token')
  }

  /** Jadwalkan auto-refresh token */
  const scheduleRefresh = useCallback((username: string, password: string) => {
    clearRefreshTimer()
    refreshTimerRef.current = setTimeout(async () => {
      console.log('🔄 Auto-refreshing SAP token...')
      try {
        const newToken = await fetchCsrfToken(username, password)
        if (newToken) {
          localStorage.setItem('sap_csrf_token', newToken)
          setState(prev => ({ ...prev, csrfToken: newToken }))
          console.log('✅ Token refreshed successfully')
          // Jadwalkan refresh berikutnya
          scheduleRefresh(username, password)
        } else {
          // Gagal refresh → paksa logout
          console.warn('⚠️ Token refresh failed, logging out')
          logout(false)
        }
      } catch (err) {
        console.error('❌ Token refresh error:', err)
        logout(false)
      }
    }, TOKEN_REFRESH_INTERVAL_MS)
  }, [])

  // ─── checkAuth ────────────────────────────────────────────────────────────

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const savedToken    = localStorage.getItem('sap_csrf_token')
      const savedUser     = localStorage.getItem('sap_username')
      // Password disimpan terenkripsi ringan dengan btoa agar tidak plain-text di storage.
      // Untuk keamanan lebih tinggi, gunakan Web Crypto API atau server-side session.
      const savedPassEnc  = localStorage.getItem('sap_password_enc')

      if (savedToken && savedUser && savedPassEnc) {
        const savedPass = atob(savedPassEnc)
        credentialsRef.current = { username: savedUser, password: savedPass }

        setState({
          csrfToken: savedToken,
          isAuthenticated: true,
          userName: savedUser,
          loading: false,
        })

        // Mulai jadwal refresh
        scheduleRefresh(savedUser, savedPass)
        return true
      }

      setState(prev => ({ ...prev, loading: false }))
      return false
    } catch (error) {
      console.error('Check auth error:', error)
      setState(prev => ({ ...prev, loading: false }))
      return false
    }
  }, [scheduleRefresh])

  // ─── Login ────────────────────────────────────────────────────────────────

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true }))
      console.log('🔐 Attempting login for:', username)

      const csrfToken = await fetchCsrfToken(username, password)

      if (!csrfToken) {
        setState(prev => ({ ...prev, loading: false }))
        return false
      }

      console.log('✅ Login success')

      // Simpan ke localStorage
      localStorage.setItem('sap_csrf_token', csrfToken)
      localStorage.setItem('sap_username', username)
      localStorage.setItem('sap_password_enc', btoa(password)) // enkripsi ringan

      // Simpan credentials di ref untuk refresh otomatis
      credentialsRef.current = { username, password }

      setState({
        csrfToken,
        isAuthenticated: true,
        userName: username,
        loading: false,
      })

      // Mulai jadwal refresh
      scheduleRefresh(username, password)
      return true
    } catch (error) {
      console.error('💥 Login exception:', error)
      setState(prev => ({ ...prev, loading: false }))
      return false
    }
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  /**
   * @param clearStorage - true (default): hapus semua data dari storage.
   *   Dipanggil false hanya dari refresh-gagal agar tidak infinite loop.
   */
  const logout = useCallback((clearStorage = true) => {
    clearRefreshTimer()
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
  }, [])

  // ─── Init ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    checkAuth()
    return () => clearRefreshTimer() // cleanup saat unmount
  }, [checkAuth])

  return { ...state, login, logout, checkAuth }
}
