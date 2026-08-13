// src/app/stok/page.tsx

'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar, { Topbar } from '@/app/components/Sidebar'
import { Calendar, Package, AlertCircle, Loader2, Download, Search, X, RotateCcw, Factory } from 'lucide-react'
import { fetchWithTokenRefresh } from '@/lib/fetchWithTokenRefresh'

// Shared Components
import ExportModal from '@/app/shared/components/ExportModal'
import DataTable from '@/app/shared/components/DataTable'
import { Spinner } from '@/app/components/ui/spinner'
import LoadingOverlay from '@/app/components/ui/LoadingOverlay'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'

// Shared Utils & Types
import { StokData, SortConfig, ExportFormat } from '@/app/shared/types'
import { PLANT_OPTIONS } from '@/app/shared/utils/constants'
import { exportToExcel, exportToPDF } from '@/app/shared/utils/exportUtils'
import {
  createSortFunction,
  resequenceData,
  normalizeCode,
} from '@/app/shared/utils/filterUtils'

// Module-specific Config
import { STOK_CONFIG } from './config'

// ─── SAP response → StokData mapper ──────────────────────────────────────────
function mapSapToStok(raw: any[], selectedDate: string): StokData[] {
  return raw.map((item, idx) => ({
    no: idx + 1,
    postingDate: selectedDate,
    startDate: selectedDate,
    endDate: selectedDate,
    batch: item.CHARG ?? '',
    kodeBarang: item.MATNR ?? '',
    kodeHS: item.HSCODE ?? '',
    namaBarang: item.MAKTX ?? '',
    lokasi: item.LGOBE ?? '',
    lokasiId: item.LGORT ?? '',
    satuan: item.MEINS ?? '',
    jumlah: Number(item.END_STOCK_QTY) || 0,
    nilaiBarang: (Number(item.END_STOCK_VALUE) || 0) * 100,
    currency: item.WAERS ?? '',
  }))
}

