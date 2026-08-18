// src/app/setting/plant-list/page.tsx

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar, { Topbar } from '@/app/components/Sidebar'
import { Factory, Plus, Edit2, Trash2, Search, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react'
import LoadingOverlay from '@/app/components/ui/LoadingOverlay'
import { toast } from '@/app/components/ui/AppToast'

interface PlantItem {
  id?: number
  code: string
  name: string
  description?: string
}

export default function PlantListPage() {
  const { isAuthenticated, userName, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [plants, setPlants] = useState<PlantItem[]>([])
  const [filteredPlants, setFilteredPlants] = useState<PlantItem[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<PlantItem | null>(null)
  const [formData, setFormData] = useState({ code: '', name: '', description: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<PlantItem | null>(null)

  const fetchPlants = useCallback(async () => {
    setIsFetching(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/plants')
      const json = await res.json()
      if (json?.success && Array.isArray(json?.list)) {
        setPlants(json.list)
      } else if (Array.isArray(json?.data)) {
        setPlants(json.data)
      } else {
        setFetchError(json?.error || 'Gagal mengambil data Plant')
      }
    } catch (err: any) {
      setFetchError(err.message || 'Gagal terhubung ke API')
    } finally {
      setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !loading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isClient, loading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlants()
    }
  }, [isAuthenticated, fetchPlants])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPlants(plants)
    } else {
      const q = searchTerm.toLowerCase()
      setFilteredPlants(
        plants.filter(
          (p) =>
            p.code.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            (p.description && p.description.toLowerCase().includes(q))
        )
      )
    }
  }, [plants, searchTerm])

  const handleOpenAdd = () => {
    setEditItem(null)
    setFormData({ code: '', name: '', description: '' })
    setShowModal(true)
  }

  const handleOpenEdit = (item: PlantItem) => {
    setEditItem(item)
    setFormData({ code: item.code, name: item.name, description: item.description || '' })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Kode dan Nama Plant wajib diisi')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/plants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (json?.success) {
        toast.success(editItem ? 'Plant berhasil diperbarui' : 'Plant baru berhasil ditambahkan')
        setShowModal(false)
        fetchPlants()
      } else {
        toast.error(json?.error || 'Gagal menyimpan data Plant')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/plants?id=${deleteTarget.id || deleteTarget.code}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json?.success) {
        toast.success('Data Plant berhasil dihapus')
        setDeleteTarget(null)
        fetchPlants()
      } else {
        toast.error(json?.error || 'Gagal menghapus data Plant')
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isClient || loading || !isAuthenticated) {
    return <LoadingOverlay />
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar userName={userName} />
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="max-w-full space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                  <Factory className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Plant List (Master Data)
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                    Kelola daftar lokasi Plant pabrik untuk filter Pemasukan, Pengeluaran, dan Stok
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Plant</span>
              </button>
            </div>

            {/* Error Banner */}
            {fetchError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-sm font-semibold">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{fetchError}</span>
                </div>
                <button
                  onClick={fetchPlants}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 underline hover:text-rose-800 dark:hover:text-rose-200 ml-4 shrink-0"
                >
                  Coba lagi
                </button>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 sm:p-5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari kode plant, nama plant..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Total: <strong className="text-emerald-600 dark:text-emerald-400">{filteredPlants.length}</strong> Plant
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[11px] sm:text-xs font-extrabold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5 text-center w-14">No</th>
                      <th className="px-4 py-3.5">Kode Plant</th>
                      <th className="px-4 py-3.5">Nama Plant</th>
                      <th className="px-4 py-3.5">Deskripsi / Lokasi</th>
                      <th className="px-4 py-3.5 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm">
                    {isFetching ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Memuat data Plant...
                        </td>
                      </tr>
                    ) : filteredPlants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">
                          Belum ada data Plant
                        </td>
                      </tr>
                    ) : (
                      filteredPlants.map((item, idx) => (
                        <tr key={item.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="px-4 py-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
                              {item.code}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {item.description || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                                title="Edit Plant"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                title="Hapus Plant"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editItem ? 'Edit Data Plant' : 'Tambah Data Plant Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kode Plant *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: IN01"
                  value={formData.code}
                  disabled={Boolean(editItem)}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Plant *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: IN01 - Plant Sei Mangkei"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Deskripsi / Keterangan
                </label>
                <textarea
                  rows={3}
                  placeholder="Deskripsi operasional atau lokasi plant..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Hapus Plant?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Apakah Anda yakin ingin menghapus Plant <strong>{deleteTarget.name}</strong> ({deleteTarget.code})?
              </p>
            </div>
            <div className="flex justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
