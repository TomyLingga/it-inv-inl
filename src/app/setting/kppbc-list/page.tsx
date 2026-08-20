// src/app/setting/kppbc-list/page.tsx

'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar, { Topbar } from '@/app/components/Sidebar'
import { Building2, Plus, Edit2, Trash2, Search, AlertCircle } from 'lucide-react'
import LoadingOverlay from '@/app/components/ui/LoadingOverlay'
import { toast } from '@/app/components/ui/AppToast'

interface KppbcItem {
  id?: number
  code: string
  name: string
  office_code?: string
  notes?: string
}

export default function KppbcListPage() {
  const { isAuthenticated, userName, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [kppbcs, setKppbcs] = useState<KppbcItem[]>([])
  const [filteredKppbcs, setFilteredKppbcs] = useState<KppbcItem[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<KppbcItem | null>(null)
  const [formData, setFormData] = useState({ code: '', name: '', office_code: '', notes: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<KppbcItem | null>(null)

  const fetchKppbcs = useCallback(async () => {
    setIsFetching(true)
    setFetchError(null)
    try {
      const res = await fetch('/api/kppbc')
      const json = await res.json()
      if (json?.success && Array.isArray(json?.list)) {
        setKppbcs(json.list)
      } else if (Array.isArray(json?.data)) {
        setKppbcs(json.data.map((d: any) => ({
          id: d.id,
          code: d.code || d.value,
          name: d.name || d.label,
          office_code: d.office_code,
          notes: d.notes,
        })))
      } else {
        setFetchError(json?.error || 'Gagal mengambil data KPPBC')
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
      fetchKppbcs()
    }
  }, [isAuthenticated, fetchKppbcs])

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredKppbcs(kppbcs)
    } else {
      const q = searchTerm.toLowerCase()
      setFilteredKppbcs(
        kppbcs.filter(
          (k) =>
            k.code.toLowerCase().includes(q) ||
            k.name.toLowerCase().includes(q) ||
            (k.office_code && k.office_code.toLowerCase().includes(q)) ||
            (k.notes && k.notes.toLowerCase().includes(q))
        )
      )
    }
  }, [kppbcs, searchTerm])

  const handleOpenAdd = () => {
    setEditItem(null)
    setFormData({ code: '', name: '', office_code: '', notes: '' })
    setShowModal(true)
  }

  const handleOpenEdit = (item: KppbcItem) => {
    setEditItem(item)
    setFormData({
      code: item.code,
      name: item.name,
      office_code: item.office_code || '',
      notes: item.notes || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.code.trim() || !formData.name.trim()) {
      toast.error('Kode dan Nama Kantor KPPBC wajib diisi')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/kppbc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const json = await res.json()
      if (json?.success) {
        toast.success(editItem ? 'Data KPPBC berhasil diperbarui' : 'Data KPPBC baru berhasil ditambahkan')
        setShowModal(false)
        fetchKppbcs()
      } else {
        toast.error(json?.error || 'Gagal menyimpan data KPPBC')
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
      const res = await fetch(`/api/kppbc?id=${deleteTarget.id || deleteTarget.code}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json?.success) {
        toast.success('Data KPPBC berhasil dihapus')
        setDeleteTarget(null)
        fetchKppbcs()
      } else {
        toast.error(json?.error || 'Gagal menghapus data KPPBC')
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
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/25">
                  <Building2 className="w-6 h-6 text-white shrink-0" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    KPPBC List (Master Data)
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                    Kelola daftar Kantor Pengawasan dan Pelayanan Bea Cukai (KPPBC) untuk penugasan PO
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah KPPBC</span>
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
                  onClick={fetchKppbcs}
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
                  placeholder="Cari kode KPPBC, nama kantor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                Total: <strong className="text-blue-600 dark:text-blue-400">{filteredKppbcs.length}</strong> Kantor KPPBC
              </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-900 text-white text-[11px] sm:text-xs font-extrabold uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3.5 text-center w-14">No</th>
                      <th className="px-4 py-3.5">Kode Unik</th>
                      <th className="px-4 py-3.5">Nama Kantor KPPBC</th>
                      <th className="px-4 py-3.5">Kode Kantor BC</th>
                      <th className="px-4 py-3.5">Catatan / Alamat</th>
                      <th className="px-4 py-3.5 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm">
                    {isFetching ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Memuat data Kantor KPPBC...
                        </td>
                      </tr>
                    ) : filteredKppbcs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          Belum ada data Kantor KPPBC
                        </td>
                      </tr>
                    ) : (
                      filteredKppbcs.map((item, idx) => (
                        <tr key={item.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                          <td className="px-4 py-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="font-mono text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900/40">
                              {item.code}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                            {item.office_code || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                            {item.notes || '-'}
                          </td>
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors cursor-pointer"
                                title="Edit KPPBC"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                title="Hapus KPPBC"
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
              {editItem ? 'Edit Data KPPBC' : 'Tambah Data KPPBC Baru'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kode Unik *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: KPPBC_PMS"
                  value={formData.code}
                  disabled={Boolean(editItem)}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Kantor KPPBC *
                </label>
                <input
                  type="text"
                  placeholder="Contoh: KPPBC Pematangsiantar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Kode Kantor BC (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 020400"
                  value={formData.office_code}
                  onChange={(e) => setFormData({ ...formData, office_code: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan / Keterangan
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan tambahan atau alamat kantor KPPBC..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500"
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
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
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
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Hapus KPPBC?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Apakah Anda yakin ingin menghapus <strong>{deleteTarget.name}</strong> ({deleteTarget.code})?
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
