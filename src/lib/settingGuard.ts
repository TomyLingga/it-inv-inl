// src/lib/settingGuard.ts
//
// Extra password for changing data in the Setting menu (material facility,
// PO ↔ KPPBC, plant and KPPBC master). The password lives only on the server
// (SETTING_PASSWORD in .env.local); the browser sends what the user typed in
// the `x-setting-password` header and every write route checks it here.

import { createHash, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export const SETTING_PASSWORD_HEADER = 'x-setting-password'
export const SETTING_PASSWORD_ERROR = 'SETTING_PASSWORD_INVALID'

const MAX_FAILURES = 5
const LOCK_MS = 5 * 60 * 1000

// Failed attempts per client, kept in memory (reset when the server restarts)
const failures = new Map<string, { count: number; lockedUntil: number }>()

function clientKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
}

function sameSecret(a: string, b: string): boolean {
  // Hash first so both buffers have the same length for timingSafeEqual
  const ha = createHash('sha256').update(a, 'utf8').digest()
  const hb = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(ha, hb)
}

function deny(status: number, message: string) {
  return NextResponse.json({ success: false, error: SETTING_PASSWORD_ERROR, message }, { status })
}

/** Returns null when the password is right, otherwise the response to send back. */
export function checkSettingPassword(req: NextRequest, supplied?: string | null): NextResponse | null {
  const expected = process.env.SETTING_PASSWORD
  if (!expected) {
    return NextResponse.json(
      { success: false, error: 'SETTING_PASSWORD_NOT_SET', message: 'Password Setting belum diatur di server (SETTING_PASSWORD).' },
      { status: 500 }
    )
  }

  const key = clientKey(req)
  const now = Date.now()
  const state = failures.get(key)
  if (state && state.lockedUntil > now) {
    const minutes = Math.ceil((state.lockedUntil - now) / 60000)
    return deny(429, `Terlalu banyak percobaan salah. Coba lagi dalam ${minutes} menit.`)
  }

  let password = supplied ?? ''
  if (supplied == null) {
    // Header values are URI-encoded by the browser so any character survives
    const raw = req.headers.get(SETTING_PASSWORD_HEADER) ?? ''
    try {
      password = decodeURIComponent(raw)
    } catch {
      password = raw
    }
  }

  if (password && sameSecret(password, expected)) {
    failures.delete(key)
    return null
  }

  // A lock that has run out starts a fresh count
  const previous = state && state.lockedUntil !== 0 ? 0 : state?.count ?? 0
  const count = previous + 1
  failures.set(key, { count, lockedUntil: count >= MAX_FAILURES ? now + LOCK_MS : 0 })
  return deny(
    401,
    count >= MAX_FAILURES
      ? 'Password Setting salah 5 kali. Coba lagi dalam 5 menit.'
      : 'Password Setting salah.'
  )
}
