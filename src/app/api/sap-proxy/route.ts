import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  
  try {
    const response = await fetch(
      'https://108.136.81.204:44303/zrestsap/get-token?sap-client=610',
      {
        method: 'GET',
        headers: {
          'Authorization': authHeader || '',
          'x-csrf-token': 'fetch',
        },
      }
    )

    const csrfToken = response.headers.get('x-csrf-token')
    
    // Forward cookies dari SAP ke client
    const cookies = response.headers.get('set-cookie')

    const headers: Record<string, string> = {
      'x-csrf-token': csrfToken || '',
    }
    
    if (cookies) {
      headers['set-cookie'] = cookies
    }

    return new NextResponse(null, {
      status: response.status,
      headers
    })
  } catch (error) {
    console.error('SAP Proxy Error:', error)
    return NextResponse.json(
      { error: 'SAP connection failed' },
      { status: 500 }
    )
  }
}