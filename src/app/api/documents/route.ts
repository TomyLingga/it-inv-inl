// src/app/api/documents/route.ts
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.ITINV_API_URL ?? 'http://127.0.0.1:8000/api'

// GET — list documents
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const params = new URLSearchParams()
  if (searchParams.get('search')) params.set('search', searchParams.get('search')!)
  if (searchParams.get('date_from')) params.set('date_from', searchParams.get('date_from')!)
  if (searchParams.get('date_to')) params.set('date_to', searchParams.get('date_to')!)

  const url = `${API_BASE}/documents?${params.toString()}`
  const res = await fetch(url, { cache: 'no-store' })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

// POST — upload document (multipart/form-data)
export async function POST(req: NextRequest) {
  const formData = await req.formData()

  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    body: formData,
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
