'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar from '@/app/components/Sidebar'


export default function PengeluaranPage() {
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
              <span className="text-4xl">💸</span>
              <h1 className="text-4xl font-bold text-gray-900">
                Pengeluaran Barang
              </h1>
            </div>
            <p className="text-gray-600">
              Kelola data barang keluar dari gudang
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mb-6 flex space-x-4">
            <button className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-lg font-medium">
              + Tambah Pengeluaran
            </button>
            <button className="px-6 py-3 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all border border-gray-300 font-medium">
              📊 Export Data
            </button>
          </div>

          {/* Content Card */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <div className="text-6xl mb-4">📤</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Data Pengeluaran Barang
              </h3>
              <p className="text-gray-600 mb-6">
                Fitur ini akan menampilkan daftar pengeluaran barang dari SAP
              </p>
              <div className="inline-block px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm">
                Coming Soon: Integrasi dengan SAP BAPI
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
  )
}