// src/app/api/po-kppbc/route.ts

import { NextRequest, NextResponse } from 'next/server'

const ITINV_API_URL = process.env.ITINV_API_URL || 'http://127.0.0.1:8000/api'

async function safeFetchJson(url: string, options: RequestInit) {
  const res = await fetch(url, options)
  const text = await res.text()

  let data
  try {
    data = JSON.parse(text)
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: `Koneksi Backend/Database Gagal (${res.status}): Server Laravel mengembalikan respon HTML. Pastikan service MySQL/Database sudah dinyalakan.`,
        raw: text.slice(0, 300)
      },
      { status: res.status || 500 }
    )
  }
  return NextResponse.json(data, { status: res.status })
}

export async function GET(): Promise<Response> {
  try {
    return await safeFetchJson(`${ITINV_API_URL}/po-kppbc`, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal terhubung ke Laravel API' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.json()
    return await safeFetchJson(`${ITINV_API_URL}/po-kppbc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui pemetaan PO KPPBC' },
      { status: 500 }
    )
  }
}
