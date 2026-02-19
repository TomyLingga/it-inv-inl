// src/app/dashboard/page.tsx

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar from '@/app/components/Sidebar'
import Link from 'next/link'

export default function Dashboard() {
  const { isAuthenticated, userName, loading } = useAuth()
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

  const menuCards = [
    {
      title: 'Pemasukan Barang',
      description: 'Data barang masuk PT INL',
      icon: '📈',
      href: '/pemasukan',
      gradient: 'from-green-400 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Pengeluaran Barang',
      description: 'Data barang keluar PT INL',
      icon: '💸',
      href: '/pengeluaran',
      gradient: 'from-red-400 to-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600'
    },
    {
      title: 'Stok Barang',
      description: 'Data persediaan barang PT INL',
      icon: '📦',
      href: '/stok',
      gradient: 'from-blue-400 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    }
  ]

  return (
    <div className='flex h-screen bg-gray-50'>
          <Sidebar />
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Dashboard IT Inventory
            </h1>
            <p className="text-gray-600">
              Selamat datang, <span className="font-semibold">{userName}</span>
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {menuCards.map((card, index) => (
              <Link
                key={index}
                href={card.href}
                className="group"
              >
                <div className={`${card.bgColor} rounded-2xl p-6 border-2 border-transparent hover:border-gray-300 transition-all duration-300 hover:shadow-xl`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-16 h-16 bg-gradient-to-br ${card.gradient} rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      {card.icon}
                    </div>
                  </div>
                  <h3 className={`text-xl font-bold ${card.textColor} mb-2`}>
                    {card.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {card.description}
                  </p>
                  <div className="mt-4 flex items-center text-sm font-medium text-gray-500 group-hover:text-gray-700">
                    Buka <span className="ml-2 group-hover:ml-3 transition-all">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Informasi Sistem
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status Koneksi</span>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    ✓ Terhubung
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">SAP Client</span>
                  <span className="text-gray-900 font-mono text-sm">610</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-6 shadow-lg text-white">
              <h3 className="text-lg font-semibold mb-2">
                🎯 Panduan Cepat
              </h3>
              <p className="text-sm text-purple-100">
                Gunakan menu di sidebar untuk navigasi cepat antar modul.
                Semua data tersinkronisasi dengan SAP secara real-time.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
  )
} 