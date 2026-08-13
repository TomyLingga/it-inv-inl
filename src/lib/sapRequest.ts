// src/lib/sapRequest.ts
// Helper terpusat untuk semua request ke SAP dengan automatic server-side retry untuk multi-device session

import https from 'https'
import { URL } from 'url'
import { NextResponse } from 'next/server'

const SAP_BASE_URL = process.env.SAP_BASE_URL!
const SAP_CLIENT = process.env.SAP_CLIENT || '800'

interface SapTokenResult {
  token: string | null
  cookies: string[]
}

/** Fetch fresh CSRF token and session cookies directly from SAP using Basic Auth */
function fetchFreshToken(authHeader: string): Promise<SapTokenResult> {
  const target = new URL(`/zrestsap/get-token?sap-client=${SAP_CLIENT}`, SAP_BASE_URL)

  return new Promise<SapTokenResult>((resolve) => {
    const options = {
      hostname: target.hostname,
      port: Number(target.port),
      path: target.pathname,
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'x-csrf-token': 'fetch',
      },
      rejectUnauthorized: false,
    }

    const req = https.request(options, (res) => {
      const token = (res.headers['x-csrf-token'] as string) || null
      const rawCookies = res.headers['set-cookie'] || []
      const cookies = Array.isArray(rawCookies) ? rawCookies : [rawCookies]
      resolve({ token, cookies })
    })

    req.on('error', () => {
      resolve({ token: null, cookies: [] })
    })

    req.end()
  })
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

  // Request Pertama
  let res = await executeSapPost(
    path,
    postData,
    headers.csrfToken,
    headers.authHeader,
    headers.cookieHeader
  )

  console.log(`SAP [${path}] Status:`, res.status)

  // Jika 403 atau 401 (misal karena akun login di device/browser lain sehingga session cookie ter-reset):
  // Coba ambil token & cookie baru secara transparan menggunakan Basic Auth lalu ulangi secara otomatis di server!
  if ((res.status === 403 || res.status === 401) && headers.authHeader) {
    console.warn(`⚠️ SAP [${path}] got ${res.status}. Auto-refreshing SAP session & retrying on server...`)

    const fresh = await fetchFreshToken(headers.authHeader)

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
