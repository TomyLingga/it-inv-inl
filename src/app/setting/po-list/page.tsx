// src/app/setting/po-list/page.tsx

'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar from '@/app/components/Sidebar'
import { fetchWithTokenRefresh } from '@/lib/fetchWithTokenRefresh'
import { Search, RefreshCw, FileText, Download, Building2, Filter } from 'lucide-react'

// Shared Components
import ActiveFilters from '@/app/shared/components/ActiveFilters'
import ExportModal from '@/app/shared/components/ExportModal'
import DataTable from '@/app/shared/components/DataTable'

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
    const kppbc = setting ? setting.kppbc : 'Belum Ditentukan' // Default fallback

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
  const { isAuthenticated, loading, csrfToken, logout, refreshToken } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [data, setData] = useState<PoListData[]>([])
  const [kppbcMap, setKppbcMap] = useState<Record<string, { kppbc: string }>>({})
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [savingEbeln, setSavingEbeln] = useState<string | null>(null)

  // Filter states (Default: semua KPPBC)
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

  // Column definitions dengan select dropdown KPPBC (termasuk Belum Ditentukan)
  const columns: ColumnConfig<PoListData>[] = useMemo(
    () => [
      { key: 'no', label: 'No', filterable: false, sortable: false, width: '6' },
      {
        key: 'ebeln',
        label: 'Nomor PO',
        filterable: true,
        sortable: true,
        render: (value) => (
          <span className="whitespace-nowrap inline-block font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
            {value || '-'}
          </span>
        ),
      },
      {
        key: 'kppbc',
        label: 'Kantor Pengawas (KPPBC)',
        filterable: true,
        sortable: true,
        render: (value, row) => (
          <select
            value={row.kppbc || 'Belum Ditentukan'}
            onChange={(e) => handleChangeKppbc(row.ebeln, e.target.value)}
            disabled={savingEbeln === row.ebeln}
            className={`whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer shadow-xs ${
              row.kppbc === 'KPPBC Kuala Tanjung'
                ? 'bg-blue-900/80 text-blue-200 border-blue-600'
                : row.kppbc === 'KPPBC Pematangsiantar'
                ? 'bg-purple-900/80 text-purple-200 border-purple-600'
                : 'bg-gray-800 text-gray-300 border-gray-600'
            } disabled:opacity-50`}
          >
            <option value="Belum Ditentukan" className="bg-gray-900 text-gray-100">
              Belum Ditentukan
            </option>
            <option value="KPPBC Pematangsiantar" className="bg-gray-900 text-gray-100">
              KPPBC Pematangsiantar
            </option>
            <option value="KPPBC Kuala Tanjung" className="bg-gray-900 text-gray-100">
              KPPBC Kuala Tanjung
            </option>
          </select>
        ),
      },
      {
        key: 'jenisDok',
        label: 'Jenis Dokumen BC',
        filterable: true,
        sortable: true,
        render: (value) => (
          <span className="whitespace-nowrap inline-block text-purple-700 bg-purple-50 px-2.5 py-1 rounded text-xs font-bold border border-purple-200 shadow-2xs">
            {value || '-'}
          </span>
        ),
      },
      {
        key: 'noAju',
        label: 'Nomor Aju',
        filterable: true,
        sortable: true,
        render: (value) => (
          <span className="whitespace-nowrap inline-block font-mono text-xs text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
            {value || '-'}
          </span>
        ),
      },
      { key: 'tglAju', label: 'Tanggal Aju', filterable: true, sortable: true, className: 'whitespace-nowrap' },
      {
        key: 'noPend',
        label: 'No Pendaftaran',
        filterable: true,
        sortable: true,
        render: (value) => (
          <span className="whitespace-nowrap inline-block font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {value || '-'}
          </span>
        ),
      },
      { key: 'tglPend', label: 'Tgl Pendaftaran', filterable: true, sortable: true, className: 'whitespace-nowrap' },
    ],
    [savingEbeln]
  )

  // Process & Filter Data
  const filteredData = useMemo(() => {
    let result = [...data]

    // KPPBC Filter (Semua KPPBC atau filter spesifik)
    if (kppbcFilter !== 'all') {
      result = result.filter((item) => item.kppbc === kppbcFilter)
    }

    // Global Search Filter
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase()
      result = result.filter(
        (item) =>
          item.ebeln.toLowerCase().includes(query) ||
          item.jenisDok.toLowerCase().includes(query) ||
          item.noAju.toLowerCase().includes(query) ||
          item.tglAju.toLowerCase().includes(query) ||
          item.noPend.toLowerCase().includes(query) ||
          item.tglPend.toLowerCase().includes(query) ||
          item.kppbc.toLowerCase().includes(query)
      )
    }

    // Column Filters
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue && filterValue.trim() !== '') {
        const valStr = filterValue.toLowerCase()
        result = result.filter((item) => {
          const itemVal = String(item[key as keyof PoListData] ?? '').toLowerCase()
          return itemVal.includes(valStr)
        })
      }
    })

    // Sorting
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
    const filename = `PO_List_BeaCukai_${kppbcFilter}`
    const title = `LAPORAN PO LIST DISPLAY BEA CUKAI SAP - ${kppbcFilter === 'all' ? 'SEMUA KPPBC (GABUNGAN)' : kppbcFilter}`

    if (exportFormat === 'excel') {
      exportToExcel(filteredData, columns, filename)
    } else {
      exportToPDF(filteredData, columns, filename, title)
    }
    setShowExportModal(false)
  }

  if (loading || !isAuthenticated) return null

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      <Sidebar />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-800/80 backdrop-blur-md p-6 rounded-2xl border border-gray-700/80 shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20">
                <FileText className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  PO List & Kantor Pengawas Bea Cukai
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Pemisahan pencatatan dokumen fasilitas berdasarkan Kantor Pengawas (KPPBC Pematangsiantar & KPPBC Kuala Tanjung)
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchData}
                disabled={isFetching}
                className="px-4 py-2.5 bg-gray-700/80 hover:bg-gray-700 text-gray-200 rounded-xl font-medium transition-all flex items-center space-x-2 border border-gray-600 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => {
                  setExportFormat('excel')
                  setShowExportModal(true)
                }}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-semibold shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-gray-800/80 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-gray-700/80 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan Nomor PO, Dokumen BC, No Pend, No Aju, atau KPPBC..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-900/90 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-inner"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* KPPBC Office Filter */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-300 flex items-center space-x-1.5 whitespace-nowrap">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  <span>Kantor KPPBC:</span>
                </label>
                <select
                  value={kppbcFilter}
                  onChange={(e) => setKppbcFilter(e.target.value)}
                  className="bg-gray-900/90 border border-gray-700 text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium cursor-pointer"
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
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm flex items-center justify-between">
              <span>⚠️ Error: {fetchError}</span>
              <button
                onClick={fetchData}
                className="underline font-semibold hover:text-red-300 ml-4"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Data Table */}
          <div className="relative">
            {isFetching && data.length > 0 && (
              <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-xs z-10 flex items-center justify-center rounded-2xl">
                <div className="flex items-center space-x-3 bg-gray-800 px-6 py-4 rounded-xl border border-gray-700 shadow-2xl">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                  <span className="text-gray-200 font-medium">Memuat data Display Bea Cukai & DB...</span>
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
  )
}
