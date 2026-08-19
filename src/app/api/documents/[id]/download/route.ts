// src/app/api/documents/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.ITINV_API_URL ?? 'http://127.0.0.1:8000/api'

// GET — proxy download file dari Laravel ke browser
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const res = await fetch(`${API_BASE}/documents/${params.id}/download`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json({ success: false, message: 'File tidak ditemukan' }, { status: 404 })
  }

  const blob = await res.blob()
  const contentDisposition = res.headers.get('Content-Disposition') ?? 'attachment'
  const contentType = res.headers.get('Content-Type') ?? 'application/octet-stream'

  return new NextResponse(blob, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
    },
  })
}
