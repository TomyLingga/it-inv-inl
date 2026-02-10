import { NextRequest, NextResponse } from 'next/server'
import https from 'https'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  return new Promise((resolve) => {
    const options = {
      hostname: '108.136.81.204',
      port: 44303,
      path: '/zrestsap/get-token?sap-client=610',
      method: 'GET',
      headers: {
        'Authorization': authHeader || '',
        'x-csrf-token': 'fetch',
      },
      rejectUnauthorized: false // Bypass SSL
    }

    const req = https.request(options, (res) => {
      console.log('SAP Status:', res.statusCode)
      console.log('SAP Headers:', res.headers)

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
              'x-csrf-token': csrfToken as string || '',
              ...(setCookie && { 'Set-Cookie': setCookie.join(', ') })
            }
          })
        )
      })
    })

    req.on('error', (error) => {
      console.error('❌ Request Error:', error)
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