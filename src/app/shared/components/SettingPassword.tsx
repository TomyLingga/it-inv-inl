// src/app/shared/components/SettingPassword.tsx
//
// Asks for the extra Setting password before a change is saved.
//   const { guardedFetch, passwordDialog } = useSettingPassword()
//   const res = await guardedFetch('/api/plants', { method: 'POST', ... })
//   if (!res) return            // user cancelled
//   ...                          // render {passwordDialog} once in the page
//
// The server checks the password on every write. After a correct entry it is
// kept in memory for 15 minutes (this tab only, never written to storage).
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

const HEADER = 'x-setting-password'
const ERROR_CODE = 'SETTING_PASSWORD_INVALID'
const UNLOCK_MS = 15 * 60 * 1000

let unlocked: { password: string; until: number } | null = null

function cachedPassword(): string | null {
  if (unlocked && unlocked.until > Date.now()) return unlocked.password
  unlocked = null
  return null
}

async function isPasswordRejected(res: Response): Promise<boolean> {
  if (res.status !== 401 && res.status !== 429) return false
  try {
    const json = await res.clone().json()
    return json?.error === ERROR_CODE
  } catch {
    return false
  }
}

function PasswordDialog({ onDone }: { onDone: (password: string | null) => void }) {
  const [value, setValue] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onDone(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDone])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!value) {
      setError('Password wajib diisi.')
      return
    }
    setChecking(true)
    setError(null)
    try {
      const res = await fetch('/api/setting/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: value }),
      })
      const json = await res.json().catch(() => null)
      if (res.ok && json?.success) {
        unlocked = { password: value, until: Date.now() + UNLOCK_MS }
        onDone(value)
        return
      }
      setError(json?.message || 'Password Setting salah.')
      setValue('')
      inputRef.current?.focus()
    } catch {
      setError('Tidak bisa menghubungi server. Coba lagi.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="setting-password-title">
      <form onSubmit={submit} className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 id="setting-password-title" className="text-base font-extrabold text-slate-900 dark:text-white">Password Setting</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Masukkan password untuk menyimpan perubahan. Berlaku 15 menit di tab ini.
            </p>
          </div>
        </div>

        <div className="relative">
          <input
            ref={inputRef}
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            placeholder="Password"
            className="w-full h-11 pl-3 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label={show ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => onDone(null)}
            className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={checking}
            className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {checking && <Loader2 className="w-4 h-4 animate-spin" />}
            Simpan
          </button>
        </div>
      </form>
    </div>
  )
}

export function useSettingPassword() {
  const [pending, setPending] = useState<((password: string | null) => void) | null>(null)

  const askPassword = useCallback(
    () =>
      new Promise<string | null>((resolve) => {
        setPending(() => (password: string | null) => {
          setPending(null)
          resolve(password)
        })
      }),
    []
  )

  /** fetch() with the Setting password header. Resolves to null when the user cancels. */
  const guardedFetch = useCallback(
    async (url: string, init: RequestInit = {}): Promise<Response | null> => {
      for (let attempt = 0; attempt < 2; attempt++) {
        const password = cachedPassword() ?? (await askPassword())
        if (!password) return null
        const headers = new Headers(init.headers)
        headers.set(HEADER, encodeURIComponent(password))
        const res = await fetch(url, { ...init, headers })
        if (!(await isPasswordRejected(res))) return res
        unlocked = null // password changed on the server or lock active — ask again once
      }
      return null
    },
    [askPassword]
  )

  const passwordDialog = pending ? <PasswordDialog onDone={pending} /> : null
  return { guardedFetch, passwordDialog }
}
