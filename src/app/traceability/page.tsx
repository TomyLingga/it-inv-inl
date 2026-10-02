// src/app/traceability/page.tsx
//
// Batch traceability: search by batch / production order / PO / SO / material
// document / vendor-customer / material, then see in one screen
//   • Hulu  (backward) — raw & supporting materials and their suppliers
//   • Hilir (forward)  — the products made from it and the customers it went to

'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  GitBranch,
  Search,
  RefreshCw,
  AlertCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Boxes,
  Factory,
  Truck,
  Store,
  Info,
  X,
} from 'lucide-react'
import { useAuth } from '@/app/components/useAuth'
import Sidebar, { Topbar } from '@/app/components/Sidebar'
import LoadingOverlay from '@/app/components/ui/LoadingOverlay'
import { MutasiData } from '@/app/shared/types'
import { PLANT_OPTIONS } from '@/app/shared/utils/constants'
import { normalizeCode } from '@/app/shared/utils/filterUtils'
import { loadMutasiWithPartners } from '@/app/mutasi/mutasiData'
import {
  buildTraceGraph,
  buildTraceTree,
  searchTrace,
  summarizeTree,
  TraceCandidate,
  TraceGraph,
  TraceRoot,
  TraceNode,
  TraceSummaryRow,
} from './traceEngine'
import TraceTree, { formatDate, formatQty } from './TraceTree'

const RANGE_PRESETS = [30, 90, 180]
const DEFAULT_RANGE_DAYS = 90

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}

function sameRoot(a: TraceRoot | null, b: TraceRoot): boolean {
  if (!a || a.type !== b.type) return false
  return a.type === 'lot' ? a.lotKey === (b as any).lotKey : a.orderNo === (b as any).orderNo
}

