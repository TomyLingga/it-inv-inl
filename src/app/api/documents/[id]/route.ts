// src/app/api/documents/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.ITINV_API_URL ?? 'http://127.0.0.1:8000/api'

// DELETE — hapus dokumen
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const res = await fetch(`${API_BASE}/documents/${params.id}`, {
    method: 'DELETE',
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
