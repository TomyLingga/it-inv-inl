// src/lib/sapRequest.ts
// Helper terpusat untuk semua request ke SAP — tidak perlu duplikasi di setiap route

import https from 'https'
import { URL } from 'url'
import { NextResponse } from 'next/server'

const SAP_BASE_URL = process.env.SAP_BASE_URL!

export function sapPost(
  path: string,
  body: unknown,
  headers: { csrfToken: string; authHeader: string | null; cookieHeader: string | null }
): Promise<Response> {
  const postData = JSON.stringify(body)
  const target = new URL(path, SAP_BASE_URL)

  return new Promise<Response>((resolve) => {
    const options = {
      hostname: target.hostname,
      port: Number(target.port),
      path: target.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-csrf-token': headers.csrfToken || '',
        ...(headers.authHeader && { 'Authorization': headers.authHeader }),
        ...(headers.cookieHeader && { 'Cookie': headers.cookieHeader }),
      },
      rejectUnauthorized: false,
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        console.log(`SAP [${path}] Status:`, res.statusCode)

        if (res.statusCode === 403) {
          resolve(NextResponse.json(
            { error: 'CSRF_EXPIRED', message: 'CSRF token expired or invalid' },
            { status: 403 }
          ))
          return
        }

        if (res.statusCode === 401) {
          resolve(NextResponse.json(
            { error: 'UNAUTHORIZED', message: 'Unauthorized' },
            { status: 401 }
          ))
          return
        }

        try {
          const parsed = JSON.parse(data)
          resolve(NextResponse.json(parsed, { status: res.statusCode || 200 }))
        } catch {
          resolve(NextResponse.json(
            { error: 'PARSE_ERROR', message: 'Invalid response from SAP', raw: data },
            { status: 500 }
          ))
        }
      })
    })

    req.on('error', (error) => {
      console.error(`❌ SAP [${path}] Error:`, error)
      resolve(NextResponse.json(
        { error: 'CONNECTION_FAILED', message: error.message },
        { status: 500 }
      ))
    })

    req.write(postData)
    req.end()
  })
}
