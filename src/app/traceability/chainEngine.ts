// src/app/traceability/chainEngine.ts
//
// "Alur produksi" view: answers, step by step from the delivered product back to
// the supplier,
//   SO → dikirim dari gudang mana → batch produk dibuat di order produksi mana
//      → bahan baku (batch, diambil dari gudang mana) + bahan pendukung
//      → bahan baku itu dibuat di order mana / dibeli dari vendor mana (PO, BC)
//      → … sampai bahan dibeli dari vendor.
//
// It reuses the lot/order graph from traceEngine and only reshapes it into
// numbered stages (one per production order) that read top-down.

import { MutasiData } from '@/app/shared/types'
import { normalizeCode } from '@/app/shared/utils/filterUtils'
import { slocText, partnerText } from '@/app/mutasi/mutasiData'
import { TraceGraph, TraceCandidate, lotKeyOf } from './traceEngine'

const CUSTOMER_ISSUE = new Set(['601', '641', '643', '647', '653'])
const CUSTOMER_REVERSAL = new Set(['602', '642', '644', '648', '654'])
const SUPPLIER_RECEIPT = new Set(['101', '103', '105', '501', '511'])
const SUPPLIER_REVERSAL = new Set(['102', '104', '106', '122', '502', '512'])
const OPENING_STOCK = new Set(['561'])
const ORDER_OUTPUT = new Set(['101', '531', '521'])

const MAX_STAGES = 60
// Stock transfers between storage locations (incl. INL custom Z23/Z24/Z25 remove-from / place-in storage)
const TRANSFER_IN = new Set(['301', '303', '305', '311', '313', '315', 'Z23', 'Z24', 'Z25'])

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Place {
  plant: string
  sloc: string
  name: string
  label: string // "3003 – OIP RBDPO"
}

export interface CustomsDoc {
  jenis: string
  aju: string
  pendaftaran: string
  tanggal: string
}

export interface Delivery {
  lotKey: string
  customer: string
  so: string
  po: string
  date: string
  qty: number
  satuan: string
  from: Place[]
  docs: string[]
  customs: CustomsDoc[]
}

export interface Purchase {
  vendor: string
  po: string
  date: string
  qty: number
  satuan: string
  to: Place[]
  docs: string[]
  customs: CustomsDoc[]
  /** Kebun / PKS asal, summed over the receipts (empty while SAP does not fill ZZ*_KEBUN) */
  estates: { kode: string; nama: string; kg: number }[]
  /** Cara kirim from the GR header text (Trucking, GK, Pipa, …) */
  transport: string[]
}

export type InputSource =
  | { kind: 'produced'; stageNos: number[]; orderNos: string[] }
  | { kind: 'purchased'; purchases: Purchase[] }
  | { kind: 'opening'; date: string }
  | { kind: 'unknown' }

export interface StageInput {
  lotKey: string
  material: string
  materialName: string
  materialType: string
  batch: string
  qty: number
  satuan: string
  materialGroup: string
  role: 'utama' | 'pendukung'
  takenFrom: Place[]
  sources: InputSource[]
  convertedFrom: string[] // lot keys this lot was transferred/converted from
  /** Set when the material was issued to the process cost center (201), not to the order (261). */
  costCenters?: string[]
}

/** How supporting materials issued to cost centers were attached to a stage. */
export interface SupportBasis {
  process: string
  costCenters: string[]
  from: string
  to: string
  byOutputDates: boolean // true = dates the traced batches were produced; false = whole order period
}

export interface StageOutput {
  lotKey: string
  materialName: string
  batch: string
  qty: number
  satuan: string
  storedIn: Place[]
  isTraced: boolean // the lot that led the trace to this stage
}

export interface ChainStage {
  no: number
  orderNo: string
  firstDate: string
  lastDate: string
  producedFor: string[] // lot keys of the next stage (downstream) that asked for this one
  outputs: StageOutput[]
  inputs: StageInput[]
  /** Materials consumed by this order but not registered as facility materials (hidden from the trace). */
  excluded: ExcludedInput[]
  supportBasis: SupportBasis | null
}

