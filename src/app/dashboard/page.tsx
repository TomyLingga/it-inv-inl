// src/app/dashboard/page.tsx

'use client'

import { useEffect, useState } from 'react'
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
  ArrowLeftRight,
  FolderOpen,
  Boxes,
  FileStack,
  Factory,
  Building2,
  Layers,
} from 'lucide-react'

import LoadingOverlay from '@/app/components/ui/LoadingOverlay'

interface QuickStat {
  label: string
  value: string | number
  sub?: string
  color: string
}

export default function Dashboard() {
  const { isAuthenticated, userName, loading, csrfToken } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<{ plants: number; materials: number; facilityMaterials: number; kppbc: number }>({
    plants: 0,
    materials: 0,
    facilityMaterials: 0,
    kppbc: 0,
  })

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, loading, router])

  // Fetch quick stats from local API (no SAP — fast)
  useEffect(() => {
    if (!isAuthenticated) return
    Promise.all([
      fetch('/api/plants').then((r) => r.json()).catch(() => null),
      fetch('/api/kppbc').then((r) => r.json()).catch(() => null),
      fetch('/api/material-facility').then((r) => r.json()).catch(() => null),
    ]).then(([plantJson, kppbcJson, matJson]) => {
      const plants = plantJson?.list?.length ?? plantJson?.data?.length ?? 0
      const kppbc = kppbcJson?.list?.length ?? kppbcJson?.data?.length ?? 0
      const localList = matJson?.list ?? []
      const facilityMat = localList.filter((m: any) => m.is_facility).length ?? 0
      setStats((prev) => ({ ...prev, plants, kppbc, facilityMaterials: facilityMat }))
    })
  }, [isAuthenticated])

  // Fetch SAP material list asynchronously (slower, so run afterward)
  useEffect(() => {
    if (!isAuthenticated || !csrfToken) return
    fetch('/api/setting/material-list', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      body: JSON.stringify({
        I_BEWFLG: 'X',
        I_WERKS: [{ SIGN: 'I', OPTION: 'EQ', LOW: 'IN01', HIGH: '' }],
        I_MATNR: [{ SIGN: 'I', OPTION: 'BT', LOW: '000000000000000001', HIGH: '999999999999999999' }]
      })
    })
      .then((r) => r.json())
      .then((arr) => {
        if (Array.isArray(arr)) {
          setStats((prev) => ({ ...prev, materials: arr.length }))
        }
      })
      .catch((err) => console.error('Gagal mengambil total material dari SAP:', err))
  }, [isAuthenticated, csrfToken])

  if (!loading && !isAuthenticated) return null

  const menuCards = [
    {
      title: 'Pemasukan Material',
      description: 'Pencatatan material masuk & dokumen pabean',
      icon: ArrowDownToLine,
      href: '/pemasukan',
      iconBg: 'bg-emerald-600',
      iconShadow: 'shadow-emerald-500/20',
      badge: 'SAP MM',
      badgeColor: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200',
    },
    {
      title: 'Pengeluaran Material',
      description: 'Pencatatan material keluar & surat jalan pabean',
      icon: ArrowUpFromLine,
      href: '/pengeluaran',
      iconBg: 'bg-rose-600',
      iconShadow: 'shadow-rose-500/20',
      badge: 'SAP MM',
      badgeColor: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200',
    },
    {
      title: 'Stok Material',
      description: 'Persediaan material & saldo batch per lokasi',
      icon: Package,
      href: '/stok',
      iconBg: 'bg-blue-600',
      iconShadow: 'shadow-blue-500/20',
      badge: 'SAP MM',
      badgeColor: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200',
    },
    {
      title: 'Mutasi Material',
      description: 'Traceability & penelusuran pergerakan barang (MB51)',
      icon: ArrowLeftRight,
      href: '/mutasi',
      iconBg: 'bg-indigo-600',
      iconShadow: 'shadow-indigo-500/20',
      badge: 'SAP MB51',
      badgeColor: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200',
    },
    {
      title: 'Dokumen',
      description: 'Arsip dokumen pabean, BC, dan laporan internal',
      icon: FolderOpen,
      href: '/dokumen',
      iconBg: 'bg-amber-600',
      iconShadow: 'shadow-amber-500/20',
      badge: 'Upload',
      badgeColor: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200',
    },
    {
      title: 'Master Data',
      description: 'Kelola Plant, KPPBC, dan Material Fasilitas',
      icon: Layers,
      href: '/setting/plant-list',
      iconBg: 'bg-slate-700',
      iconShadow: 'shadow-slate-500/20',
      badge: 'Pengaturan',
      badgeColor: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200',
    },
  ]

  const quickStats: QuickStat[] = [
    { label: 'Plant Aktif', value: stats.plants || '—', color: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'KPPBC Terdaftar', value: stats.kppbc || '—', color: 'text-purple-600 dark:text-purple-400' },
    {
      label: 'Material Fasilitas',
      value: stats.facilityMaterials || '0',
      sub: stats.materials > 0 ? `dari ${stats.materials.toLocaleString('id-ID')} total` : 'Mengambil data SAP...',
      color: 'text-indigo-600 dark:text-indigo-400'
    },
    { label: 'Status SAP', value: 'Online', sub: 'Client 610', color: 'text-emerald-600 dark:text-emerald-400' },
  ]

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar userName={userName} />
        {loading ? (
          <LoadingOverlay />
        ) : (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-6">

              {/* Welcome Header */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-lg relative overflow-hidden">
                {/* Decorative rings */}
                <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full border border-indigo-800/30 pointer-events-none" />
                <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full border border-indigo-700/20 pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-indigo-300 text-xs sm:text-sm font-semibold tracking-widest uppercase mb-1">
                      IT Inventory — Fasilitas Kepabeanan
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      Selamat Datang, <span className="text-indigo-300">{userName}</span>
                    </h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-1 font-medium">
                      PT Industri Nabati Lestari • Sistem Pelaporan & Monitoring Material Pabean
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-bold self-start sm:self-auto whitespace-nowrap">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    SAP Terhubung
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <p className="text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-xl sm:text-2xl font-extrabold mt-1 ${stat.color}`}>{stat.value}</p>
                    {stat.sub && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{stat.sub}</p>}
                  </div>
                ))}
              </div>

              {/* Module Navigation Cards */}
              <div>
                <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 px-0.5">
                  Modul Aplikasi
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuCards.map((card) => {
                    const IconComponent = card.icon
                    return (
                      <Link key={card.href} href={card.href} className="group block">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all duration-200 shadow-xs hover:shadow-md h-full flex items-start gap-4">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${card.iconBg} shadow-lg ${card.iconShadow} group-hover:scale-105 transition-transform duration-200`}>
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {card.title}
                              </h3>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${card.badgeColor}`}>
                                {card.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                              {card.description}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all duration-200 shrink-0 mt-0.5" />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>

              {/* System Info Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <Server className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Informasi Sistem</h3>
                </div>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs sm:text-sm mt-1">
                  {[
                    { label: 'Status SAP', value: 'Terhubung (Client 610)', valueClass: 'text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5', icon: <CheckCircle2 className="w-4 h-4" /> },
                    { label: 'Perusahaan', value: 'PT Industri Nabati Lestari', valueClass: 'font-semibold text-slate-800 dark:text-slate-200', icon: null },
                    { label: 'Pabrik', value: 'Plant Sei Mangkei (IN01)', valueClass: 'font-semibold text-slate-800 dark:text-slate-200', icon: null },
                    { label: 'Modul Aktif', value: 'Pemasukan · Pengeluaran · Stok · Mutasi · Dokumen', valueClass: 'font-semibold text-slate-800 dark:text-slate-200', icon: null },
                  ].map((row) => (
                    <li key={row.label} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">{row.label}</span>
                      <span className={row.valueClass}>
                        {row.icon}{row.value}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </main>
        )}
      </div>
    </div>
  )
}