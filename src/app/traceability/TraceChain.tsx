// src/app/traceability/TraceChain.tsx
//
// Step-by-step production chain: customer ← gudang ← tahap produksi ← bahan ← vendor.
'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  Truck,
  Store,
  Factory,
  Boxes,
  ArrowRight,
  ArrowDown,
  Warehouse,
  AlertTriangle,
  Crosshair,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  Repeat,
  EyeOff,
  Sprout,
} from 'lucide-react'
import { normalizeCode } from '@/app/shared/utils/filterUtils'
import { TraceGraph, TraceRoot } from './traceEngine'
import { ChainResult, ChainStage, CustomsDoc, FlowStep, Place, Purchase, StageInput } from './chainEngine'
import { formatDate, formatQty } from './TraceTree'

// ─── Small pieces ─────────────────────────────────────────────────────────────

function Places({ places, empty = '-' }: { places: Place[]; empty?: string }) {
  if (!places.length) return <span className="text-slate-400">{empty}</span>
  return (
    <span className="flex flex-col gap-0.5">
      {places.map((p) => (
        <span key={`${p.plant}|${p.sloc}`} className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-200">
          <Warehouse className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="font-mono font-bold">{p.sloc}</span>
          {p.name && <span className="font-semibold">– {p.name}</span>}
        </span>
      ))}
    </span>
  )
}

function Customs({ docs }: { docs: CustomsDoc[] }) {
  if (!docs.length) return null
  return (
    <span className="flex flex-col gap-0.5">
      {docs.map((d, i) => (
        <span key={i} className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">
          <FileCheck2 className="w-3 h-3 shrink-0" />
          {d.jenis && <span className="font-bold">{d.jenis}</span>}
          {d.aju && <span>AJU {d.aju}</span>}
          {d.pendaftaran && <span>· Daftar {d.pendaftaran}</span>}
          {d.tanggal && <span>({formatDate(d.tanggal)})</span>}
        </span>
      ))}
    </span>
  )
}

const StageNav = createContext<(no: number) => void>(() => {})
const useGoToStage = () => useContext(StageNav)

function Estates({ estates }: { estates: Purchase['estates'] }) {
  if (!estates.length) return null
  return (
    <div className="text-[10px] text-lime-700 dark:text-lime-400 flex flex-wrap items-center gap-1">
      <Sprout className="w-3 h-3 shrink-0" />
      <span className="font-semibold">Kebun/PKS asal:</span>
      {estates.map((e) => (
        <span key={e.kode || e.nama} className="px-1.5 py-px rounded bg-lime-50 dark:bg-lime-950/40">
          {e.nama || e.kode}
          {e.kode && e.nama ? <span className="font-mono opacity-70"> {e.kode}</span> : null}
          {e.kg ? <span className="font-mono"> · {formatQty(e.kg)} KG</span> : null}
        </span>
      ))}
    </div>
  )
}

// ─── At-a-glance flow strip ──────────────────────────────────────────────────

const STEP_STYLE: Record<FlowStep['kind'], { box: string; icon: React.ReactNode; tag: string }> = {
  vendor: {
    box: 'border-teal-300 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200',
    icon: <Truck className="w-4 h-4 text-teal-600 dark:text-teal-400" />,
    tag: 'Supplier',
  },
  lot: {
    box: 'border-violet-300 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/40 text-violet-950 dark:text-violet-100',
    icon: <Boxes className="w-4 h-4 text-violet-600 dark:text-violet-400" />,
    tag: 'Material',
  },
  stage: {
    box: 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200',
    icon: <Factory className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
    tag: 'Produksi',
  },
  customer: {
    box: 'border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200',
    icon: <Store className="w-4 h-4 text-sky-600 dark:text-sky-400" />,
    tag: 'Customer',
  },
}