export interface ExcludedInput {
  material: string
  materialName: string
  materialType: string
  qty: number
  satuan: string
  costCenter?: string
}

export interface ChainOptions {
  /** Movements of every material (before the facility filter) — used for cost-center supporting materials. */
  allRows?: MutasiData[]
  isFacility?: (material: string) => boolean
}

// ─── Process ↔ cost center rules ─────────────────────────────────────────────
//
// SAP INL issues supporting materials (bleaching earth, phosphoric acid,
// packaging) with movement 201 to a cost center instead of to the production
// order. The order number and the cost center both name the process, which is
// how a stage finds its supporting materials. Extend this list when a new
// process / order naming appears.
export const PROCESS_RULES: { process: string; orderPrefixes: string[]; costCenterPrefixes: string[] }[] = [
  { process: 'Refinery', orderPrefixes: ['RBDP', 'PFAD'], costCenterPrefixes: ['SMREF'] },
  { process: 'Fraksinasi', orderPrefixes: ['OLE', 'STEAR'], costCenterPrefixes: ['SMFRAC'] },
  { process: 'Packaging', orderPrefixes: ['MIKT', 'NSKT', 'SALV', 'INL'], costCenterPrefixes: ['SMPACK'] },
]

export function processOfOrder(orderNo: string) {
  const o = normalizeCode(orderNo).toUpperCase()
  return PROCESS_RULES.find((r) => r.orderPrefixes.some((p) => o.startsWith(p))) ?? null
}

const COST_CENTER_ISSUE = new Set(['201'])
// Cost centers also receive operational goods (brooms, bearings, lamps…); only production materials are listed
const PRODUCTION_MATERIAL_TYPE = /bahan|kemasan|pendukung|penolong|packag|raw|chemical|kimia/i
const COST_CENTER_REVERSAL = new Set(['202'])

/** One box in the at-a-glance strip (supplier → … → customer). */
export interface FlowStep {
  kind: 'vendor' | 'lot' | 'stage' | 'customer'
  title: string
  detail: string
  stageNo?: number
  lotKey?: string
}

export interface ChainResult {
  deliveries: Delivery[]
  startLots: string[]
  startPlaces: Map<string, Place[]> // where each start lot sits / was shipped from
  stages: ChainStage[]
  stageOfOrder: Map<string, number>
  mainFlow: FlowStep[]
  truncated: boolean
}

