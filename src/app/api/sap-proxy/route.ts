// src/app/api/sap-proxy/route.ts

import { NextRequest, NextResponse } from 'next/server'
import https from 'https'
import { URL } from 'url'

const SAP_BASE_URL = process.env.SAP_BASE_URL!
const SAP_CLIENT = process.env.SAP_CLIENT || '610'

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization')

  const target = new URL(`/zrestsap/get-token?sap-client=${SAP_CLIENT}`, SAP_BASE_URL)

  return new Promise<Response>((resolve) => {
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
      console.log('SAP Status:', res.statusCode)

      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        const csrfToken = res.headers['x-csrf-token']
        const setCookie = res.headers['set-cookie']

        resolve(
          new NextResponse(JSON.stringify({ success: true }), {
            status: res.statusCode || 200,
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': (csrfToken as string) || '',
              ...(setCookie && { 'Set-Cookie': setCookie.join(', ') }),
            },
          })
        )
      })
    })

    req.on('error', (error) => {
      console.error('❌ SAP Proxy Error:', error)
      resolve(
        NextResponse.json(
          { error: 'SAP connection failed', details: error.message },
          { status: 500 }
        )
      )
    })

    req.end()
  })
}
