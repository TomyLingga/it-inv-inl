// src/lib/fetchWithTokenRefresh.ts
//
// Helper untuk fetch ke SAP API dengan auto-retry saat token 403.
// Jika token expired (403), coba refresh dulu lalu ulangi request.
// Baru logout jika refresh pun gagal.
// Jika SAP menolak password (diganti/terkunci) → langsung logout tanpa retry.

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

/** Kode error dari server bila SAP menolak password (lihat sapAuthGuard) */
const CREDENTIAL_ERROR_CODES = new Set(['INVALID_CREDENTIALS', 'CREDENTIALS_BLOCKED'])

/** Event yang didengar AuthProvider → hapus kredensial & hentikan semua auto-login */
export const SAP_CREDENTIAL_REJECTED_EVENT = 'sap:credential-rejected'

/** Return pesan error bila response adalah penolakan kredensial, selain itu null */
async function readCredentialRejection(res: Response): Promise<string | null> {
  if (res.status !== 401) return null
  const json = await res.clone().json().catch(() => ({})) as any
  if (!CREDENTIAL_ERROR_CODES.has(json?.error)) return null
  return json?.message || 'Password SAP tidak valid. Silakan login ulang.'
}

function getAuthHeader(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const savedUser = localStorage.getItem('sap_username')
    const savedPassEnc = localStorage.getItem('sap_password_enc')
    if (savedUser && savedPassEnc) {
      const savedPass = atob(savedPassEnc)
      return `Basic ${btoa(`${savedUser}:${savedPass}`)}`
    }
  } catch {
    // Ignore error
  }
  return null
}

export async function fetchWithTokenRefresh<T = any>(
  opts: SapFetchOptions
): Promise<SapFetchResult<T>> {
  const authHeader = getAuthHeader()

  const doFetch = async (token: string): Promise<Response> => {
    return fetch(opts.url, {
      method: opts.method ?? 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': token,
        ...(authHeader ? { 'Authorization': authHeader } : {}),
      },
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
    })
  }

  const rejectCredentials = (message: string): SapFetchResult<T> => {
    // Password ditolak SAP: JANGAN refresh/retry (tiap percobaan = salah password di SAP)
    window.dispatchEvent(new CustomEvent(SAP_CREDENTIAL_REJECTED_EVENT, { detail: { message } }))
    opts.onLogout?.()
    return { data: null, error: message, didLogout: true }
  }

  let res = await doFetch(opts.csrfToken)

  const rejected = await readCredentialRejection(res)
  if (rejected) return rejectCredentials(rejected)

  // ── Jika 403/401 (token/session expired): coba refresh token dan ulangi sekali ──
  if (res.status === 403 || res.status === 401) {
    console.warn(`⚠️ Got ${res.status} from SAP, attempting token refresh...`)
    const newToken = await opts.refreshToken()

    if (newToken) {
      console.log('✅ Token refreshed, retrying request...')
      res = await doFetch(newToken)
      const rejectedRetry = await readCredentialRejection(res)
      if (rejectedRetry) return rejectCredentials(rejectedRetry)
    } else if (!localStorage.getItem('sap_password_enc')) {
      // refreshToken() mendeteksi password ditolak & sudah menghapus kredensial
      opts.onLogout?.()
      return { data: null, error: 'Sesi SAP berakhir. Silakan login ulang.', didLogout: true }
    }

    // Jika masih 403/401 setelah refresh → jangan loop, kembalikan error
    if (res.status === 403 || res.status === 401) {
      console.error('❌ Still unauthorized after refresh attempt')
      return { data: null, error: 'Akses SAP ditolak (Status 403). Silakan periksa kredensial.', didLogout: false }
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