export type ChainRoot =
  | { type: 'delivery'; ref: string }
  | { type: 'lot'; lotKey: string }
  | { type: 'order'; orderNo: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const abs = (n: unknown) => Math.abs(Number(n) || 0)
const bwartOf = (r: MutasiData) => (r.movementType ?? '').toString().trim()
const minDate = (a: string, b: string) => (!a ? b : !b ? a : a < b ? a : b)

function placeOf(r: MutasiData): Place | null {
  const sloc = (r.storageLocation ?? '').toString().trim()
  if (!sloc) return null
  const name = (r.storageLocationName ?? '').toString().trim()
  return { plant: r.plant ?? '', sloc, name, label: slocText(sloc, name) }
}

function addPlace(list: Place[], p: Place | null) {
  if (p && !list.some((x) => x.sloc === p.sloc && x.plant === p.plant)) list.push(p)
}

function customsOf(r: MutasiData): CustomsDoc | null {
  if (!r.nomorAju && !r.nomorPendaftaran) return null
  return { jenis: r.jenisDokBC, aju: r.nomorAju, pendaftaran: r.nomorPendaftaran, tanggal: r.tglPendaftaran }
}

function addCustoms(list: CustomsDoc[], c: CustomsDoc | null) {
  if (c && !list.some((x) => x.aju === c.aju && x.pendaftaran === c.pendaftaran)) list.push(c)
}

export function isCustomerIssue(r: MutasiData): boolean {
  if (normalizeCode(r.orderNo)) return false
  const bwart = bwartOf(r)
  return CUSTOMER_ISSUE.has(bwart) || (r.peranMitra === 'Customer' && r.shkzg === 'H')
}

function customerName(r: MutasiData): string {
  if (r.peranMitra === 'Customer' && r.namaMitra) return partnerText(r.namaMitra, r.customer)
  return r.customer ? `Customer ${normalizeCode(r.customer)}` : 'Customer'
}

function vendorName(r: MutasiData): string {
  if (r.peranMitra === 'Vendor' && r.namaMitra) return partnerText(r.namaMitra, r.kodeVendor)
  return r.kodeVendor ? `Vendor ${normalizeCode(r.kodeVendor)}` : 'Vendor / Supplier'
}

/**
 * Consumption of non-facility materials per production order. These rows are
 * removed from the trace, but listing them tells the user why a supporting
 * material (chemicals, packaging, …) is missing from a stage.
 */
export function collectExcludedInputs(rows: MutasiData[], isFacility: (material: string) => boolean): Map<string, ExcludedInput[]> {
  const byOrder = new Map<string, Map<string, ExcludedInput>>()
  for (const r of rows) {
    const orderNo = normalizeCode(r.orderNo)
    if (!orderNo || isFacility(r.kodeBarang)) continue
    const bwart = bwartOf(r)
    const sign = bwart === '262' ? -1 : r.shkzg === 'H' && !ORDER_OUTPUT.has(bwart) ? 1 : 0
    if (!sign) continue
    const m = byOrder.get(orderNo) ?? new Map<string, ExcludedInput>()
    const k = normalizeCode(r.kodeBarang)
    const e = m.get(k) ?? { material: r.kodeBarang, materialName: r.namaBarang || k, materialType: r.tipeMaterial, qty: 0, satuan: r.satuan }
    e.qty += sign * abs(r.jumlah)
    m.set(k, e)
    byOrder.set(orderNo, m)
  }
  const out = new Map<string, ExcludedInput[]>()
  byOrder.forEach((m, o) => {
    const list = Array.from(m.values()).filter((e) => e.qty > 0.0000001).sort((a, b) => a.materialName.localeCompare(b.materialName))
    if (list.length) out.set(o, list)
  })
  return out
}

/**
 * Bahan baku vs bahan pendukung, decided per order:
 *  • inputs made in an earlier stage (olein for packaging, RBDPO for fractionation) are the main material;
 *  • otherwise (first stage, bought materials) the material with the largest quantity — plus inputs of the
 *    same material group, e.g. several CPO codes — is the main material.
 * Everything else (chemicals, bleaching earth, packaging, …) is bahan pendukung. SAP's material type is not
 * used because CPO and chemicals can share the same type.
 */
function classifyInputs(stage: ChainStage) {
  const inputs = stage.inputs
  if (!inputs.length) return
  const produced = inputs.filter((i) => !i.costCenters && i.sources.some((s) => s.kind === 'produced'))
  if (produced.length) {
    const mainCodes = new Set(produced.map((i) => normalizeCode(i.material)))
    inputs.forEach((i) => (i.role = !i.costCenters && mainCodes.has(normalizeCode(i.material)) ? 'utama' : 'pendukung'))
    return
  }
  const totals = new Map<string, { qty: number; input: StageInput }>()
  inputs.filter((i) => !i.costCenters).forEach((i) => {
    const k = normalizeCode(i.material)
    const t = totals.get(k) ?? { qty: 0, input: i }
    t.qty += i.qty
    totals.set(k, t)
  })
  const outUnit = (stage.outputs[0]?.satuan ?? '').toUpperCase()
  const ranked = Array.from(totals.values()).sort((a, b) => {
    const au = a.input.satuan.toUpperCase() === outUnit ? 1 : 0
    const bu = b.input.satuan.toUpperCase() === outUnit ? 1 : 0
    return bu - au || b.qty - a.qty
  })
  if (!ranked.length) return
  const main = ranked[0].input
  const mainCode = normalizeCode(main.material)
  inputs.forEach((i) => {
    if (i.costCenters) {
      i.role = 'pendukung'
      return
    }
    const sameMaterial = normalizeCode(i.material) === mainCode
    const sameGroup = Boolean(main.materialGroup) && i.materialGroup === main.materialGroup
    i.role = sameMaterial || sameGroup ? 'utama' : 'pendukung'
  })
}

// ─── Delivery lookup (SO / PO / dokumen material keluar) ─────────────────────

export function findDeliveryRows(g: TraceGraph, ref: string): MutasiData[] {
  const q = normalizeCode(ref)
  if (!q) return []
  const out: MutasiData[] = []
  g.lots.forEach((lot) => {
    lot.rows.forEach((r) => {
      if (!isCustomerIssue(r) && !CUSTOMER_REVERSAL.has(bwartOf(r))) return
      if (
        normalizeCode(r.nomorSO) === q ||
        normalizeCode(r.nomorPo) === q ||
        normalizeCode(r.nomorDokMaterial) === q ||
        normalizeCode(r.nomorAju) === q
      ) {
        out.push(r)
      }
    })
  })
  return out
}

/** SO / PO / dokumen keluar → one candidate per customer document. */
export function searchDeliveries(g: TraceGraph, query: string): TraceCandidate[] {
  const rows = findDeliveryRows(g, query)
  if (rows.length === 0) return []
  const customers = Array.from(new Set(rows.map(customerName)))
  const products = Array.from(new Set(rows.map((r) => r.namaBarang || normalizeCode(r.kodeBarang))))
  const batches = new Set(rows.map((r) => lotKeyOf(r.kodeBarang, r.batch))).size
  const first = rows[0]
  const q = normalizeCode(query)
  const refLabel =
    normalizeCode(first.nomorSO) === q ? `SO ${first.nomorSO}` :
    normalizeCode(first.nomorPo) === q ? `SO/PO ${first.nomorPo}` :
    normalizeCode(first.nomorAju) === q ? `AJU ${first.nomorAju}` :
    `Dokumen ${first.nomorDokMaterial}`
  return [
    {
      root: { type: 'delivery', ref: query.trim(), label: refLabel },
      title: `Pengeluaran ${refLabel} → ${customers[0]}${customers.length > 1 ? ` +${customers.length - 1}` : ''}`,
      subtitle: `${products.slice(0, 2).join(', ')}${products.length > 2 ? ` +${products.length - 2}` : ''} · ${batches} batch`,
      reason: 'Dokumen pengeluaran (SO / PO / dokumen material)',
    },
  ]
}

function buildDeliveries(rows: MutasiData[]): Delivery[] {
  const map = new Map<string, Delivery>()
  for (const r of rows) {
    const lotKey = lotKeyOf(r.kodeBarang, r.batch)
    const customer = customerName(r)
    const k = `${lotKey}|${customer}|${r.nomorSO}`
    const d =
      map.get(k) ??
      { lotKey, customer, so: r.nomorSO, po: r.nomorPo, date: '', qty: 0, satuan: r.satuan, from: [], docs: [], customs: [] }
    d.qty += (CUSTOMER_REVERSAL.has(bwartOf(r)) ? -1 : 1) * abs(r.jumlah)
    d.date = minDate(d.date, r.postingDate)
    addPlace(d.from, placeOf(r))
    addCustoms(d.customs, customsOf(r))
    if (r.nomorDokMaterial && !d.docs.includes(r.nomorDokMaterial)) d.docs.push(r.nomorDokMaterial)
    map.set(k, d)
  }
  return Array.from(map.values()).filter((d) => d.qty > 0.0000001)
}

// ─── Lot facts ────────────────────────────────────────────────────────────────

function purchasesOf(g: TraceGraph, lotKey: string): Purchase[] {
  const lot = g.lots.get(lotKey)
  if (!lot) return []
  const map = new Map<string, Purchase>()
  for (const r of lot.rows) {
    if (normalizeCode(r.orderNo)) continue
    const bwart = bwartOf(r)
    const isReceipt = SUPPLIER_RECEIPT.has(bwart) && r.shkzg === 'S'
    const isReversal = SUPPLIER_REVERSAL.has(bwart)
    if (!isReceipt && !isReversal) continue
    const vendor = vendorName(r)
    const k = `${vendor}|${r.nomorPo}`
    const p: Purchase =
      map.get(k) ??
      { vendor, po: r.nomorPo, date: '', qty: 0, satuan: r.satuan || lot.satuan, to: [], docs: [], customs: [], estates: [], transport: [] }
    p.qty += (isReceipt ? 1 : -1) * abs(r.jumlah)
    if (isReceipt) {
      p.date = minDate(p.date, r.postingDate)
      addPlace(p.to, placeOf(r))
      addCustoms(p.customs, customsOf(r))
      if (r.nomorDokMaterial && !p.docs.includes(r.nomorDokMaterial)) p.docs.push(r.nomorDokMaterial)
      ;(r.asalKebun ?? []).forEach((e) => {
        const key = e.kode || e.nama
        const found = p.estates.find((x) => (x.kode || x.nama) === key)
        if (found) found.kg += e.kg
        else p.estates.push({ ...e })
      })
      const mode = (r.headerText ?? '').replace(/\s*\(susut\)\s*/i, '').trim()
      if (mode && !p.transport.includes(mode)) p.transport.push(mode)
    }
    map.set(k, p)
  }
  return Array.from(map.values()).filter((p) => p.qty > 0.0000001)
}

function openingOf(g: TraceGraph, lotKey: string): string | null {
  const lot = g.lots.get(lotKey)
  const row = lot?.rows.find((r) => OPENING_STOCK.has(bwartOf(r)) && r.shkzg === 'S')
  return row ? row.postingDate || '' : null
}

/** Places a lot was stored in after being produced / received (receipts into a sloc). */
function storedPlaces(g: TraceGraph, lotKey: string, orderNo?: string): Place[] {
  const lot = g.lots.get(lotKey)
  const out: Place[] = []
  lot?.rows.forEach((r) => {
    if (r.shkzg !== 'S') return
    if (orderNo && normalizeCode(r.orderNo) === orderNo && ORDER_OUTPUT.has(bwartOf(r))) addPlace(out, placeOf(r))
  })
  // transfers into another sloc after production (311 S lines of the same lot)
  lot?.rows.forEach((r) => {
    if (r.shkzg === 'S' && !normalizeCode(r.orderNo) && TRANSFER_IN.has(bwartOf(r))) addPlace(out, placeOf(r))
  })
  return out
}

/** Every place a lot currently / last sat in (any receipt into a sloc). */
function anyPlaces(g: TraceGraph, lotKey: string): Place[] {
  const out: Place[] = []
  g.lots.get(lotKey)?.rows.forEach((r) => r.shkzg === 'S' && addPlace(out, placeOf(r)))
  return out
}

/** Follow transfer/conversion links upstream (309/311 with material or batch change). */
function conversionAncestors(g: TraceGraph, lotKey: string): string[] {
  const seen = new Set<string>([lotKey])
  const queue = [lotKey]
  const out: string[] = []
  while (queue.length) {
    const k = queue.shift()!
    g.convertedFrom.get(k)?.forEach((src) => {
      if (seen.has(src)) return
      seen.add(src)
      out.push(src)
      queue.push(src)
    })
  }
  return out
}

// ─── Chain builder ────────────────────────────────────────────────────────────

export function buildChain(g: TraceGraph, root: ChainRoot, opts: ChainOptions = {}): ChainResult {
  const isFacility = opts.isFacility ?? (() => true)
  const excluded = opts.allRows ? collectExcludedInputs(opts.allRows, isFacility) : new Map<string, ExcludedInput[]>()
  const costCenterRows = (opts.allRows ?? []).filter(
    (r) => normalizeCode(r.costCenter) && !normalizeCode(r.orderNo) && (COST_CENTER_ISSUE.has(bwartOf(r)) || COST_CENTER_REVERSAL.has(bwartOf(r)))
  )
  const result: ChainResult = {
    deliveries: [],
    startLots: [],
    startPlaces: new Map(),
    stages: [],
    stageOfOrder: new Map(),
    mainFlow: [],
    truncated: false,
  }

  // 1. Starting lots
  const pendingOrders: { orderNo: string; forLot: string | null }[] = []
  if (root.type === 'delivery') {
    result.deliveries = buildDeliveries(findDeliveryRows(g, root.ref))
    result.deliveries.forEach((d) => {
      if (!result.startLots.includes(d.lotKey)) result.startLots.push(d.lotKey)
      result.startPlaces.set(d.lotKey, d.from)
    })
  } else if (root.type === 'lot') {
    result.startLots.push(root.lotKey)
    result.startPlaces.set(root.lotKey, anyPlaces(g, root.lotKey))
  } else {
    pendingOrders.push({ orderNo: root.orderNo, forLot: null })
  }

  // Which orders produced a lot (directly or through a transfer/conversion ancestor)
  const producingOrders = (lotKey: string): string[] => {
    const set = new Set<string>()
    ;[lotKey, ...conversionAncestors(g, lotKey)].forEach((k) => g.producedBy.get(k)?.forEach((o) => set.add(o)))
    return Array.from(set)
  }

  result.startLots.forEach((lk) => producingOrders(lk).forEach((o) => pendingOrders.push({ orderNo: o, forLot: lk })))

  // 2. Breadth-first over production orders: stage 1 = closest to the customer
  const stageByOrder = new Map<string, ChainStage>()
  while (pendingOrders.length) {
    const { orderNo, forLot } = pendingOrders.shift()!
    const existing = stageByOrder.get(orderNo)
    if (existing) {
      if (forLot && !existing.producedFor.includes(forLot)) existing.producedFor.push(forLot)
      continue
    }
    const order = g.orders.get(orderNo)
    if (!order) continue
    if (result.stages.length >= MAX_STAGES) {
      result.truncated = true
      break
    }

    const stage: ChainStage = {
      no: result.stages.length + 1,
      orderNo,
      firstDate: order.firstDate,
      lastDate: order.lastDate,
      producedFor: forLot ? [forLot] : [],
      outputs: [],
      inputs: [],
      excluded: excluded.get(orderNo) ?? [],
      supportBasis: null,
    }
    result.stages.push(stage)
    stageByOrder.set(orderNo, stage)
    result.stageOfOrder.set(orderNo, stage.no)

    order.outputs.forEach((flow, lotKey) => {
      const lot = g.lots.get(lotKey)
      stage.outputs.push({
        lotKey,
        materialName: lot?.materialName || normalizeCode(lot?.material),
        batch: lot?.batch ?? '',
        qty: flow.qty,
        satuan: lot?.satuan ?? '',
        storedIn: storedPlaces(g, lotKey, orderNo),
        isTraced: false,
      })
    })

    order.inputs.forEach((flow, lotKey) => {
      const lot = g.lots.get(lotKey)
      const takenFrom: Place[] = []
      flow.rows.forEach((r) => addPlace(takenFrom, placeOf(r)))
      const ancestors = conversionAncestors(g, lotKey)
      const producers = producingOrders(lotKey).filter((o) => o !== orderNo)

      const sources: InputSource[] = []
      if (producers.length) sources.push({ kind: 'produced', stageNos: [], orderNos: producers })
      const purchases = [lotKey, ...ancestors].flatMap((k) => purchasesOf(g, k))
      if (purchases.length) sources.push({ kind: 'purchased', purchases })
      const opening = [lotKey, ...ancestors].map((k) => openingOf(g, k)).find((d) => d !== null)
      if (opening !== undefined && opening !== null) sources.push({ kind: 'opening', date: opening })
      if (sources.length === 0) sources.push({ kind: 'unknown' })

      const materialType = lot?.rows.find((r) => r.tipeMaterial)?.tipeMaterial ?? ''
      stage.inputs.push({
        lotKey,
        material: lot?.material ?? '',
        materialName: lot?.materialName || normalizeCode(lot?.material),
        materialType,
        materialGroup: lot?.rows.find((r) => r.grupMaterial)?.grupMaterial ?? '',
        batch: lot?.batch ?? '',
        qty: flow.qty,
        satuan: lot?.satuan ?? '',
        role: 'pendukung',
        takenFrom,
        sources,
        convertedFrom: ancestors,
      })

      producers.forEach((o) => pendingOrders.push({ orderNo: o, forLot: lotKey }))
    })

    classifyInputs(stage)
    stage.inputs.sort((a, b) =>
      a.role !== b.role ? (a.role === 'utama' ? -1 : 1) : a.materialName.localeCompare(b.materialName) || b.qty - a.qty
    )
  }

  // 2b. Supporting materials issued to the process cost center (201) while the traced batches were produced
  result.stages.forEach((stage) => {
    const rule = processOfOrder(stage.orderNo)
    if (!rule || costCenterRows.length === 0) return
    const tracedKeys = new Set(stage.producedFor.length ? stage.producedFor : result.startLots)
    const dates: string[] = []
    g.orders.get(stage.orderNo)?.outputs.forEach((flow, lotKey) => {
      if (tracedKeys.has(lotKey)) flow.rows.forEach((r) => r.postingDate && dates.push(r.postingDate))
    })
    const byOutputDates = dates.length > 0
    const from = byOutputDates ? dates.reduce((a, b) => (a < b ? a : b)) : stage.firstDate
    const to = byOutputDates ? dates.reduce((a, b) => (a > b ? a : b)) : stage.lastDate
    const matches = costCenterRows.filter((r) => {
      const kostl = normalizeCode(r.costCenter).toUpperCase()
      return rule.costCenterPrefixes.some((p) => kostl.startsWith(p)) && r.postingDate >= from && r.postingDate <= to
    })
    if (!matches.length) return
    const costCenters = Array.from(new Set(matches.map((r) => normalizeCode(r.costCenter)))).sort()
    stage.supportBasis = { process: rule.process, costCenters, from, to, byOutputDates }

    const groups = new Map<string, { rows: MutasiData[]; qty: number }>()
    for (const r of matches) {
      const k = lotKeyOf(r.kodeBarang, r.batch)
      const grp = groups.get(k) ?? { rows: [], qty: 0 }
      grp.rows.push(r)
      grp.qty += (COST_CENTER_REVERSAL.has(bwartOf(r)) ? -1 : 1) * abs(r.jumlah)
      groups.set(k, grp)
    }
    groups.forEach((grp, lotKey) => {
      if (grp.qty <= 0.0000001) return
      const r0 = grp.rows[0]
      const ccs = Array.from(new Set(grp.rows.map((r) => normalizeCode(r.costCenter))))
      if (!isFacility(r0.kodeBarang)) {
        if (!PRODUCTION_MATERIAL_TYPE.test(r0.tipeMaterial ?? '')) return
        const code = normalizeCode(r0.kodeBarang)
        const existing = stage.excluded.find((e) => normalizeCode(e.material) === code && e.costCenter)
        if (existing) existing.qty += grp.qty
        else stage.excluded.push({ material: r0.kodeBarang, materialName: r0.namaBarang || code, materialType: r0.tipeMaterial, qty: grp.qty, satuan: r0.satuan, costCenter: ccs.join(', ') })
        return
      }
      const takenFrom: Place[] = []
      grp.rows.forEach((r) => addPlace(takenFrom, placeOf(r)))
      const purchases = purchasesOf(g, lotKey)
      const sources: InputSource[] = purchases.length ? [{ kind: 'purchased', purchases }] : []
      const opening = openingOf(g, lotKey)
      if (opening !== null) sources.push({ kind: 'opening', date: opening })
      if (!sources.length) sources.push({ kind: 'unknown' })
      stage.inputs.push({
        lotKey,
        material: r0.kodeBarang,
        materialName: r0.namaBarang || normalizeCode(r0.kodeBarang),
        materialType: r0.tipeMaterial,
        materialGroup: r0.grupMaterial,
        batch: (r0.batch ?? '').toString().trim(),
        qty: grp.qty,
        satuan: r0.satuan,
        role: 'pendukung',
        takenFrom,
        sources,
        convertedFrom: [],
        costCenters: ccs,
      })
    })
    stage.excluded.sort((a, b) => a.materialName.localeCompare(b.materialName))
    stage.inputs.sort((a, b) =>
      a.role !== b.role ? (a.role === 'utama' ? -1 : 1) : a.materialName.localeCompare(b.materialName) || b.qty - a.qty
    )
  })

  // 3. Resolve stage numbers + mark traced outputs
  result.stages.forEach((s) => {
    s.outputs.forEach((o) => (o.isTraced = s.producedFor.includes(o.lotKey) || result.startLots.includes(o.lotKey)))
    s.outputs.sort((a, b) => Number(b.isTraced) - Number(a.isTraced) || b.qty - a.qty)
    s.inputs.forEach((i) =>
      i.sources.forEach((src) => {
        if (src.kind === 'produced') {
          src.stageNos = src.orderNos.map((o) => result.stageOfOrder.get(o) ?? 0).filter(Boolean).sort((a, b) => a - b)
        }
      })
    )
  })

  result.mainFlow = buildMainFlow(g, result)
  return result
}

// ─── Main flow strip: supplier → … → customer, following the main material ───

function buildMainFlow(g: TraceGraph, chain: ChainResult): FlowStep[] {
  const steps: FlowStep[] = []
  const lotStep = (lotKey: string): FlowStep => {
    const lot = g.lots.get(lotKey)
    return {
      kind: 'lot',
      title: lot?.materialName || normalizeCode(lot?.material) || 'Material',
      detail: lot?.batch ? `Batch ${lot.batch}` : 'Tanpa batch',
      lotKey,
    }
  }

  let lotKey: string | undefined =
    chain.startLots[0] ?? chain.stages[0]?.outputs.find((o) => o.isTraced)?.lotKey ?? chain.stages[0]?.outputs[0]?.lotKey
  const visited = new Set<number>()

  // Walk upstream, collecting in reverse
  const reversed: FlowStep[] = []
  if (chain.deliveries.length) {
    const d = chain.deliveries[0]
    const more = new Set(chain.deliveries.map((x) => x.customer)).size - 1
    reversed.push({
      kind: 'customer',
      title: d.customer + (more > 0 ? ` +${more}` : ''),
      detail: d.so ? `SO ${d.so}` : d.po ? `PO ${d.po}` : d.docs[0] ?? '',
    })
  }

  while (lotKey) {
    reversed.push(lotStep(lotKey))
    const stage: ChainStage | undefined = chain.stages.find(
      (s) => !visited.has(s.no) && s.outputs.some((o) => o.lotKey === lotKey)
    ) ?? chain.stages.find((s) => !visited.has(s.no) && s.producedFor.includes(lotKey!))
    if (!stage) {
      const purchases = purchasesOf(g, lotKey)
      if (purchases.length) {
        const vendors = Array.from(new Set(purchases.map((p) => p.vendor)))
        reversed.push({
          kind: 'vendor',
          title: vendors[0] + (vendors.length > 1 ? ` +${vendors.length - 1}` : ''),
          detail: purchases[0].po ? `PO ${purchases[0].po}` : 'Pembelian',
        })
      }
      break
    }
    visited.add(stage.no)
    reversed.push({ kind: 'stage', title: `Tahap ${stage.no}`, detail: `Order ${stage.orderNo}`, stageNo: stage.no })
    const main = stage.inputs.find((i) => i.role === 'utama' && i.sources.some((s) => s.kind === 'produced'))
      ?? stage.inputs.find((i) => i.role === 'utama')
    if (!main) break
    if (!main.sources.some((s) => s.kind === 'produced')) {
      reversed.push(lotStep(main.lotKey))
      const purchase = main.sources.find((s) => s.kind === 'purchased')
      if (purchase && purchase.kind === 'purchased') {
        const vendors = Array.from(new Set(purchase.purchases.map((p) => p.vendor)))
        reversed.push({
          kind: 'vendor',
          title: vendors[0] + (vendors.length > 1 ? ` +${vendors.length - 1}` : ''),
          detail: purchase.purchases[0].po ? `PO ${purchase.purchases[0].po}` : 'Pembelian',
        })
      }
      break
    }
    lotKey = main.lotKey
  }

  for (let i = reversed.length - 1; i >= 0; i--) steps.push(reversed[i])
  return steps
}
