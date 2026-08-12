// src/app/stok/page.tsx

'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar from '@/app/components/Sidebar'
import { Calendar } from 'lucide-react'
import { fetchWithTokenRefresh } from '@/lib/fetchWithTokenRefresh'

// Shared Components
import ActiveFilters from '@/app/shared/components/ActiveFilters'
import ExportModal from '@/app/shared/components/ExportModal'
import DataTable from '@/app/shared/components/DataTable'

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
    postingDate: selectedDate,   // pakai selectedDate sebagai postingDate
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

// ─── Format date for SAP: YYYYMMDD ───────────────────────────────────────────
function toSapDate(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

// ─── Get today's date as ISO string ──────────────────────────────────────────
function getTodayIso(): string {
  return new Date().toISOString().split('T')[0]
}

export default function StokPage() {
  const { isAuthenticated, loading, csrfToken, logout, refreshToken } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [data, setData] = useState<StokData[]>([])
  const [filteredData, setFilteredData] = useState<StokData[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filter states — stok hanya 1 tanggal, bukan range
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

  // ─── Fetch dari SAP ──────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!csrfToken) return

    setIsFetching(true)
    setFetchError(null)

    // API stock-inl: filter company code, plant, and posting date
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
      if (error) { setFetchError(error); return }

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

          // Filter: HANYA tampilkan material berstatus Fasilitas (is_facility === true)
          const facilityOnly = mapped.filter((item) => {
            const normMatnr = normalizeCode(item.kodeBarang)
            const setting = facilityMap[normMatnr] || facilityMap[item.kodeBarang]
            return setting && Boolean(setting.is_facility) === true
          })
          setData(facilityOnly)
          return
        }
      } catch (fErr) {
        console.warn('Gagal memuat status fasilitas material:', fErr)
      }

      setData([])
    } catch (err: any) {
      setFetchError(err.message || 'Gagal mengambil data')
    } finally {
      setIsFetching(false)
    }
  }, [csrfToken, selectedDate, selectedPlant, logout, refreshToken, router])

  // ─── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, loading, router])

  // Fetch ulang saat tanggal / plant berubah
  useEffect(() => {
    if (isAuthenticated && !loading && csrfToken) {
      fetchData()
    }
  }, [isAuthenticated, loading, csrfToken, selectedDate, selectedPlant, fetchData])

  // ─── Client-side filter + sort ────────────────────────────────────────────
  useEffect(() => {
    // Filter teks & kolom saja (date filter sudah dilakukan sisi server)
    let filtered = [...data]

    // Global search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter((row) =>
        Object.values(row).some((v) => String(v).toLowerCase().includes(term))
      )
    }

    // Column filters
    Object.entries(columnFilters).forEach(([key, val]) => {
      if (val) {
        filtered = filtered.filter((row) =>
          String((row as any)[key]).toLowerCase().includes(val.toLowerCase())
        )
      }
    })

    const sortFn = createSortFunction(sortConfig)
    const sorted = [...filtered].sort(sortFn)
    const resequenced = resequenceData(sorted)
    setFilteredData(resequenced)
  }, [data, searchTerm, columnFilters, sortConfig])

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSort = (key: keyof StokData) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleExport = () => {
    if (exportFormat === 'excel') {
      exportToExcel(filteredData, STOK_CONFIG.columns, STOK_CONFIG.exportConfig.filename)
    } else {
      exportToPDF(
        filteredData,
        STOK_CONFIG.columns,
        STOK_CONFIG.exportConfig.filename,
        STOK_CONFIG.exportConfig.title
      )
    }
    setShowExportModal(false)
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setColumnFilters({})
  }

  const clearColumnFilter = (key: string) => {
    setColumnFilters((prev) => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
    setShowColumnFilter(null)
  }

  // ─── Loading & Auth ───────────────────────────────────────────────────────
  if (!isClient || loading) {
    return (
      <div className='flex h-screen bg-gray-50 items-center justify-center'>
        <div className='text-xl text-gray-500 animate-pulse'>Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className='flex h-screen bg-gray-50'>
      <Sidebar />
      <div className='flex-1 min-w-0 overflow-hidden'>
        <div className='h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
          <div className='max-w-full'>

            {/* Header */}
            <div className='mb-4 lg:mb-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2 sm:space-x-3'>
                  <span className='text-2xl sm:text-3xl lg:text-4xl'>{STOK_CONFIG.icon}</span>
                  <div>
                    <h1 className='text-2xl sm:text-3xl lg:text-3xl font-bold text-gray-900'>
                      {STOK_CONFIG.title}
                    </h1>
                    <p className='text-gray-600 text-xs sm:text-sm mt-1'>
                      {STOK_CONFIG.description}
                    </p>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-xl sm:text-2xl lg:text-2xl font-bold text-blue-600'>
                    {isFetching ? '...' : filteredData.length}
                  </div>
                  <div className='text-xs text-gray-500'>dari {data.length} total data</div>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {fetchError && (
              <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between'>
                <span className='text-sm text-red-700'>⚠️ {fetchError}</span>
                <button
                  onClick={fetchData}
                  className='text-xs text-red-600 underline hover:text-red-800 ml-4 flex-shrink-0'
                >
                  Coba lagi
                </button>
              </div>
            )}

            {/* Loading Indicator */}
            {isFetching && (
              <div className='mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg'>
                <span className='text-sm text-blue-700 animate-pulse'>
                  ⏳ Mengambil data dari SAP...
                </span>
              </div>
            )}

            {/* Filters — Stok pakai single date */}
            <div className='bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 lg:mb-6 border border-gray-200'>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4'>
                {/* Plant */}
                <div className='md:col-span-1 lg:col-span-3'>
                  <label className='block text-xs font-medium text-gray-700 mb-1.5'>Plant</label>
                  <select
                    value={selectedPlant}
                    onChange={(e) => setSelectedPlant(e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
                  >
                    {PLANT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div className='md:col-span-1 lg:col-span-4'>
                  <label className='block text-xs font-medium text-gray-700 mb-1.5'>Pencarian Global</label>
                  <div className='relative'>
                    <svg className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' /></svg>
                    <input
                      type='text'
                      placeholder='Cari kode barang, nama barang...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className='w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
                    />
                  </div>
                </div>

                {/* Single Date */}
                <div className='md:col-span-1 lg:col-span-3'>
                  <label className='block text-xs font-medium text-gray-700 mb-1.5'>
                    <Calendar className='inline w-3.5 h-3.5 mr-1' />
                    Tanggal Stok
                  </label>
                  <input
                    type='date'
                    value={selectedDate}
                    max={getTodayIso()}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  />
                </div>

                {/* Export */}
                <div className='md:col-span-1 lg:col-span-2 flex items-end'>
                  <button
                    onClick={() => setShowExportModal(true)}
                    disabled={filteredData.length === 0}
                    className='w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center space-x-1.5 text-sm'
                  >
                    <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' /></svg>
                    <span>Export</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filters — tampilkan tanggal yang aktif */}
            <div className='bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 lg:mb-6 border border-gray-200'>
              <div className='flex flex-wrap gap-2 items-center'>
                {selectedPlant && (
                  <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium'>
                    Plant: {selectedPlant}
                    <button onClick={() => setSelectedPlant('IN01')} className='ml-1 text-blue-400 hover:text-blue-600'>×</button>
                  </span>
                )}
                <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium'>
                  📅 Tanggal: {selectedDate}
                  <button onClick={() => setSelectedDate(getTodayIso())} className='ml-1 text-purple-400 hover:text-purple-600'>×</button>
                </span>
                {searchTerm && (
                  <span className='inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium'>
                    Cari: {'"'}{searchTerm}{'"'}
                    <button onClick={() => setSearchTerm('')} className='ml-1 text-gray-400 hover:text-gray-600'>×</button>
                  </span>
                )}
                {Object.entries(columnFilters).map(([key, val]) => (
                  <span key={key} className='inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium'>
                    {key}: {'"'}{val}{'"'}
                    <button onClick={() => clearColumnFilter(key)} className='ml-1 text-yellow-400 hover:text-yellow-600'>×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Export Modal */}
            <ExportModal
              isOpen={showExportModal}
              onClose={() => setShowExportModal(false)}
              dataCount={filteredData.length}
              exportFormat={exportFormat}
              onFormatChange={setExportFormat}
              onExport={handleExport}
            />

            {/* Data Table */}
            <DataTable
              data={filteredData}
              columns={STOK_CONFIG.columns}
              sortConfig={sortConfig}
              onSort={handleSort}
              columnFilters={columnFilters}
              onColumnFilter={(key, value) =>
                setColumnFilters((prev) => ({ ...prev, [key]: value }))
              }
              onClearColumnFilter={clearColumnFilter}
              showColumnFilter={showColumnFilter}
              setShowColumnFilter={setShowColumnFilter}
              onClearAllFilters={clearAllFilters}
              tableConfig={STOK_CONFIG.tableConfig}
              pageSize={25}
            />

          </div>
        </div>
      </div>
    </div>
  )
}
