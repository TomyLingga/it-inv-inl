// src/app/setting/po-list/page.tsx

'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar, { Topbar } from '@/app/components/Sidebar'
import { fetchWithTokenRefresh } from '@/lib/fetchWithTokenRefresh'
import { Search, RefreshCw, FileText, Download, Building2, Filter } from 'lucide-react'

// Shared Components
import ActiveFilters from '@/app/shared/components/ActiveFilters'
import ExportModal from '@/app/shared/components/ExportModal'
import DataTable from '@/app/shared/components/DataTable'
import LoadingOverlay from '@/app/components/ui/LoadingOverlay'

// Shared Utils & Types
import { PoListData, SortConfig, ExportFormat, ColumnConfig } from '@/app/shared/types'
import { exportToExcel, exportToPDF } from '@/app/shared/utils/exportUtils'
import { createSortFunction, resequenceData } from '@/app/shared/utils/filterUtils'

function mapSapToPo(
  raw: any[],
  kppbcMap: Record<string, { kppbc: string }>
): PoListData[] {
  return raw.map((item, idx) => {
    const ebeln = item.EBELN ?? ''
    const setting = kppbcMap[ebeln]
    const kppbc = setting ? setting.kppbc : 'Belum Ditentukan'

    return {
      no: idx + 1,
      postingDate: item.ZTGL_PENDT || item.ZTGL_AJU || item.TGLPEND || item.TGLAJU || '',
      mandt: item.MANDT ?? '',
      ebeln,
      jenisDok: item.ZJENISDOK || item.JENISDOK || '',
      noAju: item.ZNOAJU || item.NOAJU || '',
      tglAju: item.ZTGL_AJU || item.TGLAJU || '',
      noPend: item.ZNOPENDT || item.NOPEND || item.NOPENDT || '',
      tglPend: item.ZTGL_PENDT || item.TGLPEND || '',
      kppbc,
    }
  })
}

