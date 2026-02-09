'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import { Eye, EyeOff } from 'lucide-react' // npm install lucide-react

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false) // ← NEW
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { isAuthenticated, loading: authLoading, login } = useAuth()
  const router = useRouter()

  // Auto redirect kalau udah login
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, authLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const success = await login(username, password)
    
    if (success) {
      router.push('/dashboard')
    } else {
      setError('Login gagal. Username/password salah atau server error.')
    }
    setLoading(false)
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600">
        <div className="text-white text-xl">Memeriksa sesi...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl">
        <div className="text-center">
          <div className="mx-auto h-20 w-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
            <span className="text-3xl">🔐</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">SAP Login</h2>
          <p className="text-gray-600 mt-2">Masukkan kredensial SAP Anda</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}
          
          {/* USERNAME INPUT - FIXED COLOR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username SAP
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl 
                bg-white text-gray-900 
                placeholder-gray-400 
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                transition-all duration-200"
              placeholder="Masukkan username SAP"
            />
          </div>

          {/* PASSWORD INPUT - FIXED SPACING */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl 
                  bg-white text-gray-900 
                  placeholder-gray-400 
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  transition-all duration-200"
                placeholder="Masukkan password"
              />
              {/* EYE ICON - POSISI LEBIH RAPAT */}
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1} // Prevent form submission on Enter
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3 px-4 border border-transparent 
              text-sm font-medium rounded-xl text-white 
              bg-gradient-to-r from-blue-600 to-purple-600 
              hover:from-blue-700 hover:to-purple-700 
              focus:outline-none focus:ring-2 focus:ring-blue-500 
              disabled:opacity-50 transition-all duration-200"
          >
            {loading ? 'Memproses...' : 'Login ke SAP'}
          </button>
        </form>
      </div>
    </div>
  )
}
