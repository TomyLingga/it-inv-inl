// src/app/api/pengeluaran/route.ts

import { NextRequest, NextResponse } from 'next/server'
import https from 'https'

export async function POST(request: NextRequest) {
  const csrfToken = request.headers.get('x-csrf-token')
  const authHeader = request.headers.get('authorization')
  const cookieHeader = request.headers.get('cookie')

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const postData = JSON.stringify(body)

  return new Promise((resolve) => {
    const options = {
      hostname: '108.136.81.204',
      port: 44303,
      path: '/zrestsap/pengeluaran-inl',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-csrf-token': csrfToken || '',
        ...(authHeader && { 'Authorization': authHeader }),
        ...(cookieHeader && { 'Cookie': cookieHeader }),
      },
      rejectUnauthorized: false,
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        console.log('SAP Pengeluaran Status:', res.statusCode)

        // CSRF token expired / invalid — client harus logout
        if (res.statusCode === 403) {
          resolve(
            NextResponse.json(
              { error: 'CSRF_INVALID', message: 'CSRF token validation failed' },
              { status: 403 }
            )
          )
          return
        }

        if (res.statusCode === 401) {
          resolve(
            NextResponse.json(
              { error: 'UNAUTHORIZED', message: 'Unauthorized' },
              { status: 401 }
            )
          )
          return
        }

        try {
          const parsed = JSON.parse(data)
          resolve(
            NextResponse.json(parsed, { status: res.statusCode || 200 })
          )
        } catch {
          resolve(
            NextResponse.json(
              { error: 'PARSE_ERROR', message: 'Invalid response from SAP', raw: data },
              { status: 500 }
            )
          )
        }
      })
    })

    req.on('error', (error) => {
      console.error('❌ Pengeluaran Request Error:', error)
      resolve(
        NextResponse.json(
          { error: 'CONNECTION_FAILED', message: error.message },
          { status: 500 }
        )
      )
    })

    req.write(postData)
    req.end()
  })
}
