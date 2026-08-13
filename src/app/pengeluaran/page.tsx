// src/app/pengeluaran/page.tsx

'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar, { Topbar } from '@/app/components/Sidebar'
import { ArrowUpFromLine, AlertCircle, Loader2, Building2 } from 'lucide-react'

// Shared Components
import FilterSection from '@/app/shared/components/FilterSection'
import ActiveFilters from '@/app/shared/components/ActiveFilters'
import ExportModal from '@/app/shared/components/ExportModal'
import DataTable from '@/app/shared/components/DataTable'
import { Spinner } from '@/app/components/ui/spinner'
import LoadingOverlay from '@/app/components/ui/LoadingOverlay'

// Shared Utils & Types
import { PengeluaranData, SortConfig, ExportFormat } from '@/app/shared/types'
import { PLANT_OPTIONS } from '@/app/shared/utils/constants'
import { exportToExcel, exportToPDF } from '@/app/shared/utils/exportUtils'
import {
  getDefaultDateRange,
  createSortFunction,
  applyFilters,
  resequenceData,
  normalizeCode,
} from '@/app/shared/utils/filterUtils'

// Module-specific Config
import { PENGELUARAN_CONFIG } from './config'
import { fetchWithTokenRefresh } from '@/lib/fetchWithTokenRefresh'

// ─── SAP response → PengeluaranData mapper ────────────────────────────────────
function mapSapToPengeluaran(raw: any[]): PengeluaranData[] {
  return raw.map((item, idx) => {
    // API mengembalikan angka numerik biasa, gunakan Number() langsung
    const nilaiBarang = Number(item.NILAIBRG) || 0;
    const jumlahBarang = Number(item.JUMLAH) || 0;


    return {
      no: idx + 1,
      postingDate: item.BUDAT ?? '',
      nomorDokMaterial: item.MBLNR ?? '',   // ← dokumen material SAP
      jenisDokBC: item.JENISDOK ?? '',
      nomorDokAju: item.NOAJU ?? '',
      tglDokAju: item.TGLAJU ?? '',
      nomorDokPendaftaran: item.NOPENDT ?? '',
      tglDokPendaftaran: item.TGLPEND ?? '',
      nomorPo: item.EBELN ?? '',
      nomorSO: item.VBELN ?? '',
      penerima: item.VENDOR ?? '',
      kodeBarang: item.KODEBRG ?? '',
      kodeHS: item.CODEHS ?? '',
      namaBarang: item.NAMABRG ?? '',
      satuan: item.SATUAN ?? '',
      jumlah: jumlahBarang,
      nilaiBarang: nilaiBarang * 100,
    };
  });
}

// ─── Format date for SAP: YYYYMMDD ───────────────────────────────────────────
function toSapDate(isoDate: string): string {
  return isoDate.replace(/-/g, '')
}

