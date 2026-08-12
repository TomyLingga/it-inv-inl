// src/app/api/setting/material-list/route.ts

import { sapPost } from '@/lib/sapRequest'
import { NextRequest, NextResponse } from 'next/server'

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
  return sapPost('/zrestsap/mat-list', body, { csrfToken, authHeader, cookieHeader })
}
