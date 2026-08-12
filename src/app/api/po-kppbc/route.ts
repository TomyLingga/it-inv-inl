// src/app/api/po-kppbc/route.ts

import { NextRequest, NextResponse } from 'next/server'

const ITINV_API_URL = process.env.ITINV_API_URL || 'http://127.0.0.1:8000/api'

export async function GET(): Promise<Response> {
  try {
    const res = await fetch(`${ITINV_API_URL}/po-kppbc`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to connect to Laravel API' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json()
    const res = await fetch(`${ITINV_API_URL}/po-kppbc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update PO KPPBC assignment' },
      { status: 500 }
    )
  }
}
