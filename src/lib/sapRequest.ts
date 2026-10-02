// src/lib/sapRequest.ts
// Helper terpusat untuk semua request ke SAP dengan automatic server-side retry untuk multi-device session.
// Semua logon SAP melewati sapAuthGuard agar password lama/salah tidak di-retry sampai akun SAP terkunci.

import https from 'https'
import { URL } from 'url'
import { NextResponse } from 'next/server'
import {
  checkSapAuth,
  recordSapAuthFailure,
  recordSapAuthSuccess,
  SapAuthErrorCode,
} from './sapAuthGuard'

const SAP_BASE_URL = process.env.SAP_BASE_URL!
const SAP_CLIENT = process.env.SAP_CLIENT || '800'

export interface SapTokenResult {
  /** HTTP status from SAP (0 = connection failed, 401 = rejected/blocked) */
  status: number
  token: string | null
  cookies: string[]
  errorCode?: SapAuthErrorCode | 'CONNECTION_FAILED'
  message?: string
}

// Concurrent token fetches with the same credential share one SAP logon, so a
// burst of parallel requests with an old password costs one failed attempt, not N.
const inFlightTokenFetches = new Map<string, Promise<SapTokenResult>>()

/**
 * Fetch a CSRF token + session cookies from SAP using Basic Auth.
 * Every SAP logon goes through here so the auth guard can stop retries with a
 * wrong/old password before they lock the SAP account.
 */
export function fetchSapToken(authHeader: string | null, explicitLogin = false): Promise<SapTokenResult> {
  const key = `${explicitLogin ? 'login' : 'auto'}|${authHeader || ''}`
  const pending = inFlightTokenFetches.get(key)
  if (pending) return pending

  const promise = requestSapToken(authHeader, explicitLogin).finally(() => {
    inFlightTokenFetches.delete(key)
  })
  inFlightTokenFetches.set(key, promise)
  return promise
}

function requestSapToken(authHeader: string | null, explicitLogin: boolean): Promise<SapTokenResult> {
  const decision = checkSapAuth(authHeader, explicitLogin)
  if (!decision.allowed) {
    console.warn(`⛔ SAP logon skipped (${decision.code}) — not contacting SAP`)
    return Promise.resolve({
      status: 401,
      token: null,
      cookies: [],
      errorCode: decision.code,
      message: decision.message,
    })
  }

  const target = new URL(`/zrestsap/get-token?sap-client=${SAP_CLIENT}`, SAP_BASE_URL)

  return new Promise<SapTokenResult>((resolve) => {
    const options = {
      hostname: target.hostname,
      port: Number(target.port),
      path: target.pathname + target.search,
      method: 'GET',
      headers: {
        'Authorization': authHeader || '',
        'x-csrf-token': 'fetch',
      },
      rejectUnauthorized: false,
    }

    const req = https.request(options, (res) => {
      res.resume()
      const status = res.statusCode || 500
      const token = (res.headers['x-csrf-token'] as string) || null
      const rawCookies = res.headers['set-cookie'] || []
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies]

      if (status === 401) {
        const failure = recordSapAuthFailure(authHeader)
        resolve({ status, token: null, cookies: [], errorCode: failure.code, message: failure.message })
        return
      }
      if (status >= 200 && status < 300 && token) {
        recordSapAuthSuccess(authHeader)
      }
      resolve({ status, token, cookies })
    })

    req.on('error', (error) => {
      resolve({ status: 0, token: null, cookies: [], errorCode: 'CONNECTION_FAILED', message: error.message })
    })

    req.end()
  })
}

export function sapAuthErrorResponse(code: string | undefined, message: string | undefined): Response {
  return NextResponse.json(
    { error: code || 'INVALID_CREDENTIALS', message: message || 'Kredensial SAP tidak valid' },
    { status: 401 }
  )
}

function executeSapPost(
  path: string,
  postData: string,
  csrfToken: string,
  authHeader: string | null,
  cookieHeader: string | null
): Promise<{ status: number; body: string; headers: Record<string, string | string[] | undefined> }> {
  const target = new URL(path, SAP_BASE_URL)

  return new Promise((resolve) => {
    const options = {
      hostname: target.hostname,
      port: Number(target.port),
      path: target.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-csrf-token': csrfToken || '',
        ...(authHeader ? { 'Authorization': authHeader } : {}),
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      },
      rejectUnauthorized: false,
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        resolve({
          status: res.statusCode || 500,
          body: data,
          headers: res.headers,
        })
      })
    })

    req.on('error', (error) => {
      resolve({
        status: 500,
        body: JSON.stringify({ error: 'CONNECTION_FAILED', message: error.message }),
        headers: {},
      })
    })

    req.write(postData)
    req.end()
  })
}

export async function sapPost(
  path: string,
  body: unknown,
  headers: { csrfToken: string; authHeader: string | null; cookieHeader: string | null }
): Promise<Response> {
  const postData = JSON.stringify(body)

  // Credential already known to be wrong / user temporarily blocked → never hit SAP.
  const decision = checkSapAuth(headers.authHeader)
  if (!decision.allowed) {
    return sapAuthErrorResponse(decision.code, decision.message)
  }

  // Request Pertama
  let res = await executeSapPost(
    path,
    postData,
    headers.csrfToken,
    headers.authHeader,
    headers.cookieHeader
  )

  console.log(`SAP [${path}] Status:`, res.status)

  // 401 while sending Basic Auth = SAP rejected the password (changed / locked).
  // Do NOT retry — every retry is another failed logon that pushes the SAP
  // account towards being locked.
  if (res.status === 401 && headers.authHeader) {
    const failure = recordSapAuthFailure(headers.authHeader)
    return sapAuthErrorResponse(failure.code, failure.message)
  }

  // 403 = CSRF token / session expired (e.g. the account logged in on another
  // device). Fetch a fresh token once and retry on the server.
  if (res.status === 403 && headers.authHeader) {
    console.warn(`⚠️ SAP [${path}] got 403. Refreshing SAP session & retrying on server...`)

    const fresh = await fetchSapToken(headers.authHeader)

    if (fresh.status === 401) {
      return sapAuthErrorResponse(fresh.errorCode, fresh.message)
    }

    if (fresh.token) {
      const freshCookieHeader = fresh.cookies.map((c) => c.split(';')[0]).join('; ')

      res = await executeSapPost(
        path,
        postData,
        fresh.token,
        headers.authHeader,
        freshCookieHeader
      )

      console.log(`🔄 SAP [${path}] Server Retry Status:`, res.status)

      if (res.status === 401) {
        const failure = recordSapAuthFailure(headers.authHeader)
        return sapAuthErrorResponse(failure.code, failure.message)
      }

      if (res.status >= 200 && res.status < 300) {
        try {
          const parsed = JSON.parse(res.body)
          const responseObj = NextResponse.json(parsed, { status: res.status })

          responseObj.headers.set('x-csrf-token', fresh.token)
          fresh.cookies.forEach((cookieStr) => {
            responseObj.headers.append('Set-Cookie', cookieStr)
          })

          return responseObj
        } catch {
          // parse error
        }
      }
    }
  }

  // Handle standard responses
  if (res.status === 403) {
    return NextResponse.json(
      { error: 'CSRF_EXPIRED', message: 'CSRF token expired or invalid' },
      { status: 403 }
    )
  }

  if (res.status === 401) {
    return NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const parsed = JSON.parse(res.body)
    return NextResponse.json(parsed, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: 'PARSE_ERROR', message: 'Invalid response from SAP', raw: res.body },
      { status: 500 }
    )
  }
}
