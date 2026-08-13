'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import { EyeIcon, EyeOffIcon, AlertCircle, Boxes } from 'lucide-react'
import LoadingOverlay from '@/app/components/ui/LoadingOverlay'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState<boolean>(false)
  const [rememberMe, setRememberMe] = useState<boolean>(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { isAuthenticated, loading: authLoading, login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, authLoading, router])

  const togglePasswordVisibility = () => setIsPasswordVisible((prev) => !prev)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const success = await login(username, password)

    if (!success) {
      setError('Login gagal. Username/password salah atau server error.')
    }
    setSubmitting(false)
  }

  if (authLoading) {
    return <LoadingOverlay title="Memeriksa Sesi..." subtitle="Harap tunggu sebentar..." />
  }

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-200">
      <Card className="w-full max-w-md pb-0 shadow-xl border-slate-200 dark:border-slate-800">
        <CardHeader className="mt-4 mb-2 space-y-2 text-center">
          <div className="flex justify-center mb-1 text-blue-600 dark:text-blue-400">
            <Boxes className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-balance font-bold text-2xl tracking-tight text-slate-900 dark:text-white">
              Sign in to SAP Inventory
            </h2>
            <p className="text-pretty text-slate-500 dark:text-slate-400 text-sm mt-1">
              Selamat datang! Masukkan kredensial SAP Anda.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-xl text-sm flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username SAP</Label>
              <Input
                id="username"
                placeholder="Masukkan username SAP"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <div className="relative">
                <Input
                  className="pe-9"
                  id="password"
                  placeholder="Masukkan password"
                  type={isPasswordVisible ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  aria-controls="password"
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  aria-pressed={isPasswordVisible}
                  className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 outline-none transition-colors"
                  onClick={togglePasswordVisibility}
                  type="button"
                >
                  {isPasswordVisible ? (
                    <EyeOffIcon aria-hidden="true" size={16} />
                  ) : (
                    <EyeIcon aria-hidden="true" size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked)}
              />
              <Label className="font-normal text-xs text-slate-600 dark:text-slate-400 cursor-pointer" htmlFor="remember">
                Ingat saya
              </Label>
            </div>

            <div className="pt-2 space-y-2">
              <Button
                className="w-full h-10 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Memproses...' : 'Sign In ke SAP'}
              </Button>
            </div>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center border-t border-slate-100 dark:border-slate-800/80 py-4 mt-2">
          <p className="text-pretty text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
            IT Inventory System &copy; 2026
          </p>
          <p className="text-pretty text-center text-slate-500 dark:text-slate-400 text-xs font-medium -mt-2">
            SAP Integration
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}