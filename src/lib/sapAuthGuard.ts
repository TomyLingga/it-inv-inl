// src/lib/sapAuthGuard.ts
//
// Server-side circuit breaker for SAP Basic-Auth logins.
//
// Why: every SAP call (token fetch / auto-refresh / POST) carries the user's
// Basic credentials. After the SAP password is changed, browsers that still hold
// the OLD password keep re-logging in automatically — every one of those is a
// failed logon on SAP and the account gets locked (login/fails_to_user_lock).
//
// Rules:
//  1. A credential (user+password) that SAP rejected with 401 is remembered as
//     "bad". Automatic calls (refresh, background, data requests) with a bad
//     credential are rejected here WITHOUT contacting SAP.
//  2. Per username, at most SAP_MAX_LOGIN_FAILURES failed attempts are sent to
//     SAP within the lock window. After that every attempt for that user is
//     blocked locally until the window passes — even explicit logins — so the
//     SAP account can never reach its own lock threshold through this app.
//  3. An explicit login from the login form may retry a credential that was
//     marked bad (e.g. after an admin unlocked the account), as long as rule 2
//     still allows it. A successful login clears all state for that user.
//
// State lives in process memory (shared by all browsers/devices that go through
// this Next.js server). It is kept on globalThis so dev hot-reload keeps it.

import { createHash } from 'crypto'

const MAX_FAILURES = Math.max(1, Number(process.env.SAP_MAX_LOGIN_FAILURES) || 3)
const LOCK_WINDOW_MS = Math.max(1, Number(process.env.SAP_LOGIN_LOCK_MINUTES) || 30) * 60 * 1000
const BAD_CREDENTIAL_TTL_MS = 24 * 60 * 60 * 1000

interface UserFailureState {
  count: number
  firstFailureAt: number
  lastFailureAt: number
}

interface GuardStore {
  badCredentials: Map<string, number> // credential hash → expiresAt
  userFailures: Map<string, UserFailureState>
}

const globalKey = '__sapAuthGuardStore__'
const store: GuardStore =
  ((globalThis as any)[globalKey] as GuardStore | undefined) ??
  ((globalThis as any)[globalKey] = {
    badCredentials: new Map<string, number>(),
    userFailures: new Map<string, UserFailureState>(),
  })

export type SapAuthErrorCode = 'INVALID_CREDENTIALS' | 'CREDENTIALS_BLOCKED'

export interface GuardDecision {
  allowed: boolean
  code?: SapAuthErrorCode
  message?: string
  retryAfterSec?: number
}

function parseBasic(authHeader: string | null | undefined): { username: string; hash: string } | null {
  if (!authHeader || !authHeader.toLowerCase().startsWith('basic ')) return null
  try {
    const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf8')
    const idx = decoded.indexOf(':')
    if (idx <= 0) return null
    const username = decoded.slice(0, idx).trim().toUpperCase()
    const hash = createHash('sha256').update(decoded).digest('hex')
    return { username, hash }
  } catch {
    return null
  }
}

function getUserState(username: string, now: number): UserFailureState | null {
  const s = store.userFailures.get(username)
  if (!s) return null
  if (now - s.lastFailureAt > LOCK_WINDOW_MS) {
    store.userFailures.delete(username)
    return null
  }
  return s
}

/**
 * Decide whether a call carrying `authHeader` may be sent to SAP.
 * `explicitLogin` = the user just typed the password into the login form.
 */
export function checkSapAuth(authHeader: string | null | undefined, explicitLogin = false): GuardDecision {
  const cred = parseBasic(authHeader)
  if (!cred) return { allowed: true }

  const now = Date.now()
  const userState = getUserState(cred.username, now)

  if (userState && userState.count >= MAX_FAILURES) {
    const retryAfterSec = Math.ceil((userState.lastFailureAt + LOCK_WINDOW_MS - now) / 1000)
    return {
      allowed: false,
      code: 'CREDENTIALS_BLOCKED',
      retryAfterSec,
      message:
        `Login SAP untuk user ${cred.username} ditahan sementara (${userState.count}x password salah) ` +
        `agar akun SAP tidak terkunci. Coba lagi dalam ${Math.ceil(retryAfterSec / 60)} menit.`,
    }
  }

  const badUntil = store.badCredentials.get(cred.hash)
  if (badUntil && badUntil > now && !explicitLogin) {
    return {
      allowed: false,
      code: 'INVALID_CREDENTIALS',
      message: 'Password SAP yang tersimpan sudah tidak valid. Silakan login ulang dengan password terbaru.',
    }
  }
  if (badUntil && badUntil <= now) store.badCredentials.delete(cred.hash)

  return { allowed: true }
}

/** Record a 401 from SAP for this credential. Returns the decision for the caller to relay. */
export function recordSapAuthFailure(authHeader: string | null | undefined): GuardDecision {
  const cred = parseBasic(authHeader)
  if (!cred) {
    return { allowed: false, code: 'INVALID_CREDENTIALS', message: 'Username/password SAP salah.' }
  }

  const now = Date.now()
  store.badCredentials.set(cred.hash, now + BAD_CREDENTIAL_TTL_MS)

  const prev = getUserState(cred.username, now)
  const next: UserFailureState = prev
    ? { ...prev, count: prev.count + 1, lastFailureAt: now }
    : { count: 1, firstFailureAt: now, lastFailureAt: now }
  store.userFailures.set(cred.username, next)

  const remaining = Math.max(0, MAX_FAILURES - next.count)
  console.warn(`🔒 SAP login failed for ${cred.username} (${next.count}/${MAX_FAILURES} in window)`)

  return {
    allowed: false,
    code: remaining > 0 ? 'INVALID_CREDENTIALS' : 'CREDENTIALS_BLOCKED',
    message:
      remaining > 0
        ? `Username/password SAP salah. Sisa ${remaining}x percobaan sebelum login ditahan sementara.`
        : `Login SAP untuk user ${cred.username} ditahan sementara agar akun SAP tidak terkunci. ` +
          `Coba lagi dalam ${Math.ceil(LOCK_WINDOW_MS / 60000)} menit.`,
  }
}

/** Record a successful SAP logon — clears every failure for this user. */
export function recordSapAuthSuccess(authHeader: string | null | undefined): void {
  const cred = parseBasic(authHeader)
  if (!cred) return
  store.badCredentials.delete(cred.hash)
  store.userFailures.delete(cred.username)
}
