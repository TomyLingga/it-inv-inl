// src/app/setting/material-list/page.tsx

'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar from '@/app/components/Sidebar'
import { fetchWithTokenRefresh } from '@/lib/fetchWithTokenRefresh'
import { Search, RefreshCw, Boxes, Download, Filter, CheckCircle2, XCircle } from 'lucide-react'

// Shared Components
import ActiveFilters from '@/app/shared/components/ActiveFilters'
import ExportModal from '@/app/shared/components/ExportModal'
import DataTable from '@/app/shared/components/DataTable'

// Shared Utils & Types
import { MaterialListData, SortConfig, ExportFormat, ColumnConfig } from '@/app/shared/types'
import { PLANT_OPTIONS } from '@/app/shared/utils/constants'
import { exportToExcel, exportToPDF } from '@/app/shared/utils/exportUtils'
import { createSortFunction, resequenceData } from '@/app/shared/utils/filterUtils'

function mapSapToMaterial(
  raw: any[],
  facilityMap: Record<string, { is_facility: boolean; facility_type: string }>
): MaterialListData[] {
  return raw.map((item, idx) => {
    const matnr = item.MATNR ?? ''
    const setting = facilityMap[matnr]
    const isFacility = setting ? Boolean(setting.is_facility) : false // Default false (Non-Fasilitas)

    return {
      no: idx + 1,
      postingDate: '',
      matnr,
      maktx: item.MAKTX ?? '',
      werks: item.WERKS ?? '',
      bwtar: item.BWTAR ?? '',
      meins: item.MEINS ?? '',
      mtart: item.MTART ?? '',
      mtbez: item.MTBEZ ?? '',
      matkl: item.MATKL ?? '',
      wgbez: item.WGBEZ ?? '',
      isFacility,
      facilityType: isFacility ? 'fasilitas' : 'non_fasilitas',
    }
  })
}