export default function PengeluaranPage() {
  const { isAuthenticated, userName, loading, csrfToken, logout, refreshToken } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [data, setData] = useState<PengeluaranData[]>([])
  const [filteredData, setFilteredData] = useState<PengeluaranData[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState(getDefaultDateRange())
  const [selectedPlant, setSelectedPlant] = useState('IN01')
  const [selectedKppbc, setSelectedKppbc] = useState('KPPBC Pematangsiantar')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [showColumnFilter, setShowColumnFilter] = useState<string | null>(null)

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig<PengeluaranData>>({
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

    // Filter menggunakan Posting Date (BUDAT) — bukan Tgl Dok Pendaftaran
    const requestBody = {
      I_TGLDOKPEND: [],
      I_JENISDOK: [],
      I_NAMABRG: '',
      I_PLANT: selectedPlant || '',
      I_PSTINGDATE: [
        {
          SIGN: 'I',
          OPTION: 'BT',
          LOW: toSapDate(dateRange.start),
          HIGH: toSapDate(dateRange.end),
        },
      ],
    }

    try {
      const { data: rawData, error, didLogout } = await fetchWithTokenRefresh<any[]>({
        url: '/api/pengeluaran',
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
      const mapped = mapSapToPengeluaran(rawArray)

      // Fetch status fasilitas material & KPPBC PO
      try {
        const [resFac, resKppbc] = await Promise.all([
          fetch('/api/material-facility').then((r) => r.json()),
          fetch('/api/po-kppbc').then((r) => r.json()),
        ])

        const rawFacMap = resFac?.data || {}
        const rawKppbcMap = resKppbc?.data || {}

        // Buat map ter-normalisasi
        const facilityMap: Record<string, any> = {}
        Object.entries(rawFacMap).forEach(([k, v]) => {
          facilityMap[k] = v
          facilityMap[normalizeCode(k)] = v
        })

        const kppbcMap: Record<string, any> = {}
        Object.entries(rawKppbcMap).forEach(([k, v]) => {
          kppbcMap[k] = v
          kppbcMap[normalizeCode(k)] = v
        })

        // Filter 1: HANYA tampilkan material berstatus Fasilitas (is_facility === true)
        let filteredList = mapped.filter((item) => {
          const normMatnr = normalizeCode(item.kodeBarang)
          const setting = facilityMap[normMatnr] || facilityMap[item.kodeBarang]
          return setting && Boolean(setting.is_facility) === true
        })

        // Filter 2: Filter berdasarkan Kantor KPPBC PO (KPPBC Pematangsiantar vs KPPBC Kuala Tanjung)
        filteredList = filteredList.filter((item) => {
          const normPo = normalizeCode(item.nomorPo)
          const poSetting = kppbcMap[normPo] || kppbcMap[item.nomorPo]
          const itemKppbc = poSetting ? poSetting.kppbc : 'Belum Ditentukan'
          return itemKppbc === selectedKppbc
        })

        setData(filteredList)
        return
      } catch (fErr) {
        console.warn('Gagal memuat filter fasilitas/KPPBC:', fErr)
      }

      setData([])
    } catch (err: any) {
      setFetchError(err.message || 'Gagal mengambil data')
    } finally {
      setIsFetching(false)
    }
  }, [csrfToken, dateRange, selectedPlant, selectedKppbc, logout, refreshToken, router])

  // ─── Init ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (isAuthenticated && !loading && csrfToken) {
      fetchData()
    }
  }, [isAuthenticated, loading, csrfToken, dateRange, selectedPlant, fetchData])

  // ─── Client-side filter + sort — gunakan postingDate sebagai date filter field
  useEffect(() => {
    const filtered = applyFilters(
      data,
      searchTerm,
      selectedPlant,
      dateRange,
      columnFilters,
      'postingDate'   // ← filter lokal juga pakai postingDate
    )
    const sortFn = createSortFunction(sortConfig)
    const sorted = [...filtered].sort(sortFn)
    const resequenced = resequenceData(sorted)
    setFilteredData(resequenced)
  }, [data, searchTerm, columnFilters, sortConfig, dateRange, selectedPlant])

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSort = (key: keyof PengeluaranData) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleExport = () => {
    if (exportFormat === 'excel') {
      exportToExcel(filteredData, PENGELUARAN_CONFIG.columns, PENGELUARAN_CONFIG.exportConfig.filename)
    } else {
      exportToPDF(
        filteredData,
        PENGELUARAN_CONFIG.columns,
        PENGELUARAN_CONFIG.exportConfig.filename,
        PENGELUARAN_CONFIG.exportConfig.title
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
                <ArrowUpFromLine className="w-8 h-8 sm:w-9 sm:h-9 text-rose-600 dark:text-rose-400 shrink-0" />
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    {PENGELUARAN_CONFIG.title}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                    {PENGELUARAN_CONFIG.description}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-center">
                <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
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


            {/* Filters */}
            <FilterSection
              config={PENGELUARAN_CONFIG.filterConfig}
              selectedPlant={selectedPlant}
              onPlantChange={setSelectedPlant}
              plantOptions={PLANT_OPTIONS}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              dateRange={dateRange}
              onDateChange={(field, value) =>
                setDateRange((prev) => ({ ...prev, [field]: value }))
              }
              onExportClick={() => {
                setExportFormat('excel')
                setShowExportModal(true)
              }}
              dataCount={filteredData.length}
              customFilters={
                <div className="flex flex-col w-full">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>KPPBC</span>
                  </label>
                  <select
                    value={selectedKppbc}
                    onChange={(e) => setSelectedKppbc(e.target.value)}
                    className="w-full h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 font-medium cursor-pointer shadow-2xs"
                  >
                    <option value="KPPBC Pematangsiantar">KPPBC Pematangsiantar</option>
                    <option value="KPPBC Kuala Tanjung">KPPBC Kuala Tanjung</option>
                  </select>
                </div>
              }
            />

            {/* Active Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 sm:p-5 border border-slate-200 dark:border-slate-800">
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
                columns={PENGELUARAN_CONFIG.columns}
                plantOptions={PLANT_OPTIONS}
                showExportButton={PENGELUARAN_CONFIG.filterConfig.showExportButton}
                onExportClick={() => {
                  setExportFormat('excel')
                  setShowExportModal(true)
                }}
                dataCount={filteredData.length}
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
              columns={PENGELUARAN_CONFIG.columns}
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
              tableConfig={PENGELUARAN_CONFIG.tableConfig}
              pageSize={25}
              isLoading={isFetching}
            />

          </div>
        </div>
      )}
      </div>
    </div>
  )
}
