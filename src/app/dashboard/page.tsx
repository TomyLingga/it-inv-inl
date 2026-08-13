// src/app/dashboard/page.tsx

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar, { Topbar } from '@/app/components/Sidebar'
import Link from 'next/link'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  ArrowRight,
  CheckCircle2,
  Server,
} from 'lucide-react'

import LoadingOverlay from '@/app/components/ui/LoadingOverlay'

export default function Dashboard() {
  const { isAuthenticated, userName, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  if (!loading && !isAuthenticated) {
    return null
  }

  const menuCards = [
    {
      title: 'Pemasukan Barang',
      description: 'Pencatatan data barang masuk & dokumen pabean',
      icon: ArrowDownToLine,
      href: '/pemasukan',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Pengeluaran Barang',
      description: 'Pencatatan data barang keluar & surat jalan',
      icon: ArrowUpFromLine,
      href: '/pengeluaran',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
    {
      title: 'Stok Barang',
      description: 'Laporan persediaan barang PT INL',
      icon: Package,
      href: '/stok',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  ]

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar userName={userName} />
        {loading ? (
          <LoadingOverlay />
        ) : (
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Dashboard IT Inventory
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    PT Industri Nabati Lestari &bull; User: <span className="font-semibold text-slate-700 dark:text-slate-300">{userName}</span>
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-semibold self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Koneksi SAP Terhubung (Client 610)</span>
                </div>
              </div>

              {/* Module Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {menuCards.map((card, index) => {
                  const IconComponent = card.icon
                  return (
                    <Link key={index} href={card.href} className="group block">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-2xs h-full flex flex-col items-center justify-center text-center space-y-3">
                        <IconComponent className={`w-10 h-10 ${card.iconColor} shrink-0 group-hover:scale-110 transition-transform`} />

                        <div className="space-y-1">
                          <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {card.title}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {card.description}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>

              {/* System Info Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 sm:p-6 shadow-2xs space-y-3">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                  <Server className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Informasi Sistem
                  </h3>
                </div>

                <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-sm">
                  <li className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Status SAP</span>
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      Terhubung (Client 610)
                    </span>
                  </li>

                  <li className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Perusahaan</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      PT Industri Nabati Lestari
                    </span>
                  </li>

                  <li className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Modul Aktif</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Pemasukan, Pengeluaran & Stok
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}