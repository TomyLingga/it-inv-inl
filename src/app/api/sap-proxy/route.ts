// src/app/api/sap-proxy/route.ts
//
// Login / token refresh ke SAP. Semua logon melewati fetchSapToken (sapAuthGuard):
// password lama/salah tidak akan di-retry otomatis sampai akun SAP terkunci.
// Header `x-sap-login: 1` menandakan login eksplisit dari form login.

import { NextRequest, NextResponse } from 'next/server'
import { fetchSapToken, sapAuthErrorResponse } from '@/lib/sapRequest'

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  const explicitLogin = request.headers.get('x-sap-login') === '1'

  if (!authHeader) {
    return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Missing credentials' }, { status: 401 })
  }

  const result = await fetchSapToken(authHeader, explicitLogin)
  console.log('SAP Status:', result.status)

  if (result.status === 401) {
    return sapAuthErrorResponse(result.errorCode, result.message)
  }

  if (result.status === 0) {
    console.error('❌ SAP Proxy Error:', result.message)
    return NextResponse.json(
      { error: 'SAP connection failed', details: result.message },
      { status: 500 }
    )
  }

  const response = new NextResponse(JSON.stringify({ success: result.status < 300 }), {
    status: result.status || 200,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': result.token || '',
    },
  })
  result.cookies.forEach((cookieStr) => response.headers.append('Set-Cookie', cookieStr))
  return response
}
