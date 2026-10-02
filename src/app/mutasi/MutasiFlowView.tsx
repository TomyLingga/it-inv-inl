// src/app/mutasi/MutasiFlowView.tsx
'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Boxes,
  Factory,
  RotateCcw,
  Workflow,
  PackageSearch,
  Clock,
  User,
  FileText,
  ChevronDown,
  ListTree,
} from 'lucide-react'
import { MutasiData } from '@/app/shared/types'
import { buildBatchJourneys, isReversal, BatchJourney } from './mutasiUtils'
import { fadeInUp, staggerContainer, useReducedMotionSafe } from '@/app/shared/utils/motion'

interface MutasiFlowViewProps {
  data: MutasiData[]
  onSelect?: (row: MutasiData) => void
}

function formatDateDisplay(isoDate: string): string {
  if (!isoDate) return '-'
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatQty(n: number): string {
  return Math.abs(Number(n) || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}

// ─── Single step (one movement) in a journey ──────────────────────────────────
function JourneyStep({
  step,
  isLast,
  onSelect,
}: {
  step: MutasiData
  isLast: boolean
  onSelect?: (row: MutasiData) => void
}) {
  const isMasuk = step.shkzg === 'S' || step.arahMutasi === 'Masuk'
  const reversal = isReversal(step)

  return (
    <li className="relative pl-9">
      {/* Connector line */}
      {!isLast && (
        <span
          className={`absolute left-[13px] top-7 bottom-[-14px] w-px ${
            reversal ? 'border-l border-dashed border-rose-300 dark:border-rose-800' : 'bg-slate-200 dark:bg-slate-700'
          }`}
          aria-hidden
        />
      )}

      {/* Node icon */}
      <span
        className={`absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full border shadow-sm ${
          reversal
            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400'
            : isMasuk
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
            : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400'
        }`}
      >
        {reversal ? (
          <RotateCcw className="w-3.5 h-3.5" />
        ) : isMasuk ? (
          <ArrowDownLeft className="w-3.5 h-3.5" />
        ) : (
          <ArrowUpRight className="w-3.5 h-3.5" />
        )}
      </span>

      <button
        type="button"
        onClick={() => onSelect?.(step)}
        className={`w-full text-left rounded-xl border p-3 mb-3.5 transition-colors ${
          reversal
            ? 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20'
        } ${onSelect ? 'cursor-pointer' : ''}`}
      >
        {/* Row 1: date + movement type + reversal tag */}
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {formatDateDisplay(step.postingDate)}
          </span>
          <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/40">
            {step.movementType || '—'}
          </span>
          {step.movementText && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]" title={step.movementText}>
              {step.movementText}
            </span>
          )}
          {reversal && (
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/50">
              <RotateCcw className="w-3 h-3" /> Pembatalan
            </span>
          )}
        </div>

        {/* Row 2: From → To */}
        <div className="flex items-center gap-1.5 text-xs mb-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
            {step.asalMutasi || '-'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="font-semibold text-indigo-700 dark:text-indigo-300 truncate max-w-[160px] bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/30">
            {step.tujuanMutasi || '-'}
          </span>
        </div>

        {/* Row 3: qty + value + refs */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
          <span className={`font-mono font-bold num-tabular ${reversal ? 'text-rose-500 line-through' : isMasuk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {isMasuk ? '+' : '-'}{formatQty(step.jumlah)} {step.satuan}
          </span>
          <span className="font-mono text-slate-600 dark:text-slate-400 num-tabular">
            Rp {(Number(step.nilaiMutasi) || 0).toLocaleString('id-ID')}
          </span>
          {step.nomorDokMaterial && (
            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <FileText className="w-3 h-3" />
              <span className="font-mono">{step.nomorDokMaterial}/{step.itemDokumen}</span>
            </span>
          )}
          {(step.nomorPo || step.orderNo) && (
            <span className="font-mono text-amber-700 dark:text-amber-400">
              {step.orderNo ? `Ord: ${step.orderNo}` : `PO: ${step.nomorPo}`}
            </span>
          )}
          {step.namaMitra && (
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]" title={step.namaMitra}>
              {step.peranMitra === 'Customer' ? 'Customer' : 'Vendor'}: {step.namaMitra}
            </span>
          )}
          {step.userSap && (
            <span className="inline-flex items-center gap-1 text-slate-400">
              <User className="w-3 h-3" /> {step.userSap}
              {step.entryTime && (
                <span className="inline-flex items-center gap-0.5"><Clock className="w-3 h-3" /> {step.entryTime}</span>
              )}
            </span>
          )}
          {(step.itemText || step.headerText) && (
            <span className="text-slate-500 dark:text-slate-400 truncate max-w-[240px]" title={step.itemText || step.headerText}>
              “{step.itemText || step.headerText}”
            </span>
          )}
        </div>
      </button>
    </li>
  )
}

// ─── One journey card (a material + batch) ────────────────────────────────────
function JourneyCard({
  journey,
  onSelect,
  reduce,
  open,
  onToggle,
}: {
  journey: BatchJourney
  onSelect?: (row: MutasiData) => void
  reduce: boolean
  open: boolean
  onToggle: () => void
}) {
  const netPositive = journey.netQty >= 0

  return (
    <motion.div
      variants={reduce ? undefined : fadeInUp}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden self-start"
    >
      {/* Card header — clickable to expand/collapse the movement log */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full text-left px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-indigo-50/40 dark:from-slate-800/60 dark:to-indigo-950/20 hover:from-slate-100 hover:to-indigo-50/60 dark:hover:from-slate-800 transition-colors cursor-pointer"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Boxes className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate max-w-[280px]" title={journey.materialName}>
                {journey.materialName || 'Material tanpa nama'}
              </span>
              {journey.batch ? (
                <span className="font-mono text-[10px] font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded border border-violet-200 dark:border-violet-900/40">
                  Batch {journey.batch}
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 italic">
                  Tanpa Batch
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span>{journey.material || '-'}</span>
              {journey.plant && <span>· Plant {journey.plant}</span>}
              <span>· {journey.steps.length} langkah</span>
            </div>
          </div>

          <div className="flex items-start gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Net Qty</span>
              <span className={`text-base font-black font-mono num-tabular ${netPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {netPositive ? '+' : '-'}{formatQty(journey.netQty)} {journey.satuan}
              </span>
              <span className="block text-[10px] text-slate-400 num-tabular">
                +{formatQty(journey.totalMasuk)} / -{formatQty(journey.totalKeluar)}
              </span>
            </div>
            <span className={`mt-1 flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
              <ChevronDown className="w-4 h-4" />
            </span>
          </div>
        </div>

        {/* Chain of stages (PO → S.Loc → Produksi → …) */}
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <Workflow className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          {journey.stages.map((stage, i) => (
            <div key={stage} className="flex items-center gap-1.5">
              {i > 0 && <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />}
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                {stage}
              </span>
            </div>
          ))}
          {!open && (
            <span className="ml-auto text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              Lihat {journey.steps.length} langkah ▾
            </span>
          )}
        </div>
      </button>

      {/* Steps timeline — collapsed by default */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="steps"
            initial={reduce ? undefined : { height: 0, opacity: 0 }}
            animate={reduce ? undefined : { height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-5">
              <ol className="relative">
                {journey.steps.map((step, i) => (
                  <JourneyStep
                    key={`${step.nomorDokMaterial}-${step.itemDokumen}-${i}`}
                    step={step}
                    isLast={i === journey.steps.length - 1}
                    onSelect={onSelect}
                  />
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Main flow view ───────────────────────────────────────────────────────────
export default function MutasiFlowView({ data, onSelect }: MutasiFlowViewProps) {
  const reduce = useReducedMotionSafe()
  const journeys = useMemo(() => buildBatchJourneys(data), [data])
  const [openKeys, setOpenKeys] = useState<Record<string, boolean>>({})

  const allOpen = journeys.length > 0 && journeys.every((j) => openKeys[j.key])

  const toggleOne = (key: string) =>
    setOpenKeys((prev) => ({ ...prev, [key]: !prev[key] }))

  const setAll = (open: boolean) => {
    if (!open) {
      setOpenKeys({})
      return
    }
    const next: Record<string, boolean> = {}
    journeys.forEach((j) => {
      next[j.key] = true
    })
    setOpenKeys(next)
  }

  if (journeys.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 py-16 px-4 text-center flex flex-col items-center">
        <PackageSearch className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3 stroke-[1.5]" />
        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
          Tidak ada alur mutasi pada periode ini
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-sm">
          Coba ubah filter tanggal, plant, atau material untuk menelusuri pergerakan batch.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 px-1 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Factory className="w-3.5 h-3.5 text-indigo-500" />
          <span>
            <span className="font-bold text-slate-700 dark:text-slate-200">{journeys.length}</span> alur batch/material —
            diurutkan dari aktivitas terbaru. Klik kartu untuk buka/tutup log langkahnya.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAll(!allOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-900/50 transition-colors shrink-0"
        >
          <ListTree className="w-3.5 h-3.5" />
          {allOpen ? 'Tutup semua' : 'Buka semua'}
        </button>
      </div>

      <motion.div
        variants={reduce ? undefined : staggerContainer}
        initial={reduce ? undefined : 'hidden'}
        animate={reduce ? undefined : 'visible'}
        className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start"
      >
        {journeys.map((journey) => (
          <JourneyCard
            key={journey.key}
            journey={journey}
            onSelect={onSelect}
            reduce={reduce}
            open={Boolean(openKeys[journey.key])}
            onToggle={() => toggleOne(journey.key)}
          />
        ))}
      </motion.div>
    </div>
  )
}
