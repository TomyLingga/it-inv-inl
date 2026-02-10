'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar from '@/app/components/Sidebar'


export default function StokPage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
      <div className='flex h-screen bg-gray-50'>
                <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <span className="text-4xl">📦</span>
              <h1 className="text-4xl font-bold text-gray-900">
                Stok Barang
              </h1>
            </div>
            <p className="text-gray-600">
              Monitor dan kelola persediaan barang
            </p>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-3xl font-bold mb-1">--</div>
              <div className="text-blue-100">Total Item</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="text-3xl mb-2">✅</div>
              <div className="text-3xl font-bold mb-1">--</div>
              <div className="text-green-100">Stok Tersedia</div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg">
              <div className="text-3xl mb-2">⚠️</div>
              <div className="text-3xl font-bold mb-1">--</div>
              <div className="text-red-100">Stok Menipis</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex space-x-4">
            <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg font-medium">
              🔄 Refresh Data
            </button>
            <button className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all border border-gray-300 font-medium">
              📊 Export Data
            </button>
          </div>

          {/* Content Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Data Stok Barang
              </h3>
              <p className="text-gray-600 mb-6">
                Fitur ini akan menampilkan daftar stok barang real-time dari SAP
              </p>
              <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm">
                Coming Soon: Integrasi dengan SAP MM Module
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
  )
}