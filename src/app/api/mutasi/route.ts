// src/app/api/mutasi/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { sapPost } from '@/lib/sapRequest'

export async function POST(request: NextRequest): Promise<Response> {
  const csrfToken = request.headers.get('x-csrf-token') || ''
  const authHeader = request.headers.get('authorization')
  const cookieHeader = request.headers.get('cookie')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  return sapPost('/zrestsap/mm-mb51', body, { csrfToken, authHeader, cookieHeader })
}