// ─── Root header (what is being traced) ──────────────────────────────────────
function RootHeader({ root, graph, onClear }: { root: TraceRoot; graph: TraceGraph; onClear: () => void }) {
  if (root.type === 'order') {
    const order = graph.orders.get(root.orderNo)
    return (
      <div className="flex items-start justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
            <Factory className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700/80 dark:text-amber-400/80">Titik fokus</span>
            <h2 className="text-lg font-extrabold text-amber-900 dark:text-amber-200">Order Produksi {root.orderNo}</h2>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
              {order?.inputs.size ?? 0} bahan dikonsumsi · {order?.outputs.size ?? 0} hasil produksi
              {order?.firstDate ? ` · ${formatDate(order.firstDate)}${order.lastDate && order.lastDate !== order.firstDate ? ` – ${formatDate(order.lastDate)}` : ''}` : ''}
            </p>
          </div>
        </div>
        <button onClick={onClear} className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40" title="Tutup">
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const lot = graph.lots.get(root.lotKey)
  const net = (lot?.totalIn ?? 0) - (lot?.totalOut ?? 0)
  return (
    <div className="flex items-start justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-500/25 shrink-0">
          <Boxes className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-700/80 dark:text-violet-400/80">Titik fokus</span>
          <h2 className="text-lg font-extrabold text-violet-950 dark:text-violet-100 truncate">
            {lot?.materialName || normalizeCode(lot?.material)}
            <span className="ml-2 font-mono text-sm text-violet-700 dark:text-violet-300">
              {lot?.batch ? `Batch ${lot.batch}` : 'Tanpa batch'}
            </span>
          </h2>
          <p className="text-xs text-violet-800/80 dark:text-violet-300/80 font-mono">
            {normalizeCode(lot?.material)} · Masuk {formatQty(lot?.totalIn)} · Keluar {formatQty(lot?.totalOut)} · Saldo periode {net < 0 ? '-' : ''}{formatQty(net)} {lot?.satuan}
          </p>
        </div>
      </div>
      <button onClick={onClear} className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/40 shrink-0" title="Tutup">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

// ─── Flat summary of the tree ends ───────────────────────────────────────────
function SummaryTable({
  rows,
  graph,
  direction,
  onFocus,
}: {
  rows: TraceSummaryRow[]
  graph: TraceGraph
  direction: 'backward' | 'forward'
  onFocus: (root: TraceRoot) => void
}) {
  if (rows.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-[11px]">
        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
          <tr>
            <th className="text-left font-bold px-2.5 py-1.5">Material / Batch</th>
            <th className="text-left font-bold px-2.5 py-1.5">{direction === 'backward' ? 'Vendor / Sumber' : 'Customer / Tujuan'}</th>
            <th className="text-left font-bold px-2.5 py-1.5">Referensi</th>
            <th className="text-right font-bold px-2.5 py-1.5">Qty</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((r, i) => {
            const lot = graph.lots.get(r.lotKey)
            return (
              <tr key={`${r.lotKey}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="px-2.5 py-1.5">
                  <button
                    type="button"
                    onClick={() => onFocus({ type: 'lot', lotKey: r.lotKey })}
                    className="text-left hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="Jadikan titik fokus"
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{lot?.materialName || normalizeCode(lot?.material)}</span>
                    <span className="block font-mono text-[10px] text-violet-600 dark:text-violet-400">{lot?.batch || 'tanpa batch'}</span>
                  </button>
                </td>
                <td className="px-2.5 py-1.5 font-semibold text-slate-700 dark:text-slate-300">{r.flow?.label}</td>
                <td className="px-2.5 py-1.5 font-mono text-slate-500 dark:text-slate-400">
                  {r.flow?.ref || '-'}
                  {r.orderNos.length > 0 && (
                    <span className="block text-[10px] text-amber-600 dark:text-amber-400">via Order {r.orderNos.join(' › ')}</span>
                  )}
                </td>
                <td className="px-2.5 py-1.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200 num-tabular whitespace-nowrap">
                  {formatQty(r.flow?.qty)} {r.flow?.satuan}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function TracePanel({
  title,
  subtitle,
  icon,
  tone,
  tree,
  graph,
  direction,
  onFocus,
}: {
  title: string
  subtitle: string
  icon: React.ReactNode
  tone: 'teal' | 'sky'
  tree: TraceNode
  graph: TraceGraph
  direction: 'backward' | 'forward'
  onFocus: (root: TraceRoot) => void
}) {
  const summary = useMemo(() => summarizeTree(tree), [tree])
  const headerTone =
    tone === 'teal'
      ? 'from-teal-50 to-emerald-50/50 dark:from-teal-950/30 dark:to-emerald-950/10 text-teal-900 dark:text-teal-200'
      : 'from-sky-50 to-indigo-50/50 dark:from-sky-950/30 dark:to-indigo-950/10 text-sky-900 dark:text-sky-200'

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-w-0">
      <div className={`px-4 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r ${headerTone}`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-extrabold">{title}</h3>
        </div>
        <p className="text-[11px] opacity-75 mt-0.5">{subtitle}</p>
      </div>
      <div className="p-4 sm:p-5 space-y-4">
        {summary.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Ringkasan {direction === 'backward' ? 'asal bahan' : 'tujuan akhir'} ({summary.length})
            </span>
            <SummaryTable rows={summary} graph={graph} direction={direction} onFocus={onFocus} />
          </div>
        )}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pohon penelusuran</span>
          <TraceTree tree={tree} graph={graph} onFocus={onFocus} />
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function TraceabilityPage() {
  const { isAuthenticated, userName, loading, csrfToken, logout, refreshToken } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  const [plant, setPlant] = useState('IN01')
  const [plantOptions, setPlantOptions] = useState<{ value: string; label: string }[]>(PLANT_OPTIONS)
  const [start, setStart] = useState(isoDaysAgo(DEFAULT_RANGE_DAYS))
  const [end, setEnd] = useState(isoDaysAgo(0))

  const [rows, setRows] = useState<MutasiData[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [root, setRoot] = useState<TraceRoot | null>(null)

  const graph = useMemo(() => buildTraceGraph(rows), [rows])
  const candidates: TraceCandidate[] = useMemo(
    () => (submittedQuery ? searchTrace(graph, submittedQuery) : []),
    [graph, submittedQuery]
  )
  const backwardTree = useMemo(() => (root ? buildTraceTree(graph, root, 'backward') : null), [graph, root])
  const forwardTree = useMemo(() => (root ? buildTraceTree(graph, root, 'forward') : null), [graph, root])

  // Deep link: /traceability?q=BATCH&plant=IN01
  useEffect(() => {
    setIsClient(true)
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    const p = params.get('plant')
    if (p) setPlant(p)
    if (q) {
      setQuery(q)
      setSubmittedQuery(q)
    }
  }, [])

  useEffect(() => {
    if (isClient && !loading && !isAuthenticated) router.replace('/')
  }, [isClient, loading, isAuthenticated, router])

  useEffect(() => {
    fetch('/api/plants')
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && Array.isArray(json?.data) && json.data.length > 0) setPlantOptions(json.data)
      })
      .catch((err) => console.error('Gagal mengambil daftar plant:', err))
  }, [])

  const loadData = useCallback(async () => {
    if (!csrfToken) return
    setIsFetching(true)
    setFetchError(null)
    try {
      const { rows: loaded, error, didLogout } = await loadMutasiWithPartners({
        plant,
        start,
        end,
        csrfToken,
        refreshToken,
        logout,
        onLogout: () => router.replace('/'),
      })
      if (didLogout) return
      if (error) {
        setFetchError(error)
        return
      }
      setRows(loaded)
      setLoadedKey(`${plant}|${start}|${end}`)
    } catch (err: any) {
      setFetchError(err?.message || 'Gagal mengambil data mutasi dari SAP')
    } finally {
      setIsFetching(false)
    }
  }, [csrfToken, plant, start, end, refreshToken, logout, router])

  // Initial load only — later reloads are explicit (button) because a long range is a heavy SAP query
  useEffect(() => {
    if (isClient && isAuthenticated && csrfToken && loadedKey === null && !isFetching) loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient, isAuthenticated, csrfToken])

  // Auto-pick when the search resolves to exactly one starting point
  useEffect(() => {
    if (candidates.length === 1 && !sameRoot(root, candidates[0].root)) setRoot(candidates[0].root)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidates])

  const focus = (next: TraceRoot) => {
    setRoot(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    setRoot(null)
    setSubmittedQuery(query.trim())
  }

  const applyPreset = (days: number) => {
    setStart(isoDaysAgo(days))
    setEnd(isoDaysAgo(0))
  }

  const isStale = loadedKey !== null && loadedKey !== `${plant}|${start}|${end}`
  const isPageLoading = !isClient || loading

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
            <div className="max-w-full space-y-5">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 shadow-lg shadow-indigo-500/25">
                    <GitBranch className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Traceability Batch
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                      Telusuri asal-usul bahan (hulu) dan penggunaan / distribusi produk (hilir) dalam satu layar
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {isFetching ? (
                    <span className="inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memuat data SAP...</span>
                  ) : (
                    <>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{rows.length.toLocaleString('id-ID')}</span> mutasi ·{' '}
                      <span className="font-bold text-slate-700 dark:text-slate-200">{graph.lots.size.toLocaleString('id-ID')}</span> lot ·{' '}
                      <span className="font-bold text-slate-700 dark:text-slate-200">{graph.orders.size.toLocaleString('id-ID')}</span> order produksi
                    </>
                  )}
                </div>
              </div>

              {/* Data range + search */}
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[180px_160px_160px_auto_auto] gap-3 items-end">
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Plant
                    <select
                      value={plant}
                      onChange={(e) => setPlant(e.target.value)}
                      className="h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-sm font-medium"
                    >
                      {plantOptions.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dari tanggal posting
                    <input type="date" value={start} max={end} onChange={(e) => setStart(e.target.value)}
                      className="h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-sm" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Sampai
                    <input type="date" value={end} min={start} onChange={(e) => setEnd(e.target.value)}
                      className="h-10 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 text-sm" />
                  </label>
                  <div className="flex gap-1.5">
                    {RANGE_PRESETS.map((d) => (
                      <button key={d} type="button" onClick={() => applyPreset(d)}
                        className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                        {d} hari
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={loadData}
                    disabled={isFetching}
                    className={`h-10 px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 ${
                      isStale ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                    {isStale ? 'Muat ulang (filter berubah)' : 'Muat data'}
                  </button>
                </div>

                <form onSubmit={submitSearch} className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Nomor batch, order produksi, PO, SO, dokumen material, nama vendor/customer, atau material…"
                      className="w-full h-12 pl-10 pr-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <button type="submit" className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20">
                    <GitBranch className="w-4 h-4" /> Telusuri
                  </button>
                </form>
                <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
                  Penelusuran memakai mutasi (MB51) pada rentang tanggal di atas, termasuk bahan pendukung. Jika asal bahan tidak ketemu, perluas rentang tanggal lalu muat ulang.
                </p>
              </div>

              {fetchError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-sm font-semibold">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{fetchError}</span>
                  </div>
                  <button onClick={loadData} className="text-xs font-bold text-rose-600 underline ml-4 shrink-0">Coba lagi</button>
                </div>
              )}

              {/* Candidates */}
              {submittedQuery && !root && !isFetching && (
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  {candidates.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Tidak ada batch / order / dokumen yang cocok dengan <strong>“{submittedQuery}”</strong> pada data yang dimuat.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-slate-500 mb-3">
                        {candidates.length} hasil untuk “{submittedQuery}” — pilih titik awal penelusuran:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                        {candidates.map((c, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => focus(c.root)}
                            className="text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
                          >
                            <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-white">
                              {c.root.type === 'order' ? <Factory className="w-3.5 h-3.5 text-amber-500" /> : <Boxes className="w-3.5 h-3.5 text-violet-500" />}
                              <span className="truncate">{c.title}</span>
                            </span>
                            <span className="block font-mono text-[11px] text-slate-500 mt-0.5">{c.subtitle}</span>
                            <span className="block text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1">Cocok: {c.reason}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Result */}
              {root && backwardTree && forwardTree && (
                <div className="space-y-4">
                  <RootHeader root={root} graph={graph} onClear={() => setRoot(null)} />
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
                    <TracePanel
                      title="Hulu — Asal-usul"
                      subtitle="Bahan baku & bahan pendukung yang membentuk lot ini, sampai ke vendor / supplier"
                      icon={<ArrowUpCircle className="w-4 h-4" />}
                      tone="teal"
                      tree={backwardTree}
                      graph={graph}
                      direction="backward"
                      onFocus={focus}
                    />
                    <TracePanel
                      title="Hilir — Penggunaan & Distribusi"
                      subtitle="Order produksi yang memakai lot ini, produk yang dihasilkan, sampai ke customer / buyer"
                      icon={<ArrowDownCircle className="w-4 h-4" />}
                      tone="sky"
                      tree={forwardTree}
                      graph={graph}
                      direction="forward"
                      onFocus={focus}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 px-1">
                    <span className="inline-flex items-center gap-1"><Boxes className="w-3.5 h-3.5 text-violet-500" /> Lot (material + batch)</span>
                    <span className="inline-flex items-center gap-1"><Factory className="w-3.5 h-3.5 text-amber-500" /> Order produksi</span>
                    <span className="inline-flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-teal-500" /> Vendor / supplier</span>
                    <span className="inline-flex items-center gap-1"><Store className="w-3.5 h-3.5 text-sky-500" /> Customer / buyer</span>
                    <span>Klik ikon ⌖ pada lot / order untuk menjadikannya titik fokus.</span>
                  </div>
                </div>
              )}

              {!submittedQuery && !root && !isFetching && rows.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 py-12 px-4 text-center">
                  <GitBranch className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Mulai dengan mengetik nomor batch, order produksi, PO, atau SO</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Contoh: batch produk jadi untuk melihat bahan bakunya, atau batch CPO dari PO untuk melihat jadi produk apa dan dikirim ke customer mana.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