export default function PoListPage() {
  const { isAuthenticated, userName, loading, csrfToken, logout, refreshToken } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [data, setData] = useState<PoListData[]>([])
  const [kppbcMap, setKppbcMap] = useState<Record<string, { kppbc: string }>>({})
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [savingEbeln, setSavingEbeln] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [kppbcFilter, setKppbcFilter] = useState<string>('all')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [showColumnFilter, setShowColumnFilter] = useState<string | null>(null)

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig<PoListData>>({
    key: 'ebeln',
    direction: 'asc',
  })

  // Export states
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')

  // Fetch KPPBC Map dari Laravel DB
  const fetchKppbcMap = useCallback(async () => {
    try {
      const res = await fetch('/api/po-kppbc')
      const json = await res.json()
      if (json.success && json.data) {
        setKppbcMap(json.data)
        return json.data
      }
    } catch (err) {
      console.error('Gagal mengambil data KPPBC PO:', err)
    }
    return {}
  }, [])

  // Fetch dari SAP & Merge
  const fetchData = useCallback(async () => {
    if (!csrfToken) return

    setIsFetching(true)
    setFetchError(null)

    const map = await fetchKppbcMap()

    const requestBody = {
      S_EBELN: [
        {
          SIGN: 'I',
          OPTION: 'BT',
          LOW: '4100306631',
          HIGH: '9900000099',
        },
      ],
    }

    try {
      const { data: rawData, error, didLogout } = await fetchWithTokenRefresh<any[]>({
        url: '/api/setting/po-list',
        method: 'POST',
        body: requestBody,
        csrfToken: csrfToken!,
        refreshToken,
        logout,
        onLogout: () => router.replace('/'),
      })

      if (didLogout) return
      if (error) {
        setFetchError(error)
        return
      }

      const rawArray: any[] = Array.isArray(rawData) ? rawData : []
      const mapped = mapSapToPo(rawArray, map)
      setData(mapped)
    } catch (err: any) {
      setFetchError(err.message || 'Gagal mengambil data PO List')
    } finally {
      setIsFetching(false)
    }
  }, [csrfToken, fetchKppbcMap, logout, refreshToken, router])

  const hasFetchedRef = useRef(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !loading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isClient, loading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && csrfToken && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      fetchData()
    }
  }, [isAuthenticated, csrfToken, fetchData])

  // Handler update KPPBC PO
  const handleChangeKppbc = async (ebeln: string, newKppbc: string) => {
    setSavingEbeln(ebeln)

    // Optimistic UI update
    setData((prev) =>
      prev.map((item) =>
        item.ebeln === ebeln ? { ...item, kppbc: newKppbc } : item
      )
    )

    try {
      const res = await fetch('/api/po-kppbc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ebeln,
          kppbc: newKppbc,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        alert('Gagal memperbarui kantor KPPBC di database.')
        fetchData()
      }
    } catch (err) {
      alert('Gagal menghubungkan ke backend API.')
      fetchData()
    } finally {
      setSavingEbeln(null)
    }
  }

  // Column definitions
  const columns: ColumnConfig<PoListData>[] = useMemo(
    () => [
      { key: 'no', label: 'No', filterable: false, sortable: false, width: '6' },
      {
        key: 'ebeln',
        label: 'Nomor PO',
        filterable: true,
        sortable: true,
        render: (value) => (
          <span className="whitespace-nowrap inline-block font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-900/40">
            {value || '-'}
          </span>
        ),
      },
      {
        key: 'kppbc',
        label: 'Kantor Pengawas Bea Cukai',
        filterable: true,
        sortable: true,
        render: (value, row) => {
          const isSaving = savingEbeln === row.ebeln
          return (
            <div className="flex items-center space-x-2">
              <select
                value={row.kppbc}
                onChange={(e) => handleChangeKppbc(row.ebeln, e.target.value)}
                disabled={isSaving}
                className={`text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-all border ${row.kppbc === 'KPPBC Pematangsiantar'
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900/40 text-purple-700 dark:text-purple-300'
                    : row.kppbc === 'KPPBC Kuala Tanjung'
                      ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                  } disabled:opacity-50`}
              >
                <option value="Belum Ditentukan">Belum Ditentukan</option>
                <option value="KPPBC Pematangsiantar">KPPBC Pematangsiantar</option>
                <option value="KPPBC Kuala Tanjung">KPPBC Kuala Tanjung</option>
              </select>
            </div>
          )
        },
      },
      { key: 'jenisDok', label: 'Jenis Dok BC', filterable: true, sortable: true },
      { key: 'noAju', label: 'Nomor Aju', filterable: true, sortable: true },
      { key: 'tglAju', label: 'Tgl Aju', filterable: true, sortable: true },
      { key: 'noPend', label: 'Nomor Pendftr', filterable: true, sortable: true },
      { key: 'tglPend', label: 'Tgl Pendftr', filterable: true, sortable: true },
    ],
    [savingEbeln]
  )

  // Process & Filter Data
  const filteredData = useMemo(() => {
    let result = [...data]

    if (kppbcFilter !== 'all') {
      result = result.filter((item) => item.kppbc === kppbcFilter)
    }

    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase()
      result = result.filter(
        (item) =>
          item.ebeln.toLowerCase().includes(query) ||
          item.jenisDok.toLowerCase().includes(query) ||
          item.noAju.toLowerCase().includes(query) ||
          item.noPend.toLowerCase().includes(query) ||
          item.kppbc.toLowerCase().includes(query)
      )
    }

    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue && filterValue.trim() !== '') {
        const valStr = filterValue.toLowerCase()
        result = result.filter((item) => {
          const itemVal = String(item[key as keyof PoListData] ?? '').toLowerCase()
          return itemVal.includes(valStr)
        })
      }
    })

    result.sort(createSortFunction(sortConfig))
    return resequenceData(result)
  }, [data, kppbcFilter, searchTerm, columnFilters, sortConfig])

  // Handlers
  const handleSort = (key: keyof PoListData) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleColumnFilter = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleClearColumnFilter = (key: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setKppbcFilter('all')
    setColumnFilters({})
  }

  const handleExport = () => {
    const filename = `PO_List_${kppbcFilter}`
    const title = 'DAFTAR PO LIST & KANTOR PENGAWAS BEA CUKAI SAP'

    if (exportFormat === 'excel') {
      exportToExcel(filteredData, columns, filename)
    } else {
      exportToPDF(filteredData, columns, filename, title)
    }
    setShowExportModal(false)
  }

  const isPageLoading = !isClient || loading || (isFetching && data.length === 0)

  if (isClient && !loading && !isAuthenticated) return null

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar userName={userName} />
        {isPageLoading ? (
          <LoadingOverlay />
        ) : (
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3.5">
                <FileText className="w-8 h-8 sm:w-9 sm:h-9 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    PO List & Kantor Pengawas Bea Cukai
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                    Pemisahan pencatatan dokumen fasilitas berdasarkan Kantor Pengawas (KPPBC Pematangsiantar & KPPBC Kuala Tanjung)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchData}
                  disabled={isFetching}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all flex items-center space-x-2 border border-slate-300 dark:border-slate-700 shadow-xs text-xs sm:text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <button
                  onClick={() => {
                    setExportFormat('excel')
                    setShowExportModal(true)
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-all flex items-center space-x-2 text-xs sm:text-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                {/* Search Bar */}
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari berdasarkan Nomor PO, Dokumen BC, No Pend, No Aju, atau KPPBC..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* KPPBC Office Filter */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5 whitespace-nowrap">
                    <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span>Kantor KPPBC:</span>
                  </label>
                  <select
                    value={kppbcFilter}
                    onChange={(e) => setKppbcFilter(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium cursor-pointer"
                  >
                    <option value="all">Semua KPPBC (Gabungan)</option>
                    <option value="KPPBC Pematangsiantar">KPPBC Pematangsiantar</option>
                    <option value="KPPBC Kuala Tanjung">KPPBC Kuala Tanjung</option>
                  </select>
                </div>
              </div>

              {/* Active Filter Badges */}
              <ActiveFilters
                searchTerm={searchTerm}
                columnFilters={columnFilters}
                columns={columns}
                onClearSearch={() => setSearchTerm('')}
                onClearColumnFilter={handleClearColumnFilter}
                onClearAll={handleClearAllFilters}
              />
            </div>

            {/* Error Alert */}
            {fetchError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl text-rose-700 dark:text-rose-300 text-sm font-semibold flex items-center justify-between shadow-xs">
                <span>{fetchError}</span>
                <button
                  onClick={fetchData}
                  className="underline font-bold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 ml-4"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Data Table */}
            <div className="relative">
              {isFetching && data.length > 0 && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs z-10 flex items-center justify-center rounded-2xl">
                  <div className="flex items-center space-x-3 bg-white dark:bg-slate-900 px-6 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl">
                    <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin" />
                    <span className="text-slate-800 dark:text-slate-200 font-semibold">Memuat data Display Bea Cukai & DB...</span>
                  </div>
                </div>
              )}

              <DataTable
                data={filteredData}
                columns={columns}
                sortConfig={sortConfig}
                onSort={handleSort}
                columnFilters={columnFilters}
                onColumnFilter={handleColumnFilter}
                onClearColumnFilter={handleClearColumnFilter}
                showColumnFilter={showColumnFilter}
                setShowColumnFilter={setShowColumnFilter}
                onClearAllFilters={handleClearAllFilters}
                tableConfig={{
                  showFooter: true,
                  footerCalculations: [
                    { column: 'ebeln', type: 'count', label: 'Total Dokumen PO' },
                  ],
                }}
                pageSize={25}
                isLoading={isFetching}
              />
            </div>
          </div>
        </main>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <ExportModal
            isOpen={showExportModal}
            onClose={() => setShowExportModal(false)}
            dataCount={filteredData.length}
            exportFormat={exportFormat}
            onFormatChange={setExportFormat}
            onExport={handleExport}
          />
        )}
      </div>
    </div>
  )
}
