'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from '@/app/components/Sidebar'
import { useAuth } from '@/app/components/useAuth'  // ← INI YANG KURANG!


// ✅ HOOKS DI ATAS, SEBELUM LOGIC LAIN
export default function Dashboard() {
  const { isAuthenticated, loading, userName } = useAuth()  // ← ATAS BANGET!
  const router = useRouter()

  // ✅ Early return SETELAH semua hooks
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="text-xl text-gray-500">Memuat dashboard...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.push('/')
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Selamat datang, <span className="font-semibold text-blue-600">{userName}</span>
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pemasukan</p>
                <p className="text-3xl font-bold text-green-600 mt-1">Rp 15.2M</p>
              </div>
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
                📈
              </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pengeluaran</p>
                <p className="text-3xl font-bold text-red-600 mt-1">Rp 8.7M</p>
              </div>
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center">
                💸
              </div>
            </div>
          </div>
          <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stok Tersedia</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">127 Item</p>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                📦
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
