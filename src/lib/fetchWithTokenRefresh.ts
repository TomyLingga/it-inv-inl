// src/lib/fetchWithTokenRefresh.ts
//
// Helper untuk fetch ke SAP API dengan auto-retry saat token 403.
// Jika token expired (403), coba refresh dulu lalu ulangi request.
// Baru logout jika refresh pun gagal.

export interface SapFetchOptions {
  url: string
  method?: 'GET' | 'POST'
  body?: unknown
  csrfToken: string
  /** Fungsi refresh dari useAuth — mengembalikan token baru atau null */
  refreshToken: () => Promise<string | null>
  /** Fungsi logout dari useAuth */
  logout: (clearStorage?: boolean) => void
  /** Router untuk redirect setelah logout */
  onLogout?: () => void
}

export interface SapFetchResult<T> {
  data: T | null
  error: string | null
  /** true jika user di-logout karena token tidak bisa diperbarui */
  didLogout: boolean
}

export async function fetchWithTokenRefresh<T = any>(
  opts: SapFetchOptions
): Promise<SapFetchResult<T>> {
  const doFetch = async (token: string): Promise<Response> => {
    return fetch(opts.url, {
      method: opts.method ?? 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
      },
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    })
  }

  let res = await doFetch(opts.csrfToken)

  // ── Jika 403/401: coba refresh token dan ulangi sekali ─────────────────────
  if (res.status === 403 || res.status === 401) {
    console.warn(`⚠️ Got ${res.status} from SAP, attempting token refresh...`)
    const newToken = await opts.refreshToken()

    if (newToken) {
      console.log('✅ Token refreshed, retrying request...')
      res = await doFetch(newToken)
    }

    // Jika masih 403/401 setelah refresh → logout
    if (res.status === 403 || res.status === 401) {
      console.error('❌ Still unauthorized after refresh, logging out')
      opts.logout(true)
      opts.onLogout?.()
      return { data: null, error: 'Session berakhir. Silakan login kembali.', didLogout: true }
    }
  }

  // ── Error lain ──────────────────────────────────────────────────────────────
  if (!res.ok) {
    const errJson = await res.json().catch(() => ({})) as any
    const msg = errJson?.message || `Error ${res.status}`
    return { data: null, error: msg, didLogout: false }
  }

  // ── Sukses ─────────────────────────────────────────────────────────────────
  try {
    const json = await res.json() as any
    const data: T = Array.isArray(json) ? json : (json.data ?? json.results ?? json)
    return { data, error: null, didLogout: false }
  } catch {
    return { data: null, error: 'Response tidak bisa di-parse', didLogout: false }
  }
}
