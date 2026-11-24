// src/app/api/setting/verify-password/route.ts
//
// Checks the Setting password before the browser unlocks editing.

import { NextRequest, NextResponse } from 'next/server'
import { checkSettingPassword } from '@/lib/settingGuard'

export async function POST(request: NextRequest): Promise<Response> {
  let password = ''
  try {
    const body = await request.json()
    password = typeof body?.password === 'string' ? body.password : ''
  } catch {
    /* empty body → wrong password */
  }
  const denied = checkSettingPassword(request, password)
  if (denied) return denied
  return NextResponse.json({ success: true })
}