function FlowStrip({ steps }: { steps: FlowStep[] }) {
  const scrollToStage = useGoToStage()
  if (steps.length === 0) return null
  return (
    <div className="flex flex-col lg:flex-row lg:flex-wrap items-stretch lg:items-center gap-1.5">
      {steps.map((s, i) => {
        const st = STEP_STYLE[s.kind]
        const clickable = s.kind === 'stage' && s.stageNo
        return (
          <div key={i} className="flex flex-col lg:flex-row items-center gap-1.5">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && scrollToStage(s.stageNo!)}
              className={`w-full lg:w-auto min-w-[150px] max-w-full lg:max-w-[220px] text-left rounded-xl border px-3 py-2 ${st.box} ${clickable ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}`}
            >
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-70">
                {st.icon} {st.tag}
              </span>
              <span className="block text-xs font-extrabold truncate" title={s.title}>{s.title}</span>
              <span className="block font-mono text-[10px] opacity-80 truncate" title={s.detail}>{s.detail}</span>
            </button>
            {i < steps.length - 1 && (
              <>
                <ArrowRight className="hidden lg:block w-4 h-4 text-slate-400 shrink-0" />
                <ArrowDown className="lg:hidden w-4 h-4 text-slate-400 shrink-0" />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Source of an input material ─────────────────────────────────────────────

function PurchaseLine({ p }: { p: Purchase }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
        <span className="font-bold text-teal-800 dark:text-teal-300">{p.vendor}</span>
      </div>
      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-x-2">
        {p.po && <span className="font-mono">PO {p.po}</span>}
        {p.date && <span>Diterima {formatDate(p.date)}</span>}
        <span className="font-mono">{formatQty(p.qty)} {p.satuan}</span>
        {p.transport.length > 0 && <span>via {p.transport.join(', ')}</span>}
      </div>
      <Estates estates={p.estates} />
      {p.to.length > 0 && (
        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-start gap-1">
          <span className="shrink-0">Masuk ke:</span>
          <Places places={p.to} />
        </div>
      )}
      <Customs docs={p.customs} />
    </div>
  )
}

function SourceCell({ input }: { input: StageInput }) {
  const scrollToStage = useGoToStage()
  return (
    <div className="space-y-1.5">
      {input.convertedFrom.length > 0 && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
          <Repeat className="w-3 h-3" /> Hasil transfer / konversi batch lain
        </span>
      )}
      {input.sources.map((src, i) => {
        if (src.kind === 'produced') {
          return (
            <div key={i} className="flex flex-wrap items-center gap-1">
              <Factory className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="font-semibold text-amber-800 dark:text-amber-300">Diproduksi di</span>
              {src.stageNos.length > 0
                ? src.stageNos.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => scrollToStage(n)}
                      className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 font-bold text-[10px] hover:bg-amber-200"
                    >
                      Tahap {n} ↓
                    </button>
                  ))
                : <span className="font-mono text-[10px]">Order {src.orderNos.join(', ')}</span>}
            </div>
          )
        }
        if (src.kind === 'purchased') {
          return (
            <div key={i} className="space-y-1.5">
              {src.purchases.map((p, j) => <PurchaseLine key={j} p={p} />)}
            </div>
          )
        }
        if (src.kind === 'opening') {
          return (
            <span key={i} className="text-slate-600 dark:text-slate-300 font-semibold">
              Saldo awal / inisialisasi stok{src.date ? ` (${formatDate(src.date)})` : ''}
            </span>
          )
        }
        return (
          <span key={i} className="inline-flex items-start gap-1 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
            Asal tidak ditemukan pada rentang tanggal — perluas rentang lalu muat ulang
          </span>
        )
      })}
    </div>
  )
}

// ─── Inputs table (grouped by material) ──────────────────────────────────────

function InputRows({ inputs, onFocus }: { inputs: StageInput[]; onFocus: (r: TraceRoot) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, StageInput[]>()
    inputs.forEach((i) => {
      const k = normalizeCode(i.material)
      map.set(k, [...(map.get(k) ?? []), i])
    })
    return Array.from(map.values())
  }, [inputs])

  return (
    <>
      {groups.map((group) => (
        <InputGroup key={group[0].material} group={group} onFocus={onFocus} />
      ))}
    </>
  )
}

function InputGroup({ group, onFocus }: { group: StageInput[]; onFocus: (r: TraceRoot) => void }) {
  const [open, setOpen] = useState(group.length <= 3)
  const first = group[0]
  const total = group.reduce((s, i) => s + i.qty, 0)

  const row = (i: StageInput, nested: boolean) => (
    <tr key={i.lotKey} className="align-top hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
      <td className={`px-3 py-2 ${nested ? 'pl-8' : ''}`}>
        {!nested && (
          <>
            <span className="block font-bold text-slate-900 dark:text-white">{i.materialName}</span>
            <span className="block font-mono text-[10px] text-slate-400">{normalizeCode(i.material)}</span>
            {i.materialType && (
              <span className="inline-block mt-0.5 px-1.5 py-px rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                {i.materialType}
              </span>
            )}
          </>
        )}
      </td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center gap-1">
          {i.batch ? (
            <span className="font-mono font-bold text-violet-700 dark:text-violet-300">{i.batch}</span>
          ) : (
            <span className="italic text-slate-400">tanpa batch</span>
          )}
          <button
            type="button"
            onClick={() => onFocus({ type: 'lot', lotKey: i.lotKey })}
            title="Telusuri batch ini"
            className="p-0.5 rounded text-slate-400 hover:text-indigo-600"
          >
            <Crosshair className="w-3 h-3" />
          </button>
        </span>
      </td>
      <td className="px-3 py-2 text-right font-mono font-bold whitespace-nowrap num-tabular">{formatQty(i.qty)} {i.satuan}</td>
      <td className="px-3 py-2">
        <Places places={i.takenFrom} />
        {i.costCenters && (
          <span className="block mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            Dikeluarkan ke cost center <span className="font-mono font-bold">{i.costCenters.join(', ')}</span> (GI 201)
          </span>
        )}
      </td>
      <td className="px-3 py-2"><SourceCell input={i} /></td>
    </tr>
  )

  if (group.length === 1) return row(first, false)

  return (
    <>
      <tr className="bg-slate-50/80 dark:bg-slate-800/40">
        <td className="px-3 py-2" colSpan={2}>
          <button type="button" onClick={() => setOpen((o) => !o)} className="flex items-start gap-1 text-left">
            {open ? <ChevronDown className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
            <span>
              <span className="block font-bold text-slate-900 dark:text-white">{first.materialName}</span>
              <span className="block font-mono text-[10px] text-slate-400">
                {normalizeCode(first.material)} · {group.length} batch {open ? '' : '— klik untuk melihat'}
              </span>
              {first.materialType && (
                <span className="inline-block mt-0.5 px-1.5 py-px rounded text-[9px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500">
                  {first.materialType}
                </span>
              )}
            </span>
          </button>
        </td>
        <td className="px-3 py-2 text-right font-mono font-extrabold whitespace-nowrap num-tabular">{formatQty(total)} {first.satuan}</td>
        <td className="px-3 py-2" colSpan={2}>
          {!open && (
            <Places places={group.reduce<Place[]>((acc, i) => {
              i.takenFrom.forEach((p) => !acc.some((a) => a.sloc === p.sloc) && acc.push(p))
              return acc
            }, [])} />
          )}
        </td>
      </tr>
      {open && group.map((i) => row(i, true))}
    </>
  )
}

function InputsTable({ title, tone, inputs, onFocus }: { title: string; tone: string; inputs: StageInput[]; onFocus: (r: TraceRoot) => void }) {
  if (inputs.length === 0) return null
  return (
    <div className="space-y-1.5">
      <span className={`text-[11px] font-extrabold uppercase tracking-wider ${tone}`}>{title}</span>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-[11px] min-w-[760px]">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-bold px-3 py-1.5 w-[24%]">Material</th>
              <th className="text-left font-bold px-3 py-1.5">Batch</th>
              <th className="text-right font-bold px-3 py-1.5">Qty dipakai</th>
              <th className="text-left font-bold px-3 py-1.5">Diambil dari gudang</th>
              <th className="text-left font-bold px-3 py-1.5 w-[34%]">Asal bahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            <InputRows inputs={inputs} onFocus={onFocus} />
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── One production stage ────────────────────────────────────────────────────

function StageCard({
  stage,
  graph,
  open,
  onToggle,
  onFocus,
}: {
  stage: ChainStage
  graph: TraceGraph
  open: boolean
  onToggle: () => void
  onFocus: (r: TraceRoot) => void
}) {
  const [showAllOutputs, setShowAllOutputs] = useState(false)
  const traced = stage.outputs.filter((o) => o.isTraced)
  const others = stage.outputs.filter((o) => !o.isTraced)
  const visibleOutputs = showAllOutputs || traced.length === 0 ? stage.outputs : traced
  const main = stage.inputs.filter((i) => i.role === 'utama')
  const support = stage.inputs.filter((i) => i.role === 'pendukung')
  const downstream = stage.producedFor
    .map((k) => graph.lots.get(k))
    .filter(Boolean)
    .map((l) => `${l!.materialName || normalizeCode(l!.material)}${l!.batch ? ` (batch ${l!.batch})` : ''}`)

  return (
    <section id={`trace-stage-${stage.no}`} className="scroll-mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <header className={`px-4 sm:px-5 py-3 bg-amber-50 dark:bg-amber-950/30 flex flex-wrap items-center justify-between gap-2 ${open ? 'border-b border-amber-200 dark:border-amber-900/50' : ''}`}>
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex items-center gap-3 min-w-0 text-left flex-1">
          {open ? <ChevronDown className="w-4 h-4 text-amber-700 shrink-0" /> : <ChevronRight className="w-4 h-4 text-amber-700 shrink-0" />}
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white font-black text-sm shrink-0">{stage.no}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200">
              Tahap {stage.no} · Order Produksi <span className="font-mono">{stage.orderNo}</span>
            </h3>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
              {formatDate(stage.firstDate)}
              {stage.lastDate && stage.lastDate !== stage.firstDate ? ` – ${formatDate(stage.lastDate)}` : ''}
              {downstream.length > 0 && ` · menghasilkan bahan untuk ${downstream.slice(0, 2).join(', ')}${downstream.length > 2 ? ` +${downstream.length - 2}` : ''}`}
            </p>
            {!open && (
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                <strong>Hasil:</strong> {(traced[0] ?? stage.outputs[0])?.materialName ?? '-'}
                {(traced[0] ?? stage.outputs[0])?.batch ? ` (batch ${(traced[0] ?? stage.outputs[0]).batch})` : ''}
                {' · '}<strong>Bahan baku:</strong> {Array.from(new Set(main.map((i) => i.materialName))).slice(0, 2).join(', ') || '-'}
                {' · '}{support.length} bahan pendukung
                {stage.excluded.length > 0 && ` · ${stage.excluded.length} bahan non-fasilitas`}
              </p>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onFocus({ type: 'order', orderNo: stage.orderNo })}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:underline"
        >
          <Crosshair className="w-3.5 h-3.5" /> Fokus ke order ini
        </button>
      </header>

      {open && (
      <div className="p-4 sm:p-5 space-y-4">
        {/* Outputs */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-violet-700 dark:text-violet-400">Hasil produksi</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {visibleOutputs.map((o) => (
              <div
                key={o.lotKey}
                className={`rounded-xl border px-3 py-2 text-[11px] ${o.isTraced ? 'border-violet-300 dark:border-violet-700 bg-violet-50/70 dark:bg-violet-950/30' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="block font-extrabold text-slate-900 dark:text-white truncate" title={o.materialName}>{o.materialName}</span>
                    <span className="font-mono font-bold text-violet-700 dark:text-violet-300">{o.batch ? `Batch ${o.batch}` : 'Tanpa batch'}</span>
                  </div>
                  <span className="font-mono font-bold whitespace-nowrap num-tabular">{formatQty(o.qty)} {o.satuan}</span>
                </div>
                <div className="mt-1 flex items-start gap-1 text-slate-500 dark:text-slate-400">
                  <span className="shrink-0">Disimpan di:</span>
                  <Places places={o.storedIn} />
                </div>
              </div>
            ))}
          </div>
          {traced.length > 0 && others.length > 0 && (
            <button type="button" onClick={() => setShowAllOutputs((s) => !s)} className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
              {showAllOutputs ? 'Sembunyikan hasil lain' : `Tampilkan ${others.length} hasil lain dari order ini`}
            </button>
          )}
        </div>

        <InputsTable title={`Bahan baku / bahan utama (${main.length})`} tone="text-emerald-700 dark:text-emerald-400" inputs={main} onFocus={onFocus} />
        <InputsTable title={`Bahan pendukung (${support.length})`} tone="text-slate-600 dark:text-slate-300" inputs={support} onFocus={onFocus} />
        {stage.supportBasis && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 rounded-lg bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
            Di SAP, bahan pendukung proses {stage.supportBasis.process} dikeluarkan ke cost center{' '}
            <span className="font-mono font-bold">{stage.supportBasis.costCenters.join(', ')}</span> (movement 201), bukan ke order produksi.
            Yang ditampilkan adalah pemakaian cost center tersebut pada{' '}
            {stage.supportBasis.byOutputDates ? 'tanggal produksi batch yang ditelusuri' : 'periode order ini'}:{' '}
            <strong>{formatDate(stage.supportBasis.from)}{stage.supportBasis.to !== stage.supportBasis.from ? ` – ${formatDate(stage.supportBasis.to)}` : ''}</strong>.
            Jumlahnya adalah pemakaian proses pada periode itu, bukan khusus untuk batch ini.
          </p>
        )}
        {stage.inputs.length === 0 && (
          <p className="text-[11px] text-amber-700 dark:text-amber-400 inline-flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Tidak ada pemakaian bahan fasilitas tercatat untuk order ini pada rentang tanggal.
          </p>
        )}
        {support.length === 0 && stage.inputs.length > 0 && stage.excluded.length === 0 && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Tidak ada bahan pendukung tercatat untuk tahap ini, baik ke order produksi (261) maupun ke cost center proses (201), pada rentang tanggal.
          </p>
        )}
        {stage.excluded.length > 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-3 space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <EyeOff className="w-3.5 h-3.5" /> Bahan lain yang dipakai, belum terdaftar fasilitas ({stage.excluded.length})
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Bahan ini tercatat dipakai di tahap ini, tetapi tidak ditelusuri karena belum ditandai fasilitas di Setting › Material List.
              Tandai sebagai fasilitas bila bahan tersebut memang masuk dengan fasilitas kepabeanan.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {stage.excluded.map((e) => (
                <span key={e.material} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300">
                  <strong>{e.materialName}</strong>
                  <span className="font-mono text-slate-400"> {normalizeCode(e.material)}</span>
                  {e.materialType && <span className="text-slate-500"> · {e.materialType}</span>}
                  <span className="font-mono"> · {formatQty(e.qty)} {e.satuan}</span>
                  {e.costCenter && <span className="text-slate-500"> · cost center {e.costCenter}</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </section>
  )
}

// ─── Supplier summary (all purchases in the chain) ───────────────────────────

function SupplierSummary({ chain, graph }: { chain: ChainResult; graph: TraceGraph }) {
  const scrollToStage = useGoToStage()
  const rows = useMemo(() => {
    const out: { stageNo: number; input: StageInput; p: Purchase }[] = []
    const seen = new Set<string>()
    chain.stages.forEach((s) =>
      s.inputs.forEach((i) =>
        i.sources.forEach((src) => {
          if (src.kind !== 'purchased') return
          src.purchases.forEach((p) => {
            const k = `${i.lotKey}|${p.vendor}|${p.po}`
            if (seen.has(k)) return
            seen.add(k)
            out.push({ stageNo: s.no, input: i, p })
          })
        })
      )
    )
    return out.sort((a, b) => a.p.vendor.localeCompare(b.p.vendor) || a.input.materialName.localeCompare(b.input.materialName))
  }, [chain])

  if (rows.length === 0) return null
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <header className="px-4 sm:px-5 py-3 bg-teal-50 dark:bg-teal-950/30 border-b border-teal-200 dark:border-teal-900/50">
        <h3 className="text-sm font-extrabold text-teal-900 dark:text-teal-200 flex items-center gap-2">
          <Truck className="w-4 h-4" /> Ringkasan supplier / vendor asal bahan ({rows.length})
        </h3>
        <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80">Semua bahan pada alur ini yang dibeli dari vendor, beserta PO, dokumen pabean, dan gudang penerimaannya.</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] min-w-[860px]">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="text-left font-bold px-3 py-1.5">Vendor / Supplier · Kebun asal</th>
              <th className="text-left font-bold px-3 py-1.5">Material</th>
              <th className="text-left font-bold px-3 py-1.5">Batch</th>
              <th className="text-left font-bold px-3 py-1.5">PO · Tgl terima</th>
              <th className="text-right font-bold px-3 py-1.5">Qty diterima</th>
              <th className="text-left font-bold px-3 py-1.5">Gudang penerimaan</th>
              <th className="text-left font-bold px-3 py-1.5">Dokumen pabean</th>
              <th className="text-left font-bold px-3 py-1.5">Dipakai di</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map(({ stageNo, input, p }, idx) => (
              <tr key={idx} className="align-top">
                <td className="px-3 py-2">
                  <span className="font-bold text-teal-800 dark:text-teal-300">{p.vendor}</span>
                  {p.transport.length > 0 && <span className="block text-[10px] text-slate-400">via {p.transport.join(', ')}</span>}
                  <Estates estates={p.estates} />
                </td>
                <td className="px-3 py-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{input.materialName}</span>
                  <span className="block text-[10px] text-slate-400">{input.role === 'utama' ? 'Bahan baku' : 'Bahan pendukung'}{input.materialType ? ` · ${input.materialType}` : ''}</span>
                </td>
                <td className="px-3 py-2 font-mono font-bold text-violet-700 dark:text-violet-300">{graph.lots.get(input.lotKey)?.batch || '-'}</td>
                <td className="px-3 py-2 font-mono">{p.po ? `PO ${p.po}` : '-'}<span className="block font-sans text-slate-400">{formatDate(p.date)}</span></td>
                <td className="px-3 py-2 text-right font-mono font-bold whitespace-nowrap num-tabular">{formatQty(p.qty)} {p.satuan}</td>
                <td className="px-3 py-2"><Places places={p.to} /></td>
                <td className="px-3 py-2">{p.customs.length ? <Customs docs={p.customs} /> : <span className="text-slate-400">-</span>}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => scrollToStage(stageNo)} className="font-bold text-amber-700 dark:text-amber-400 hover:underline">Tahap {stageNo}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function TraceChain({
  chain,
  graph,
  onFocus,
}: {
  chain: ChainResult
  graph: TraceGraph
  onFocus: (root: TraceRoot) => void
}) {
  const [openStages, setOpenStages] = useState<Set<number>>(new Set())
  const toggleStage = (no: number) =>
    setOpenStages((prev) => {
      const next = new Set(prev)
      if (next.has(no)) next.delete(no)
      else next.add(no)
      return next
    })
  const goToStage = useCallback((no: number) => {
    setOpenStages((prev) => (prev.has(no) ? prev : new Set(prev).add(no)))
    setTimeout(() => document.getElementById(`trace-stage-${no}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }, [])
  const scrollToStage = goToStage
  const allOpen = chain.stages.length > 0 && chain.stages.every((s) => openStages.has(s.no))

  return (
    <StageNav.Provider value={goToStage}>
    <div className="space-y-4">
      {/* At a glance */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Alur bahan utama</h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Dari supplier sampai customer, mengikuti bahan baku utama. Klik kotak Produksi untuk melihat detail tahapnya.
          </p>
        </div>
        <FlowStrip steps={chain.mainFlow} />
      </div>

      {/* Deliveries */}
      {chain.deliveries.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <header className="px-4 sm:px-5 py-3 bg-sky-50 dark:bg-sky-950/30 border-b border-sky-200 dark:border-sky-900/50">
            <h3 className="text-sm font-extrabold text-sky-900 dark:text-sky-200 flex items-center gap-2">
              <Store className="w-4 h-4" /> Pengeluaran ke customer
            </h3>
            <p className="text-[11px] text-sky-800/80 dark:text-sky-300/80">Batch yang dikirim dan gudang tempat barang disimpan sebelum dikeluarkan.</p>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px] min-w-[860px]">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="text-left font-bold px-3 py-1.5">Customer</th>
                  <th className="text-left font-bold px-3 py-1.5">SO / PO · Tanggal</th>
                  <th className="text-left font-bold px-3 py-1.5">Produk · Batch</th>
                  <th className="text-right font-bold px-3 py-1.5">Qty keluar</th>
                  <th className="text-left font-bold px-3 py-1.5">Dikeluarkan dari gudang</th>
                  <th className="text-left font-bold px-3 py-1.5">Dokumen pabean</th>
                  <th className="text-left font-bold px-3 py-1.5">Dibuat di</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {chain.deliveries.map((d, i) => {
                  const lot = graph.lots.get(d.lotKey)
                  const stageNos = chain.stages.filter((s) => s.producedFor.includes(d.lotKey)).map((s) => s.no)
                  return (
                    <tr key={i} className="align-top">
                      <td className="px-3 py-2 font-bold text-sky-800 dark:text-sky-300">{d.customer}</td>
                      <td className="px-3 py-2 font-mono">
                        {d.so && <span className="block">SO {d.so}</span>}
                        {d.po && <span className="block">PO {d.po}</span>}
                        <span className="block font-sans text-slate-400">{formatDate(d.date)}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{lot?.materialName || normalizeCode(lot?.material)}</span>
                        <span className="flex items-center gap-1 font-mono font-bold text-violet-700 dark:text-violet-300">
                          {lot?.batch || 'tanpa batch'}
                          <button type="button" onClick={() => onFocus({ type: 'lot', lotKey: d.lotKey })} title="Telusuri batch ini" className="p-0.5 text-slate-400 hover:text-indigo-600">
                            <Crosshair className="w-3 h-3" />
                          </button>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold whitespace-nowrap num-tabular">{formatQty(d.qty)} {d.satuan}</td>
                      <td className="px-3 py-2"><Places places={d.from} /></td>
                      <td className="px-3 py-2">{d.customs.length ? <Customs docs={d.customs} /> : <span className="text-slate-400">-</span>}</td>
                      <td className="px-3 py-2">
                        {stageNos.length ? (
                          stageNos.map((n) => (
                            <button key={n} type="button" onClick={() => scrollToStage(n)} className="mr-1 font-bold text-amber-700 dark:text-amber-400 hover:underline">
                              Tahap {n}
                            </button>
                          ))
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">Order produksi tidak ditemukan</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lot position (when starting from a batch) */}
      {chain.deliveries.length === 0 && chain.startLots.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 text-[11px] flex flex-wrap items-start gap-x-6 gap-y-2">
          {chain.startLots.map((k) => (
            <div key={k} className="flex items-start gap-2">
              <span className="text-slate-500 shrink-0">Batch ini pernah disimpan di:</span>
              <Places places={chain.startPlaces.get(k) ?? []} />
            </div>
          ))}
        </div>
      )}

      {/* Stages */}
      {chain.stages.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-amber-300 dark:border-amber-800 p-5 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>
            Order produksi yang membuat batch ini tidak ada pada rentang tanggal yang dimuat. Perluas rentang tanggal (misalnya 180 hari) lalu muat ulang.
            Jika batch dibeli langsung dari vendor, asalnya terlihat di tab Pohon Hulu &amp; Hilir.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200">
              {chain.stages.length} tahap produksi <span className="font-semibold text-slate-400">· klik judul tahap untuk melihat detail</span>
            </span>
            <button
              type="button"
              onClick={() => setOpenStages(allOpen ? new Set() : new Set(chain.stages.map((s) => s.no)))}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {allOpen ? 'Tutup semua tahap' : 'Buka semua tahap'}
            </button>
          </div>
          {chain.stages.map((s) => (
            <StageCard key={s.no} stage={s} graph={graph} open={openStages.has(s.no)} onToggle={() => toggleStage(s.no)} onFocus={onFocus} />
          ))}
          {chain.truncated && (
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Alur dipotong pada {chain.stages.length} tahap. Klik ⌖ pada bahan untuk melanjutkan penelusuran dari titik itu.
            </p>
          )}
        </div>
      )}

      <SupplierSummary chain={chain} graph={graph} />
    </div>
    </StageNav.Provider>
  )
}