export default function MaterialListPage() {
  const { isAuthenticated, loading, csrfToken, logout, refreshToken } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [data, setData] = useState<MaterialListData[]>([])
  const [facilityMap, setFacilityMap] = useState<Record<string, { is_facility: boolean; facility_type: string }>>({})
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [savingMatnr, setSavingMatnr] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlant, setSelectedPlant] = useState('IN01')
  const [facilityFilter, setFacilityFilter] = useState<'all' | 'fasilitas' | 'non_fasilitas'>('all')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [showColumnFilter, setShowColumnFilter] = useState<string | null>(null)

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig<MaterialListData>>({
    key: 'matnr',
    direction: 'asc',
  })

  // Export states
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')

  // Fetch Facility Map dari Laravel DB
  const fetchFacilityMap = useCallback(async () => {
    try {
      const res = await fetch('/api/material-facility')
      const json = await res.json()
      if (json.success && json.data) {
        setFacilityMap(json.data)
        return json.data
      }
    } catch (err) {
      console.error('Gagal mengambil data fasilitas material:', err)
    }
    return {}
  }, [])

  // Fetch dari SAP & Merge
  const fetchData = useCallback(async () => {
    if (!csrfToken) return

    setIsFetching(true)
    setFetchError(null)

    const map = await fetchFacilityMap()

    const requestBody = {
      I_BEWFLG: 'X',
      I_WERKS: [
        {
          SIGN: 'I',
          OPTION: 'EQ',
          LOW: selectedPlant || 'IN01',
          HIGH: '',
        },
      ],
      I_MATNR: [
        {
          SIGN: 'I',
          OPTION: 'BT',
          LOW: '000000000000000001',
          HIGH: '999999999999999999',
        },
      ],
    }

    try {
      const { data: rawData, error, didLogout } = await fetchWithTokenRefresh<any[]>({
        url: '/api/setting/material-list',
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
      const mapped = mapSapToMaterial(rawArray, map)
      setData(mapped)
    } catch (err: any) {
      setFetchError(err.message || 'Gagal mengambil data Material List')
    } finally {
      setIsFetching(false)
    }
  }, [csrfToken, selectedPlant, fetchFacilityMap, logout, refreshToken, router])

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

  // Handler update status fasilitas
  const handleToggleFacility = async (matnr: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    setSavingMatnr(matnr)

    // Optimistic UI update
    setData((prev) =>
      prev.map((item) =>
        item.matnr === matnr
          ? {
              ...item,
              isFacility: newStatus,
              facilityType: newStatus ? 'fasilitas' : 'non_fasilitas',
            }
          : item
      )
    )

    try {
      const res = await fetch('/api/material-facility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matnr,
          is_facility: newStatus,
          facility_type: newStatus ? 'fasilitas' : 'non_fasilitas',
        }),
      })
      const json = await res.json()
      if (!json.success) {
        alert('Gagal memperbarui status fasilitas kepabeanan di database.')
        // Rollback
        fetchData()
      }
    } catch (err) {
      alert('Gagal menghubungkan ke backend API.')
      fetchData()
    } finally {
      setSavingMatnr(null)
    }
  }

  // Define Columns dengan Interactive Switch Component
  const columns: ColumnConfig<MaterialListData>[] = useMemo(
    () => [
      { key: 'no', label: 'No', filterable: false, sortable: false, width: '6' },
      {
        key: 'matnr',
        label: 'Nomor Material',
        filterable: true,
        sortable: true,
        render: (value) => (
          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
            {value}
          </span>
        ),
      },
      {
        key: 'isFacility',
        label: 'Fasilitas Kepabeanan',
        filterable: true,
        sortable: true,
        render: (value, row) => {
          const isSaving = savingMatnr === row.matnr
          return (
            <button
              onClick={() => handleToggleFacility(row.matnr, row.isFacility)}
              disabled={isSaving}
              className={`px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5 transition-all shadow-sm hover:scale-105 ${
                row.isFacility
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              } disabled:opacity-50`}
              title="Klik untuk mengubah status Fasilitas Kepabeanan"
            >
              {row.isFacility ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Fasilitas</span>
                </>
              ) : (
                <>
                  <XCircle className="w-3.5 h-3.5 text-gray-400" />
                  <span>Non-Fasilitas</span>
                </>
              )}
            </button>
          )
        },
      },
      {
        key: 'maktx',
        label: 'Deskripsi Material',
        filterable: true,
        sortable: true,
        render: (value) => (
          <span className="text-gray-900 font-medium max-w-xs truncate block" title={value}>
            {value || '-'}
          </span>
        ),
      },
      {
        key: 'werks',
        label: 'Plant',
        filterable: true,
        sortable: true,
        render: (value) => (
          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">
            {value || '-'}
          </span>
        ),
      },
      { key: 'bwtar', label: 'Valuation Type', filterable: true, sortable: true },
      { key: 'meins', label: 'Satuan (UoM)', filterable: true, sortable: true },
      { key: 'mtart', label: 'Kode Type', filterable: true, sortable: true },
      {
        key: 'mtbez',
        label: 'Material Type',
        filterable: true,
        sortable: true,
        render: (value) => (
          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-xs font-medium">
            {value || '-'}
          </span>
        ),
      },
      { key: 'matkl', label: 'Material Group', filterable: true, sortable: true },
      { key: 'wgbez', label: 'Deskripsi Group', filterable: true, sortable: true },
    ],
    [savingMatnr]
  )

  // Process & Filter Data
  const filteredData = useMemo(() => {
    let result = [...data]

    // Facility Filter
    if (facilityFilter === 'fasilitas') {
      result = result.filter((item) => item.isFacility)
    } else if (facilityFilter === 'non_fasilitas') {
      result = result.filter((item) => !item.isFacility)
    }

    // Global Search Filter
    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase()
      result = result.filter(
        (item) =>
          item.matnr.toLowerCase().includes(query) ||
          item.maktx.toLowerCase().includes(query) ||
          item.werks.toLowerCase().includes(query) ||
          item.mtbez.toLowerCase().includes(query) ||
          item.wgbez.toLowerCase().includes(query) ||
          item.matkl.toLowerCase().includes(query)
      )
    }

    // Column Filters
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue && filterValue.trim() !== '') {
        const valStr = filterValue.toLowerCase()
        result = result.filter((item) => {
          const itemVal = String(item[key as keyof MaterialListData] ?? '').toLowerCase()
          return itemVal.includes(valStr)
        })
      }
    })

    // Sorting
    result.sort(createSortFunction(sortConfig))

    return resequenceData(result)
  }, [data, facilityFilter, searchTerm, columnFilters, sortConfig])

  // Handlers
  const handleSort = (key: keyof MaterialListData) => {
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
    setFacilityFilter('all')
    setColumnFilters({})
  }

  const handleExport = () => {
    const filename = `Material_List_${selectedPlant}_${facilityFilter}`
    const title = 'DAFTAR MATERIAL LIST & FASILITAS KEPABEANAN SAP'

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
              <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Boxes className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Material List & Fasilitas Kepabeanan
                </h1>
                <p className="text-sm text-gray-400 mt-1">
                  Atur status fasilitas kepabeanan material yang ditampilkan di Pemasukan, Pengeluaran, & Stok
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
                  placeholder="Cari berdasarkan Nomor Material, Deskripsi, Type, atau Group..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-900/90 border border-gray-700 rounded-xl text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-inner"
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

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Facility Filter */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center space-x-1.5 whitespace-nowrap">
                    <Filter className="w-4 h-4 text-emerald-400" />
                    <span>Fasilitas:</span>
                  </label>
                  <select
                    value={facilityFilter}
                    onChange={(e: any) => setFacilityFilter(e.target.value)}
                    className="bg-gray-900/90 border border-gray-700 text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value="all">Semua Status</option>
                    <option value="fasilitas">🟢 Fasilitas Kepabeanan</option>
                    <option value="non_fasilitas">⚪ Non-Fasilitas</option>
                  </select>
                </div>

                {/* Plant Filter */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-300 whitespace-nowrap">
                    Plant:
                  </label>
                  <select
                    value={selectedPlant}
                    onChange={(e) => setSelectedPlant(e.target.value)}
                    className="bg-gray-900/90 border border-gray-700 text-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {PLANT_OPTIONS.map((plant) => (
                      <option key={plant.value} value={plant.value}>
                        {plant.label} ({plant.value})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Active Filter Badges */}
            <ActiveFilters
              searchTerm={searchTerm}
              selectedPlant={selectedPlant}
              columnFilters={columnFilters}
              columns={columns}
              onClearSearch={() => setSearchTerm('')}
              onClearPlant={() => setSelectedPlant('IN01')}
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
                  <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                  <span className="text-gray-200 font-medium">Memuat data dari SAP & Database...</span>
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
                  { column: 'matnr', type: 'count', label: 'Total Material' },
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
