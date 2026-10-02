// src/app/mutasi/page.tsx

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar, { Topbar } from '@/app/components/Sidebar'
import {
  ArrowLeftRight,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Activity,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Calendar,
  X,
  FileText,
  User,
  Factory,
  DollarSign,
  Boxes,
  HelpCircle,
  Workflow,
  Table2,
  RotateCcw,
  GitBranch,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Shared Components
import FilterSection from '@/app/shared/components/FilterSection'
import ActiveFilters from '@/app/shared/components/ActiveFilters'
import ExportModal from '@/app/shared/components/ExportModal'
import DataTable from '@/app/shared/components/DataTable'
import SearchableSelect from '@/app/shared/components/SearchableSelect'
import LoadingOverlay from '@/app/components/ui/LoadingOverlay'

// Shared Utils & Types
import { MutasiData, SortConfig, ExportFormat, DateRange } from '@/app/shared/types'
import { PLANT_OPTIONS } from '@/app/shared/utils/constants'
import { exportToExcel, exportToPDF } from '@/app/shared/utils/exportUtils'
import {
  createSortFunction,
  applyFilters,
  resequenceData,
  normalizeCode,
} from '@/app/shared/utils/filterUtils'

// Module-specific Config
import { MUTASI_CONFIG } from './config'
import MutasiFlowView from './MutasiFlowView'
import { buildBatchJourneys, isReversal } from './mutasiUtils'
import { fadeInUp, modalBackdrop, modalPanel, useReducedMotionSafe } from '@/app/shared/utils/motion'
import { loadMutasiWithPartners } from './mutasiData'

function getTodayDateRange(): DateRange {
  const today = new Date().toISOString().split('T')[0]
  return { start: today, end: today }
}

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return '-'
  const d = new Date(isoDate)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Modal Traceability Detail ───────────────────────────────────────────────
interface TraceabilityModalProps {
  data: MutasiData
  allRows: MutasiData[]
  reduce: boolean
  onClose: () => void
}

function TraceabilityModal({ data, allRows, reduce, onClose }: TraceabilityModalProps) {
  const isMasuk = data.shkzg === 'S' || data.arahMutasi === 'Masuk'
  const reversal = isReversal(data)

  // Batch journey (all movements sharing this material + batch), oldest → newest.
  const journeySteps = useMemo(() => {
    const journeys = buildBatchJourneys(allRows)
    const match = journeys.find(
      (j) => j.material === (data.kodeBarang ?? '') && j.batch === (data.batch ?? '')
    )
    return match?.steps ?? [data]
  }, [allRows, data])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        variants={reduce ? undefined : modalBackdrop}
        initial={reduce ? undefined : 'hidden'}
        animate={reduce ? undefined : 'visible'}
        exit={reduce ? undefined : 'exit'}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        variants={reduce ? undefined : modalPanel}
        initial={reduce ? undefined : 'hidden'}
        animate={reduce ? undefined : 'visible'}
        exit={reduce ? undefined : 'exit'}
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800 dark:to-indigo-950/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-md ${
              isMasuk
                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                : 'bg-rose-600 text-white shadow-rose-500/20'
            }`}>
              {isMasuk ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Traceability Mutasi Material
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                  isMasuk
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200'
                    : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200'
                }`}>
                  {isMasuk ? 'Penerimaan / Masuk (+)' : 'Pengeluaran / Keluar (-)'}
                </span>
                {reversal && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200">
                    <RotateCcw className="w-3 h-3" /> Pembatalan
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dokumen Material: <strong className="font-mono text-slate-700 dark:text-slate-200">{data.nomorDokMaterial}</strong> ({data.tahunDokumen} / Item {data.itemDokumen})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Visual Route Flow (Dari ➔ Ke) */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-900/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-900 dark:text-indigo-300">
              <Workflow className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Alur Pergerakan Barang (Traceability Flow)</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
              <div className="text-center sm:text-left flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Asal Mutasi (From)</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{data.asalMutasi || '-'}</span>
              </div>
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
              <div className="text-center sm:text-right flex-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tujuan Mutasi (To)</span>
                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{data.tujuanMutasi || '-'}</span>
              </div>
            </div>
          </div>

          {/* Batch Journey Timeline (riwayat pergerakan batch/material) */}
          {journeySteps.length > 1 && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Riwayat Batch (Journey) — {journeySteps.length} langkah</span>
              </div>
              <ol className="relative">
                {journeySteps.map((s, i) => {
                  const sMasuk = s.shkzg === 'S' || s.arahMutasi === 'Masuk'
                  const sReversal = isReversal(s)
                  const isCurrent =
                    s.nomorDokMaterial === data.nomorDokMaterial && s.itemDokumen === data.itemDokumen
                  return (
                    <li key={`${s.nomorDokMaterial}-${s.itemDokumen}-${i}`} className="relative pl-7 pb-2.5 last:pb-0">
                      {i !== journeySteps.length - 1 && (
                        <span className="absolute left-[9px] top-5 bottom-0 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
                      )}
                      <span
                        className={`absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                          sReversal
                            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-600'
                            : sMasuk
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-600'
                            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-600'
                        }`}
                      >
                        {sReversal ? <RotateCcw className="w-3 h-3" /> : sMasuk ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      </span>
                      <div className={`rounded-lg px-2.5 py-1.5 text-[11px] ${isCurrent ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40' : ''}`}>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-bold text-slate-600 dark:text-slate-300">{formatDateDisplay(s.postingDate)}</span>
                          <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300">{s.movementType}</span>
                          <span className="text-slate-500 dark:text-slate-400 truncate max-w-[150px]">{s.asalMutasi} ➔ {s.tujuanMutasi}</span>
                          <span className={`font-mono font-bold num-tabular ${sReversal ? 'text-rose-500 line-through' : sMasuk ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {sMasuk ? '+' : '-'}{Math.abs(Number(s.jumlah) || 0).toLocaleString('id-ID')} {s.satuan}
                          </span>
                          {isCurrent && <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase">• baris ini</span>}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}

          {/* Material & Movement Overview */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Material</span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {data.namaBarang || '-'}
                </span>
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  Kode Material: {data.kodeBarang || '-'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Kuantitas</span>
                <span className={`text-base font-black font-mono ${isMasuk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {isMasuk ? '+' : '-'}{Math.abs(data.jumlah).toLocaleString('id-ID')} {data.satuan}
                </span>
                <span className="text-xs text-slate-500 font-mono block">
                  Rp {data.nilaiMutasi.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {data.movementType && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-slate-500">Movement Type (BWART):</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {data.movementType} - {data.movementText || 'Goods Movement'}
                </span>
              </div>
            )}
          </div>

          {/* Traceability Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Lokasi & Batch */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <Factory className="w-4 h-4 text-emerald-600" />
                <span>Lokasi & Batch Fisik</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plant:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{data.plant} {data.plantName ? `(${data.plantName})` : ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Storage Location (Gudang):</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{data.storageLocation || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nomor Batch:</span>
                  <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{data.batch || '-'}</span>
                </div>
                {data.valuationType && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valuation Type:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{data.valuationType}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Referensi Transaksi / PO / Order */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Referensi Transaksi & Order</span>
              </div>
              <div className="space-y-1 text-xs">
                {data.namaMitra && (
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-400 shrink-0">
                      {data.peranMitra === 'Customer' ? 'Customer / Buyer:' : 'Vendor / Supplier:'}
                    </span>
                    <span className="font-bold text-right text-slate-800 dark:text-slate-100">{data.namaMitra}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Purchase Order (PO):</span>
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {data.nomorPo ? `${data.nomorPo} (Item ${data.itemPo})` : '-'}
                  </span>
                </div>
                {data.nomorSO && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sales Order (SO):</span>
                    <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{data.nomorSO}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Order Produksi (AUFNR):</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{data.orderNo || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cost Center (KOSTL):</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{data.costCenter || '-'}</span>
                </div>
                {data.kodeVendor && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kode Vendor (LIFNR):</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{data.kodeVendor}</span>
                  </div>
                )}
                {data.customer && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kode Customer (KUNNR):</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{data.customer}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Waktu & Audit SAP */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <User className="w-4 h-4 text-indigo-600" />
                <span>Audit & Jejak Pengguna</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">User SAP:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{data.userSap || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Posting Date (BUDAT):</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{formatDateDisplay(data.postingDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Document Date (BLDAT):</span>
                  <span className="text-slate-700 dark:text-slate-300">{formatDateDisplay(data.docDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Waktu Entry:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{data.entryDate} {data.entryTime}</span>
                </div>
              </div>
            </div>

            {/* Keterangan & Catatan Header / Item */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white pb-1.5 border-b border-slate-100 dark:border-slate-800">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Keterangan Header & Item</span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Header Text (BKTXT):</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-xs block bg-slate-50 dark:bg-slate-800 p-1.5 rounded mt-0.5">
                    {data.headerText || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Item Text (SGTXT):</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 text-xs block bg-slate-50 dark:bg-slate-800 p-1.5 rounded mt-0.5">
                    {data.itemText || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end gap-2 shrink-0">
          {(data.batch || data.orderNo) && (
            <a
              href={`/traceability?q=${encodeURIComponent(data.batch || data.orderNo)}&plant=${encodeURIComponent(data.plant || '')}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Telusuri hulu & hilir
            </a>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-all hover:opacity-90 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MutasiPage() {
  const { isAuthenticated, userName, loading, csrfToken, logout, refreshToken } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [data, setData] = useState<MutasiData[]>([])
  const [filteredData, setFilteredData] = useState<MutasiData[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>(getTodayDateRange())
  const [selectedPlant, setSelectedPlant] = useState('IN01')
  const [selectedArah, setSelectedArah] = useState<'all' | 'Masuk' | 'Keluar'>('all')
  const [selectedMatnr, setSelectedMatnr] = useState('all')
  const [plantOptions, setPlantOptions] = useState<{ value: string; label: string }[]>(PLANT_OPTIONS)
  const [materialOptions, setMaterialOptions] = useState<{ value: string; label: string }[]>([])
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [showColumnFilter, setShowColumnFilter] = useState<string | null>(null)

  // Detail Modal
  const [selectedTraceability, setSelectedTraceability] = useState<MutasiData | null>(null)

  // View mode: 'tabel' (all columns) or 'alur' (batch-journey timeline)
  const [viewMode, setViewMode] = useState<'tabel' | 'alur'>('tabel')
  const reduce = useReducedMotionSafe()

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig<MutasiData>>({
    key: 'postingDate',
    direction: 'desc',
  })

  // Export states
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')

  // Fetch Plant options dari DB
  useEffect(() => {
    fetch('/api/plants')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json?.data) && json.data.length > 0) {
          setPlantOptions(json.data)
        }
      })
      .catch((err) => console.error('Gagal mengambil daftar plant:', err))
  }, [])

  // ─── Fetch data mutasi dari SAP ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!csrfToken) return

    setIsFetching(true)
    setFetchError(null)

    try {
      const { rows: mapped, error, didLogout } = await loadMutasiWithPartners({
        plant: selectedPlant || 'IN01',
        start: dateRange.start,
        end: dateRange.end,
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

      // Filter hanya material dengan fasilitas kepabeanan (is_facility = true)
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
      setFetchError(err.message || 'Gagal mengambil data mutasi dari SAP')
    } finally {
      setIsFetching(false)
    }
  }, [csrfToken, selectedPlant, dateRange, logout, refreshToken, router])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (isClient && !loading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isClient, loading, isAuthenticated, router])

  useEffect(() => {
    if (isClient && isAuthenticated && csrfToken) {
      fetchData()
    }
  }, [fetchData, isClient, isAuthenticated, csrfToken])

  // ─── Fetch unique facility material options from backend and SAP ───────────
  useEffect(() => {
    if (!isAuthenticated || !csrfToken) return

    const loadMaterialOptions = async () => {
      try {
        // 1. Fetch facility map from DB
        const facRes = await fetch('/api/material-facility')
        const facJson = await facRes.json()
        const localFacilities = facJson?.list || []
        
        // Filter codes that are active facilities
        const activeFacilityCodes = new Set(
          localFacilities
            .filter((m: any) => m.is_facility)
            .map((m: any) => normalizeCode(m.matnr))
        )

        if (activeFacilityCodes.size === 0) {
          setMaterialOptions([])
          return
        }

        // 2. Fetch full material descriptions from SAP
        const sapRes = await fetch('/api/setting/material-list', {
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
        const sapMaterials = await sapRes.json()

        if (Array.isArray(sapMaterials)) {
          const opts: { value: string; label: string }[] = []
          sapMaterials.forEach((item) => {
            const rawMatnr = item.MATNR ?? ''
            const normMatnr = normalizeCode(rawMatnr)
            if (activeFacilityCodes.has(normMatnr)) {
              opts.push({
                value: rawMatnr,
                label: `${normMatnr} – ${item.MAKTX || ''}`,
              })
            }
          })
          
          // Sort by label
          opts.sort((a, b) => a.label.localeCompare(b.label))
          setMaterialOptions(opts)
        }
      } catch (err) {
        console.error('Gagal memuat opsi material fasilitas:', err)
      }
    }

    loadMaterialOptions()
  }, [isAuthenticated, csrfToken])

  // ─── Filter & Sort Processing ──────────────────────────────────────────────
  useEffect(() => {
    const filtered = applyFilters(
      data,
      searchTerm,
      selectedPlant,
      dateRange,
      columnFilters,
      'postingDate'
    )

    let result = [...filtered]

    // Filter Arah Mutasi (Masuk / Keluar)
    if (selectedArah !== 'all') {
      result = result.filter((item) => item.arahMutasi === selectedArah)
    }

    // Filter Material (hanya fasilitas kepabeanan yg dipilih)
    if (selectedMatnr !== 'all') {
      result = result.filter((item) => item.kodeBarang === selectedMatnr)
    }

    // Sort
    const sortFn = createSortFunction<MutasiData>(sortConfig)
    result.sort(sortFn)

    // Resequence No
    const resequenced = resequenceData(result)

    setFilteredData(resequenced)
  }, [data, searchTerm, columnFilters, sortConfig, selectedArah, selectedMatnr, selectedPlant, dateRange])

  // Handlers
  const handleSort = (key: keyof MutasiData) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const clearColumnFilter = (key: string) => {
    setColumnFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setShowColumnFilter(null)
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setColumnFilters({})
    setSelectedArah('all')
    setSelectedMatnr('all')
  }

  const handleExport = () => {
    if (exportFormat === 'excel') {
      exportToExcel(
        filteredData,
        MUTASI_CONFIG.columns,
        MUTASI_CONFIG.exportConfig.filename
      )
    } else {
      exportToPDF(
        filteredData,
        MUTASI_CONFIG.columns,
        MUTASI_CONFIG.exportConfig.filename,
        MUTASI_CONFIG.exportConfig.title
      )
    }
    setShowExportModal(false)
  }

  // ─── KPI Calculations ───────────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    let masukQty = 0
    let keluarQty = 0
    let totalNilai = 0
    let countMasuk = 0
    let countKeluar = 0

    filteredData.forEach((item) => {
      const qty = Math.abs(Number(item.jumlah) || 0)
      const val = Number(item.nilaiMutasi) || 0
      totalNilai += val

      if (item.shkzg === 'S' || item.arahMutasi === 'Masuk') {
        masukQty += qty
        countMasuk++
      } else {
        keluarQty += qty
        countKeluar++
      }
    })

    return {
      totalTransaksi: filteredData.length,
      masukQty,
      keluarQty,
      totalNilai,
      countMasuk,
      countKeluar,
    }
  }, [filteredData])

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
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 shadow-lg shadow-indigo-500/25">
                    <ArrowLeftRight className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {MUTASI_CONFIG.title}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                      {MUTASI_CONFIG.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {isFetching ? '...' : filteredData.length}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    dari {data.length} total mutasi
                  </div>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <motion.div
                variants={reduce ? undefined : fadeInUp}
                initial={reduce ? undefined : 'hidden'}
                animate={reduce ? undefined : 'visible'}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
              >
                {/* Total Transaksi */}
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Total Mutasi</span>
                    <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {isFetching ? '...' : kpiStats.totalTransaksi} <span className="text-xs font-normal text-slate-400">transaksi</span>
                    </p>
                  </div>
                </div>

                {/* Mutasi Masuk */}
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Penerimaan (Masuk)</span>
                    <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                      +{isFetching ? '...' : kpiStats.masukQty.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                    </p>
                    <span className="text-[11px] text-slate-400">{kpiStats.countMasuk} kali masuk</span>
                  </div>
                </div>

                {/* Mutasi Keluar */}
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                    <TrendingDown className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Pengeluaran (Keluar)</span>
                    <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                      -{isFetching ? '...' : kpiStats.keluarQty.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                    </p>
                    <span className="text-[11px] text-slate-400">{kpiStats.countKeluar} kali keluar</span>
                  </div>
                </div>

                {/* Total Nilai Mutasi */}
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Total Nilai Transaksi</span>
                    <p className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                      Rp {isFetching ? '...' : kpiStats.totalNilai.toLocaleString('id-ID', { maximumFractionDigits: 0 })}
                    </p>
                    <span className="text-[11px] text-slate-400">Mata Uang IDR</span>
                  </div>
                </div>
              </motion.div>

              {/* Error Banner */}
              {fetchError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-sm font-semibold">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{fetchError}</span>
                  </div>
                  <button
                    onClick={fetchData}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 underline hover:text-rose-800 dark:hover:text-rose-200 ml-4 shrink-0 cursor-pointer"
                  >
                    Coba lagi
                  </button>
                </div>
              )}

              {/* Filters Toolbar */}
              <FilterSection
                config={MUTASI_CONFIG.filterConfig}
                selectedPlant={selectedPlant}
                onPlantChange={setSelectedPlant}
                plantOptions={plantOptions}
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
                customFiltersSpan={6}
                customFilters={
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
                    {/* Filter: Arah Mutasi */}
                    <div className="flex flex-col">
                      <label className="flex items-center h-5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 gap-1.5">
                        <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Arah Mutasi</span>
                      </label>
                      <select
                        value={selectedArah}
                        onChange={(e) => setSelectedArah(e.target.value as any)}
                        className="w-full h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 font-medium cursor-pointer shadow-2xs"
                      >
                        <option value="all">Semua Arah (Masuk & Keluar)</option>
                        <option value="Masuk">Masuk / Penerimaan (Debit S)</option>
                        <option value="Keluar">Keluar / Pengeluaran (Kredit H)</option>
                      </select>
                    </div>

                    {/* Filter: Material (hanya fasilitas kepabeanan) */}
                    <div className="flex flex-col">
                      <label className="flex items-center h-5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                        <span>Material</span>
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-900/30">
                          Fasilitas Kepabeanan
                        </span>
                      </label>
                      <SearchableSelect
                        value={selectedMatnr}
                        onChange={setSelectedMatnr}
                        options={materialOptions}
                        allOption={{ value: 'all', label: 'Semua Material Fasilitas' }}
                        searchPlaceholder="Cari kode / nama material..."
                        icon={<Boxes className="w-4 h-4" />}
                        focusRing="focus:ring-violet-500"
                      />
                    </div>
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
                  onClearDateRange={() => setDateRange(getTodayDateRange())}
                  columnFilters={columnFilters}
                  onClearColumnFilter={clearColumnFilter}
                  onClearAll={clearAllFilters}
                  columns={MUTASI_CONFIG.columns}
                  plantOptions={plantOptions}
                  showExportButton={MUTASI_CONFIG.filterConfig.showExportButton}
                  onExportClick={() => {
                    setExportFormat('excel')
                    setShowExportModal(true)
                  }}
                  dataCount={filteredData.length}
                />
              </div>

              {/* View toggle: Tabel (semua kolom) vs Alur (timeline per batch) */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-xs">
                  <button
                    type="button"
                    onClick={() => setViewMode('tabel')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      viewMode === 'tabel'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Table2 className="w-3.5 h-3.5" />
                    <span>Tabel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('alur')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      viewMode === 'alur'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Workflow className="w-3.5 h-3.5" />
                    <span>Alur (Traceability)</span>
                  </button>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
                  {viewMode === 'tabel'
                    ? 'Tampilan tabel lengkap — semua kolom data'
                    : 'Penelusuran pergerakan barang per batch/material'}
                </span>
              </div>

              {/* Data: Tabel atau Alur */}
              {viewMode === 'tabel' ? (
                <div className="relative">
                  <DataTable
                    data={filteredData}
                    columns={MUTASI_CONFIG.columns}
                    columnGroups={MUTASI_CONFIG.columnGroups}
                    storageKey="mutasi"
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
                    tableConfig={MUTASI_CONFIG.tableConfig}
                    pageSize={25}
                    isLoading={isFetching}
                    onRowClick={(row: MutasiData) => setSelectedTraceability(row)}
                  />
                </div>
              ) : (
                <MutasiFlowView
                  data={filteredData}
                  onSelect={(row) => setSelectedTraceability(row)}
                />
              )}
            </div>
          </div>
        )}
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

      {/* Traceability Detail Modal */}
      <AnimatePresence>
        {selectedTraceability && (
          <TraceabilityModal
            key="traceability-modal"
            data={selectedTraceability}
            allRows={filteredData}
            reduce={reduce}
            onClose={() => setSelectedTraceability(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