function toSapDate(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

function getTodayIso(): string {
  return new Date().toISOString().split('T')[0]
}

export default function StokPage() {
  const { isAuthenticated, userName, loading, csrfToken, logout, refreshToken } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [data, setData] = useState<StokData[]>([])
  const [filteredData, setFilteredData] = useState<StokData[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState(getTodayIso())
  const [selectedPlant, setSelectedPlant] = useState('IN01')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [showColumnFilter, setShowColumnFilter] = useState<string | null>(null)

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig<StokData>>({
    key: 'postingDate',
    direction: 'desc',
  })

  // Export states
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')

  // Fetch dari SAP
  const fetchData = useCallback(async () => {
    if (!csrfToken) return

    setIsFetching(true)
    setFetchError(null)

    const requestBody = {
      I_COMPANY_CODE: [
        {
          SIGN: 'I',
          OPTION: 'EQ',
          LOW: 'INL0',
          HIGH: '',
        },
      ],
      I_PLANT: [
        {
          SIGN: 'I',
          OPTION: 'EQ',
          LOW: selectedPlant || '',
          HIGH: '',
        },
      ],
      I_POSTING_DATE: [
        {
          SIGN: 'I',
          OPTION: 'EQ',
          LOW: toSapDate(selectedDate),
          HIGH: '',
        },
      ],
    }

    try {
      const { data: rawData, error, didLogout } = await fetchWithTokenRefresh<any[]>({
        url: '/api/stok',
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
      const mapped = mapSapToStok(rawArray, selectedDate)

      // Fetch status fasilitas material
      try {
        const resFac = await fetch('/api/material-facility')
        const jsonFac = await resFac.json()
        if (jsonFac?.success && jsonFac?.data) {
          const rawFacMap = jsonFac.data
          const facilityMap: Record<string, any> = {}
          Object.entries(rawFacMap).forEach(([k, v]) => {
            facilityMap[k] = v
            facilityMap[normalizeCode(k)] = v
          })

          const facilityOnly = mapped.filter((item) => {
            const rawCode = item.kodeBarang ?? ''
            const normCode = normalizeCode(rawCode)
            const setting = facilityMap[rawCode] ?? facilityMap[normCode]
            return setting ? Boolean(setting.is_facility) : false
          })

          setData(facilityOnly)
        } else {
          setData(mapped)
        }
      } catch (errFac) {
        console.error('Gagal mengambil data fasilitas material:', errFac)
        setData(mapped)
      }
    } catch (err: any) {
      setFetchError(err.message || 'Gagal mengambil data stok dari SAP')
    } finally {
      setIsFetching(false)
    }
  }, [csrfToken, selectedPlant, selectedDate, logout, refreshToken, router])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !loading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isClient, loading, isAuthenticated, router])

  useEffect(() => {
    if (isAuthenticated && csrfToken) {
      fetchData()
    }
  }, [isAuthenticated, csrfToken, fetchData])

  // Filter & Sort Logic
  useEffect(() => {
    let result = [...data]

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase()
      result = result.filter(
        (item) =>
          item.kodeBarang.toLowerCase().includes(q) ||
          item.namaBarang.toLowerCase().includes(q) ||
          item.batch.toLowerCase().includes(q) ||
          item.lokasi.toLowerCase().includes(q) ||
          item.kodeHS.toLowerCase().includes(q)
      )
    }

    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue && filterValue.trim() !== '') {
        const valStr = filterValue.toLowerCase()
        result = result.filter((item) => {
          const itemVal = String(item[key as keyof StokData] ?? '').toLowerCase()
          return itemVal.includes(valStr)
        })
      }
    })

    result.sort(createSortFunction(sortConfig))
    setFilteredData(resequenceData(result))
  }, [data, searchTerm, columnFilters, sortConfig])

  // Handlers
  const handleSort = (key: keyof StokData) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleColumnFilter = (key: string, value: string) => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }))
  }

  const clearColumnFilter = (key: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleClearAllFilters = () => {
    setSearchTerm('')
    setSelectedPlant('IN01')
    setSelectedDate(getTodayIso())
    setColumnFilters({})
    setShowColumnFilter(null)
  }

  const handleExport = () => {
    const filename = `${STOK_CONFIG.exportConfig.filename}_${selectedPlant}_${selectedDate}`
    if (exportFormat === 'excel') {
      exportToExcel(filteredData, STOK_CONFIG.columns, filename)
    } else {
      exportToPDF(
        filteredData,
        STOK_CONFIG.columns,
        filename,
        STOK_CONFIG.exportConfig.title
      )
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
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="max-w-full space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-3.5">
                <Package className="w-8 h-8 sm:w-9 sm:h-9 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {STOK_CONFIG.title}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                    {STOK_CONFIG.description}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-center">
                <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                  {isFetching ? '...' : filteredData.length}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                  dari {data.length} total data
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {fetchError && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-sm font-semibold">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                  <span>{fetchError}</span>
                </div>
                <button
                  onClick={fetchData}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 underline hover:text-rose-800 dark:hover:text-rose-200 ml-4 shrink-0"
                >
                  Coba lagi
                </button>
              </div>
            )}


            {/* Filters Toolbar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 sm:p-5 border border-slate-200 dark:border-slate-800 transition-colors duration-200 space-y-4">
              {/* Row 1: Plant & Tanggal Stok */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
                {/* Plant */}
                <div className="sm:col-span-1 lg:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Factory className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Plant</span>
                  </label>
                  <select
                    value={selectedPlant}
                    onChange={(e) => setSelectedPlant(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-medium cursor-pointer shadow-2xs"
                  >
                    {PLANT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Single Date */}
                <div className="sm:col-span-1 lg:col-span-6">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Tanggal Stok</span>
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    max={getTodayIso()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer shadow-2xs"
                  />
                </div>
              </div>

              {/* Row 2: Full Width Global Search */}
              <div className="w-full pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Pencarian Global
                </label>
                <div className="relative w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Cari kode barang, nama barang..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full h-10 pl-10 sm:pl-11 pr-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 transition-all shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Active Filters Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 sm:p-5 border border-slate-200 dark:border-slate-800 transition-colors duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Filter Aktif:
                </span>
                {selectedPlant && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50 rounded-full text-xs font-medium">
                    Plant: {selectedPlant}
                    <X
                      className="w-3.5 h-3.5 cursor-pointer hover:opacity-75"
                      onClick={() => setSelectedPlant('IN01')}
                    />
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50 rounded-full text-xs font-medium">
                  Tanggal: {selectedDate}
                  <X
                    className="w-3.5 h-3.5 cursor-pointer hover:opacity-75"
                    onClick={() => setSelectedDate(getTodayIso())}
                  />
                </span>
                {searchTerm && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 rounded-full text-xs font-medium">
                    Pencarian: {searchTerm}
                    <X
                      className="w-3.5 h-3.5 cursor-pointer hover:opacity-75"
                      onClick={() => setSearchTerm('')}
                    />
                  </span>
                )}
                {Object.entries(columnFilters).map(([key, val]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 rounded-full text-xs font-medium"
                  >
                    {key}: {val}
                    <X
                      className="w-3.5 h-3.5 cursor-pointer hover:opacity-75"
                      onClick={() => clearColumnFilter(key)}
                    />
                  </span>
                ))}

                <button
                  onClick={handleClearAllFilters}
                  title="Reset semua filter"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Export Button */}
              <div className="shrink-0 self-end sm:self-auto pt-2 sm:pt-0">
                <InteractiveHoverButton
                  onClick={() => setShowExportModal(true)}
                  disabled={filteredData.length === 0}
                  text="Export"
                  icon={<Download className="w-4 h-4" />}
                  className="w-[138px] h-9 text-xs"
                />
              </div>
            </div>

            {/* Data Table */}
            <DataTable
              data={filteredData}
              columns={STOK_CONFIG.columns}
              sortConfig={sortConfig}
              onSort={handleSort}
              columnFilters={columnFilters}
              onColumnFilter={handleColumnFilter}
              onClearColumnFilter={clearColumnFilter}
              showColumnFilter={showColumnFilter}
              setShowColumnFilter={setShowColumnFilter}
              onClearAllFilters={handleClearAllFilters}
              tableConfig={STOK_CONFIG.tableConfig}
              pageSize={25}
              isLoading={isFetching}
            />
          </div>
        </div>
      )}
      </div>

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
