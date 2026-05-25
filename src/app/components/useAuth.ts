// src/app/components/useAuth.ts
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface AuthState {
  csrfToken: string | null
  isAuthenticated: boolean
  userName: string
  loading: boolean
}

// Interval refresh token (ms). Harus lebih pendek dari TTL SAP.
// SAP biasanya 30 menit — kita refresh tiap 20 menit.
const TOKEN_REFRESH_INTERVAL_MS = 20 * 60 * 1000

// Berapa kali boleh gagal refresh sebelum benar-benar logout
const MAX_REFRESH_FAILURES = 3

const API_BASE = '/api/sap-proxy'

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    csrfToken: null,
    isAuthenticated: false,
    userName: '',
    loading: true,
  })

  // Simpan credentials di ref — tidak re-render, tetap tersedia di interval callback
  const credentialsRef = useRef<{ username: string; password: string } | null>(null)
  // Gunakan setInterval (bukan setTimeout rekursif) agar timer tidak pernah "hilang"
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Hitung kegagalan berturut-turut agar tidak logout karena network blip sesaat
  const failureCountRef = useRef(0)

  // ─── Helpers ────────────────────────────────────────────────────────────────

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

  // ─── Logout ─────────────────────────────────────────────────────────────────

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

  // ─── Start interval refresh ──────────────────────────────────────────────────

  const startRefreshInterval = useCallback((username: string, password: string) => {
    // Hentikan yang lama dulu agar tidak double-run
    stopRefreshInterval()

    refreshIntervalRef.current = setInterval(async () => {
      // Ambil credentials dari ref (selalu fresh, tidak stale closure)
      const creds = credentialsRef.current
      if (!creds) {
        console.warn('⚠️ No credentials in ref, stopping refresh')
        stopRefreshInterval()
        return
      }

      console.log('🔄 Auto-refreshing SAP token...')
      const newToken = await fetchCsrfToken(creds.username, creds.password)

      if (newToken) {
        failureCountRef.current = 0
        localStorage.setItem('sap_csrf_token', newToken)
        setState(prev => ({ ...prev, csrfToken: newToken }))
        console.log('✅ Token refreshed successfully')
      } else {
        failureCountRef.current += 1
        console.warn(`⚠️ Token refresh failed (${failureCountRef.current}/${MAX_REFRESH_FAILURES})`)

        if (failureCountRef.current >= MAX_REFRESH_FAILURES) {
          console.error('❌ Max refresh failures reached, logging out')
          // Gunakan clearStorage=true karena token benar-benar tidak bisa diperbarui
          logout(true)
        }
        // Jika belum mencapai limit, biarkan interval berjalan dan coba lagi
      }
    }, TOKEN_REFRESH_INTERVAL_MS)

    console.log(`🕐 Token refresh interval started (every ${TOKEN_REFRESH_INTERVAL_MS / 60000} min)`)
  }, [stopRefreshInterval, fetchCsrfToken, logout])

  // ─── refreshToken (bisa dipanggil dari luar, misal saat dapat 403) ──────────

  /**
   * Coba refresh token secara manual (dipanggil saat request SAP dapat 403).
   * Return token baru jika berhasil, null jika gagal.
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    const creds = credentialsRef.current
    if (!creds) return null

    console.log('🔄 Manual token refresh triggered...')
    const newToken = await fetchCsrfToken(creds.username, creds.password)
    if (newToken) {
      failureCountRef.current = 0
      localStorage.setItem('sap_csrf_token', newToken)
      setState(prev => ({ ...prev, csrfToken: newToken }))
      console.log('✅ Manual token refresh success')
      return newToken
    }
    return null
  }, [fetchCsrfToken])

  // ─── checkAuth ──────────────────────────────────────────────────────────────

  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const savedToken   = localStorage.getItem('sap_csrf_token')
      const savedUser    = localStorage.getItem('sap_username')
      const savedPassEnc = localStorage.getItem('sap_password_enc')

      if (savedToken && savedUser && savedPassEnc) {
        const savedPass = atob(savedPassEnc)
        credentialsRef.current = { username: savedUser, password: savedPass }

        setState({
          csrfToken: savedToken,
          isAuthenticated: true,
          userName: savedUser,
          loading: false,
        })

        // Langsung refresh token sekarang untuk memastikan masih valid,
        // kemudian jadwalkan interval rutin
        const freshToken = await fetchCsrfToken(savedUser, savedPass)
        if (freshToken) {
          localStorage.setItem('sap_csrf_token', freshToken)
          setState(prev => ({ ...prev, csrfToken: freshToken }))
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

  // ─── Login ──────────────────────────────────────────────────────────────────

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
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
      localStorage.setItem('sap_password_enc', btoa(password))

      // Simpan credentials di ref untuk interval refresh
      credentialsRef.current = { username, password }

      setState({
        csrfToken,
        isAuthenticated: true,
        userName: username,
        loading: false,
      })

      // Mulai interval refresh
      startRefreshInterval(username, password)
      return true
    } catch (error) {
      console.error('💥 Login exception:', error)
      setState(prev => ({ ...prev, loading: false }))
      return false
    }
  }, [fetchCsrfToken, startRefreshInterval])

  // ─── Init ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    checkAuth()
    return () => stopRefreshInterval() // cleanup saat unmount
  }, [checkAuth, stopRefreshInterval])

  return { ...state, login, logout, checkAuth, refreshToken }
}
