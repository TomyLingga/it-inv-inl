// src/app/stok/page.tsx

'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar from '@/app/components/Sidebar'

// Shared Components
import FilterSection from '@/app/shared/components/FilterSection'
import ActiveFilters from '@/app/shared/components/ActiveFilters'
import ExportModal from '@/app/shared/components/ExportModal'
import DataTable from '@/app/shared/components/DataTable'

// Shared Utils & Types
import { StokData, SortConfig, ExportFormat } from '@/app/shared/types'
import { PLANT_OPTIONS } from '@/app/shared/utils/constants'
import { exportToExcel, exportToPDF } from '@/app/shared/utils/exportUtils'
import {
  getDefaultDateRange,
  createSortFunction,
  applyFilters,
  resequenceData,
} from '@/app/shared/utils/filterUtils'

// Module-specific Config
import { STOK_CONFIG } from './config'

// ─── SAP response → StokData mapper ──────────────────────────────────────────
function mapSapToStok(raw: any[]): StokData[] {
  return raw.map((item, idx) => ({
    no: idx + 1,
    postingDate:  item.POSTING_DATE  ?? '',
    kodeBarang:   item.KODE_BARANG   ?? '',
    kodeHS:       item.CODEHS        ?? '',
    namaBarang:   item.NAMA_BARANG   ?? '',
    lokasi:       item.NAMA_LOCATION  ?? '',
    lokasiId:   item.LOCATION ?? '',
    satuan:       item.SATUAN        ?? '',
    jumlah:       Number(item.JUMLAH)      || 0,
    nilaiBarang:  Number(item.NILAI_BARANG) || 0,
  }))
}

// ─── Format date for SAP: YYYYMMDD ───────────────────────────────────────────
function toSapDate(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

export default function StokPage() {
  const { isAuthenticated, loading, csrfToken, logout } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [data, setData] = useState<StokData[]>([])
  const [filteredData, setFilteredData] = useState<StokData[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState(getDefaultDateRange())
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

    const requestBody = {
      I_PLANT: selectedPlant || '',
      I_POSTING_DATE: [
        {
          SIGN:   'I',
          OPTION: 'BT',
          LOW:    toSapDate(dateRange.start),
          HIGH:   toSapDate(dateRange.end),
        },
      ],
    }

    try {
      const res = await fetch('/api/stok', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(requestBody),
      })

      // Token expired / unauthorized → logout
      if (res.status === 403 || res.status === 401) {
        logout()
        router.replace('/')
        return
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        setFetchError(errJson.message || `Error ${res.status}`)
        setIsFetching(false)
        return
      }

      const json = await res.json()
      const rawArray: any[] = Array.isArray(json)
        ? json
        : json.data ?? json.results ?? []

      const mapped = mapSapToStok(rawArray)
      setData(mapped)
    } catch (err: any) {
      setFetchError(err.message || 'Gagal mengambil data')
    } finally {
      setIsFetching(false)
    }
  }, [csrfToken, dateRange, selectedPlant, logout, router])

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
  }, [isAuthenticated, loading, csrfToken, dateRange, selectedPlant])

  // ─── Client-side filter + sort ────────────────────────────────────────────
  useEffect(() => {
    // Stok pakai postingDate untuk filter tanggal (bukan tglDokPendaftaran)
    const filtered = applyFilters(
      data,
      searchTerm,
      selectedPlant,
      dateRange,
      columnFilters,
      'postingDate'
    )
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

            {/* Filters */}
            <FilterSection
              config={STOK_CONFIG.filterConfig}
              selectedPlant={selectedPlant}
              onPlantChange={setSelectedPlant}
              plantOptions={PLANT_OPTIONS}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              dateRange={dateRange}
              onDateChange={(field, value) =>
                setDateRange((prev) => ({ ...prev, [field]: value }))
              }
              onExportClick={() => setShowExportModal(true)}
              dataCount={filteredData.length}
            />

            {/* Active Filters */}
            <div className='bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 lg:mb-6 border border-gray-200'>
              <ActiveFilters
                selectedPlant={selectedPlant}
                onClearPlant={() => setSelectedPlant('')}
                searchTerm={searchTerm}
                onClearSearch={() => setSearchTerm('')}
                dateRange={dateRange}
                onClearDateRange={() => setDateRange(getDefaultDateRange())}
                columnFilters={columnFilters}
                onClearColumnFilter={clearColumnFilter}
                onClearAll={clearAllFilters}
                columns={STOK_CONFIG.columns}
                plantOptions={PLANT_OPTIONS}
              />
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
