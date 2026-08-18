// src/app/api/kppbc/route.ts

import { NextRequest, NextResponse } from 'next/server'

const ITINV_API_URL = process.env.ITINV_API_URL || 'http://127.0.0.1:8000/api'

async function safeFetchJson(url: string, options: RequestInit) {
  const res = await fetch(url, options)
  let text = await res.text()

  const jsonStart = text.indexOf('{')
  const arrayStart = text.indexOf('[')
  let firstIdx = -1

  if (jsonStart !== -1 && arrayStart !== -1) {
    firstIdx = Math.min(jsonStart, arrayStart)
  } else if (jsonStart !== -1) {
    firstIdx = jsonStart
  } else if (arrayStart !== -1) {
    firstIdx = arrayStart
  }

  if (firstIdx > 0) {
    text = text.slice(firstIdx)
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: `Koneksi Backend Gagal (${res.status}): Server Laravel mengembalikan respon non-JSON.`,
        raw: text.slice(0, 300)
      },
      { status: res.status || 500 }
    )
  }
  return NextResponse.json(data, { status: res.status })
}

export async function GET(): Promise<Response> {
  try {
    return await safeFetchJson(`${ITINV_API_URL}/kppbcs`, {
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
    return await safeFetchJson(`${ITINV_API_URL}/kppbcs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menyimpan data KPPBC' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID KPPBC wajib diisi' }, { status: 400 })
    }

    return await safeFetchJson(`${ITINV_API_URL}/kppbcs/${id}`, {
      method: 'DELETE',
      headers: { 'Accept': 'application/json' },
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus data KPPBC' },
      { status: 500 }
    )
  }
}
