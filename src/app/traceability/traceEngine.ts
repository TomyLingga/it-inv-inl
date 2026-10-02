// src/app/traceability/traceEngine.ts
//
// Batch genealogy built from MB51 goods movements.
//
//   lot   = material + batch
//   order = production / process order (AUFNR). It links the lots it consumed
//           (261, reversed by 262) to the lots it produced (101/531/521,
//           reversed by 102/532/522).
//   conversion = transfer posting in one material document where the issuing
//           line (H) and its paired receiving line (S, next/previous item)
//           carry a different material or batch (309, 311 with batch change…).
//
// Backward trace (hulu): lot ← orders that produced it ← their input lots ← …
//   until a vendor receipt (PO), opening stock, or the edge of the loaded data.
// Forward trace (hilir): lot → orders that consumed it → their output lots → …
//   until a customer delivery (601), other consumption, or remaining stock.

import { MutasiData } from '@/app/shared/types'
import { normalizeCode } from '@/app/shared/utils/filterUtils'

export const MAX_TRACE_DEPTH = 12

const ORDER_OUTPUT = new Set(['101', '531', '521'])
const ORDER_OUTPUT_REVERSAL = new Set(['102', '532', '522'])
const ORDER_INPUT_REVERSAL = new Set(['262'])
const SUPPLIER_RECEIPT = new Set(['101', '103', '105', '501', '511'])
const SUPPLIER_REVERSAL = new Set(['102', '104', '106', '122', '502', '512'])
const CUSTOMER_ISSUE = new Set(['601', '641', '643', '647', '653'])
const CUSTOMER_REVERSAL = new Set(['602', '642', '644', '648', '654'])
const OPENING_STOCK = new Set(['561'])
const OPENING_REVERSAL = new Set(['562'])
const OTHER_ISSUE = new Set(['201', '551', '221', '241', '291', '701'])
const OTHER_REVERSAL = new Set(['202', '552', '222', '242', '292', '702'])
const CONVERSION_BWART = new Set(['301', '303', '305', '309', '310', '311', '313', '315', '411', '412'])

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Lot {
  key: string
  material: string
  materialName: string
  batch: string
  satuan: string
  plant: string
  rows: MutasiData[]
  totalIn: number
  totalOut: number
}

interface LotFlow {
  qty: number
  rows: MutasiData[]
}

export interface ProductionOrder {
  orderNo: string
  inputs: Map<string, LotFlow>
  outputs: Map<string, LotFlow>
  firstDate: string
  lastDate: string
}

/** One external counterpart of a lot: vendor receipt, customer delivery, etc. */
export interface ExternalFlow {
  kind: 'supplier' | 'customer' | 'opening' | 'other'
  label: string        // vendor / customer name, or description
  ref: string          // PO / SO / cost center / doc
  qty: number
  satuan: string
  firstDate: string
  docs: string[]
}

export interface TraceGraph {
  lots: Map<string, Lot>
  orders: Map<string, ProductionOrder>
  producedBy: Map<string, Set<string>>   // lotKey → orderNos
  consumedIn: Map<string, Set<string>>   // lotKey → orderNos
  convertedFrom: Map<string, Set<string>> // lotKey → source lotKeys
  convertedTo: Map<string, Set<string>>   // lotKey → target lotKeys
}

export type TraceNode =
  | { kind: 'lot'; id: string; lotKey: string; qty?: number; relation?: string; children: TraceNode[] }
  | { kind: 'order'; id: string; orderNo: string; date: string; children: TraceNode[] }
  | { kind: 'external'; id: string; flow: ExternalFlow; children: TraceNode[] }
  | { kind: 'end'; id: string; label: string; tone: 'muted' | 'warn'; children: TraceNode[] }

export type TraceDirection = 'backward' | 'forward'

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function lotKeyOf(material: string, batch: string): string {
  return `${normalizeCode(material)}|${(batch ?? '').toString().trim().toUpperCase()}`
}

const abs = (n: unknown) => Math.abs(Number(n) || 0)
const bwartOf = (r: MutasiData) => (r.movementType ?? '').toString().trim()
const dateOf = (r: MutasiData) => (r.postingDate ?? '').toString()
const minDate = (a: string, b: string) => (!a ? b : !b ? a : a < b ? a : b)
const maxDate = (a: string, b: string) => (!a ? b : !b ? a : a > b ? a : b)

function addFlow(map: Map<string, LotFlow>, key: string, qty: number, row: MutasiData) {
  const f = map.get(key) ?? { qty: 0, rows: [] }
  f.qty += qty
  f.rows.push(row)
  map.set(key, f)
}

function addLink(map: Map<string, Set<string>>, from: string, to: string) {
  const s = map.get(from) ?? new Set<string>()
  s.add(to)
  map.set(from, s)
}

// ─── Graph builder ────────────────────────────────────────────────────────────

export function buildTraceGraph(rows: MutasiData[]): TraceGraph {
  const g: TraceGraph = {
    lots: new Map(),
    orders: new Map(),
    producedBy: new Map(),
    consumedIn: new Map(),
    convertedFrom: new Map(),
    convertedTo: new Map(),
  }

  const docs = new Map<string, MutasiData[]>()

  for (const row of rows) {
    const key = lotKeyOf(row.kodeBarang, row.batch)
    let lot = g.lots.get(key)
    if (!lot) {
      lot = {
        key,
        material: row.kodeBarang ?? '',
        materialName: row.namaBarang ?? '',
        batch: (row.batch ?? '').toString().trim(),
        satuan: row.satuan ?? '',
        plant: row.plant ?? '',
        rows: [],
        totalIn: 0,
        totalOut: 0,
      }
      g.lots.set(key, lot)
    }
    lot.rows.push(row)
    if (!lot.materialName && row.namaBarang) lot.materialName = row.namaBarang
    if (row.shkzg === 'S') lot.totalIn += abs(row.jumlah)
    else lot.totalOut += abs(row.jumlah)

    const bwart = bwartOf(row)
    const orderNo = normalizeCode(row.orderNo)
    if (orderNo) {
      let order = g.orders.get(orderNo)
      if (!order) {
        order = { orderNo, inputs: new Map(), outputs: new Map(), firstDate: '', lastDate: '' }
        g.orders.set(orderNo, order)
      }
      order.firstDate = minDate(order.firstDate, dateOf(row))
      order.lastDate = maxDate(order.lastDate, dateOf(row))

      if (ORDER_OUTPUT.has(bwart) && row.shkzg === 'S') addFlow(order.outputs, key, abs(row.jumlah), row)
      else if (ORDER_OUTPUT_REVERSAL.has(bwart)) addFlow(order.outputs, key, -abs(row.jumlah), row)
      else if (ORDER_INPUT_REVERSAL.has(bwart)) addFlow(order.inputs, key, -abs(row.jumlah), row)
      else if (row.shkzg === 'H') addFlow(order.inputs, key, abs(row.jumlah), row)
    } else if (CONVERSION_BWART.has(bwart) && row.nomorDokMaterial) {
      const docKey = `${row.nomorDokMaterial}/${row.tahunDokumen}`
      const list = docs.get(docKey) ?? []
      list.push(row)
      docs.set(docKey, list)
    }
  }

  // Drop fully reversed flows and index lots ↔ orders
  for (const order of Array.from(g.orders.values())) {
    for (const [k, f] of Array.from(order.inputs.entries())) {
      if (f.qty <= 0) order.inputs.delete(k)
      else addLink(g.consumedIn, k, order.orderNo)
    }
    for (const [k, f] of Array.from(order.outputs.entries())) {
      if (f.qty <= 0) order.outputs.delete(k)
      else addLink(g.producedBy, k, order.orderNo)
    }
    if (order.inputs.size === 0 && order.outputs.size === 0) g.orders.delete(order.orderNo)
  }

  // Conversions: pair the issuing line with its adjacent receiving line
  for (const list of Array.from(docs.values())) {
    const byItem = new Map<number, MutasiData>()
    list.forEach((r) => byItem.set(Number(r.itemDokumen) || 0, r))
    for (const issue of list) {
      if (issue.shkzg !== 'H') continue
      const z = Number(issue.itemDokumen) || 0
      const receipt = [byItem.get(z + 1), byItem.get(z - 1)].find((r) => r && r.shkzg === 'S')
      if (!receipt) continue
      const from = lotKeyOf(issue.kodeBarang, issue.batch)
      const to = lotKeyOf(receipt.kodeBarang, receipt.batch)
      if (from === to) continue
      addLink(g.convertedTo, from, to)
      addLink(g.convertedFrom, to, from)
    }
  }

  return g
}

// ─── External flows of a lot (vendor / customer / other) ─────────────────────

function collectExternal(lot: Lot, direction: TraceDirection): ExternalFlow[] {
  const groups = new Map<string, ExternalFlow>()

  const push = (kind: ExternalFlow['kind'], label: string, ref: string, sign: number, row: MutasiData) => {
    const k = `${kind}|${label}|${ref}`
    const f =
      groups.get(k) ??
      { kind, label, ref, qty: 0, satuan: row.satuan || lot.satuan, firstDate: '', docs: [] }
    f.qty += sign * abs(row.jumlah)
    f.firstDate = minDate(f.firstDate, dateOf(row))
    if (row.nomorDokMaterial && !f.docs.includes(row.nomorDokMaterial)) f.docs.push(row.nomorDokMaterial)
    groups.set(k, f)
  }

  for (const row of lot.rows) {
    if (normalizeCode(row.orderNo)) continue
    const bwart = bwartOf(row)

    if (direction === 'backward') {
      const isVendorReceipt = SUPPLIER_RECEIPT.has(bwart) && row.shkzg === 'S'
      const isVendorReversal = SUPPLIER_REVERSAL.has(bwart)
      if (isVendorReceipt || isVendorReversal) {
        const label = (row.peranMitra === 'Vendor' && row.namaMitra) || (row.kodeVendor ? `Vendor ${normalizeCode(row.kodeVendor)}` : 'Vendor / Supplier')
        const ref = row.nomorPo ? `PO ${row.nomorPo}` : row.nomorDokMaterial
        push('supplier', label, ref, isVendorReceipt ? 1 : -1, row)
      } else if (OPENING_STOCK.has(bwart) || OPENING_REVERSAL.has(bwart)) {
        push('opening', 'Saldo Awal / Inisialisasi Stok', '', OPENING_STOCK.has(bwart) ? 1 : -1, row)
      }
    } else {
      const isCustomerIssue = CUSTOMER_ISSUE.has(bwart) || (row.peranMitra === 'Customer' && row.shkzg === 'H')
      if (isCustomerIssue || CUSTOMER_REVERSAL.has(bwart)) {
        const label = (row.peranMitra === 'Customer' && row.namaMitra) || (row.customer ? `Customer ${normalizeCode(row.customer)}` : 'Customer / Buyer')
        const ref = row.nomorSO ? `SO ${row.nomorSO}` : row.nomorDokMaterial
        push('customer', label, ref, CUSTOMER_REVERSAL.has(bwart) ? -1 : 1, row)
      } else if (OTHER_ISSUE.has(bwart) || OTHER_REVERSAL.has(bwart)) {
        const label = row.movementText || (bwart === '551' ? 'Scrap / Pemusnahan' : 'Pemakaian lain')
        const ref = row.costCenter ? `Cost Center ${row.costCenter}` : ''
        push('other', label, ref, OTHER_REVERSAL.has(bwart) ? -1 : 1, row)
      }
    }
  }

  return Array.from(groups.values()).filter((f) => f.qty > 0.0000001)
}

// ─── Tree builders ────────────────────────────────────────────────────────────
//
// The genealogy is a graph, not a tree: continuous/process orders share lots
// (an output that is also an input, the same batch feeding many orders…).
// Expanding every occurrence blows up exponentially, so each lot and each order
// is expanded ONCE per tree; later occurrences become a reference leaf. A node
// budget is a last-resort safety net.

const MAX_TREE_NODES = 4000

interface TraceContext {
  g: TraceGraph
  direction: TraceDirection
  expanded: Set<string> // 'lot:<key>' / 'order:<no>' already expanded in this tree
  path: Set<string>     // nodes on the current branch (cycle detection)
  count: number
  seq: number
}

function nid(ctx: TraceContext, p: string): string {
  ctx.count += 1
  return `${p}-${++ctx.seq}`
}

function endNode(ctx: TraceContext, label: string, tone: 'muted' | 'warn'): TraceNode {
  return { kind: 'end', id: nid(ctx, 'end'), label, tone, children: [] }
}

/** Returns a leaf explaining why `key` is not expanded here, or null to expand it. */
function stopReason(ctx: TraceContext, key: string, depth: number): TraceNode | null {
  if (ctx.path.has(key)) return endNode(ctx, 'Siklus — sudah muncul di jalur atas', 'warn')
  if (ctx.expanded.has(key)) return endNode(ctx, 'Sudah diuraikan di cabang lain — klik ⌖ untuk menjadikannya fokus', 'muted')
  if (depth >= MAX_TRACE_DEPTH) return endNode(ctx, 'Batas kedalaman tercapai — klik ⌖ untuk melanjutkan dari sini', 'warn')
  if (ctx.count >= MAX_TREE_NODES) return endNode(ctx, 'Cabang terlalu banyak — klik ⌖ untuk menelusuri dari sini', 'warn')
  return null
}

function traceLot(ctx: TraceContext, lotKey: string, depth: number, qty?: number, relation?: string): TraceNode {
  const { g, direction } = ctx
  const node: TraceNode = { kind: 'lot', id: nid(ctx, 'lot'), lotKey, qty, relation, children: [] }
  const lot = g.lots.get(lotKey)
  if (!lot) return node

  const key = `lot:${lotKey}`
  const stop = stopReason(ctx, key, depth)
  if (stop) {
    node.children.push(stop)
    return node
  }
  ctx.expanded.add(key)
  ctx.path.add(key)

  const orderNos = (direction === 'backward' ? g.producedBy : g.consumedIn).get(lotKey)
  orderNos?.forEach((orderNo) => {
    node.children.push(traceOrder(ctx, orderNo, depth + 1))
  })

  const linked = (direction === 'backward' ? g.convertedFrom : g.convertedTo).get(lotKey)
  linked?.forEach((other) => {
    node.children.push(
      traceLot(ctx, other, depth + 1, undefined, direction === 'backward' ? 'Transfer / konversi dari' : 'Transfer / konversi ke')
    )
  })

  collectExternal(lot, direction).forEach((flow) => {
    node.children.push({ kind: 'external', id: nid(ctx, 'ext'), flow, children: [] })
  })

  if (direction === 'forward') {
    const remaining = lot.totalIn - lot.totalOut
    if (remaining > 0.0000001 && node.children.length > 0) {
      node.children.push(
        endNode(ctx, `Sisa ±${remaining.toLocaleString('id-ID', { maximumFractionDigits: 3 })} ${lot.satuan} belum keluar (dalam periode data)`, 'muted')
      )
    }
  }

  if (node.children.length === 0) {
    node.children.push(
      direction === 'backward'
        ? endNode(ctx, 'Asal lot tidak ditemukan pada periode data — perluas rentang tanggal', 'warn')
        : endNode(ctx, 'Belum dipakai / dikeluarkan pada periode data (masih di stok)', 'muted')
    )
  }

  ctx.path.delete(key)
  return node
}

function traceOrder(ctx: TraceContext, orderNo: string, depth: number): TraceNode {
  const { g, direction } = ctx
  const order = g.orders.get(orderNo)
  const node: TraceNode = { kind: 'order', id: nid(ctx, 'ord'), orderNo, date: order?.firstDate ?? '', children: [] }
  if (!order) return node

  const key = `order:${orderNo}`
  const stop = stopReason(ctx, key, depth)
  if (stop) {
    node.children.push(stop)
    return node
  }
  ctx.expanded.add(key)
  ctx.path.add(key)

  const flows = direction === 'backward' ? order.inputs : order.outputs
  flows.forEach((flow, lotKey) => {
    node.children.push(
      traceLot(ctx, lotKey, depth + 1, flow.qty, direction === 'backward' ? 'Bahan masuk produksi' : 'Hasil produksi')
    )
  })
  if (node.children.length === 0) {
    node.children.push(
      endNode(
        ctx,
        direction === 'backward' ? 'Tidak ada konsumsi bahan tercatat pada periode data' : 'Belum ada hasil produksi tercatat pada periode data',
        'warn'
      )
    )
  }

  ctx.path.delete(key)
  return node
}

export type TraceRoot = { type: 'lot'; lotKey: string } | { type: 'order'; orderNo: string }

export function buildTraceTree(g: TraceGraph, root: TraceRoot, direction: TraceDirection): TraceNode {
  const ctx: TraceContext = { g, direction, expanded: new Set(), path: new Set(), count: 0, seq: 0 }
  return root.type === 'lot' ? traceLot(ctx, root.lotKey, 0) : traceOrder(ctx, root.orderNo, 0)
}

// ─── Summaries (flat list of what is at the ends of the tree) ────────────────

export interface TraceSummaryRow {
  lotKey: string
  flow?: ExternalFlow
  orderNos: string[]
}

/**
 * Backward: every lot that came from a vendor / opening stock (bahan baku &
 * bahan pendukung asal). Forward: every customer delivery / other usage.
 */
export function summarizeTree(tree: TraceNode): TraceSummaryRow[] {
  const out: TraceSummaryRow[] = []
  const walk = (node: TraceNode, lotKey: string | null, orders: string[]) => {
    if (node.kind === 'external' && lotKey) {
      out.push({ lotKey, flow: node.flow, orderNos: orders })
      return
    }
    const nextLot = node.kind === 'lot' ? node.lotKey : lotKey
    const nextOrders = node.kind === 'order' ? [...orders, node.orderNo] : orders
    node.children.forEach((c) => walk(c, nextLot, nextOrders))
  }
  walk(tree, null, [])
  return out
}

/** Distinct lots appearing anywhere in the tree (excluding the root lot). */
export function collectTreeLots(tree: TraceNode): Set<string> {
  const lots = new Set<string>()
  const walk = (node: TraceNode, isRoot: boolean) => {
    if (node.kind === 'lot' && !isRoot) lots.add(node.lotKey)
    node.children.forEach((c) => walk(c, false))
  }
  walk(tree, true)
  return lots
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface TraceCandidate {
  root: TraceRoot
  title: string
  subtitle: string
  reason: string
}

/**
 * Resolve free text into trace starting points. Matches (in priority order):
 * batch, production order, PO, SO, material document, vendor/customer name,
 * material code, material name.
 */
export function searchTrace(g: TraceGraph, query: string, limit = 60): TraceCandidate[] {
  const q = query.trim().toUpperCase()
  if (!q) return []
  const qNorm = normalizeCode(q)
  const out: TraceCandidate[] = []
  const seen = new Set<string>()

  const lotCandidate = (lotKey: string, reason: string) => {
    if (seen.has(`lot:${lotKey}`)) return
    const lot = g.lots.get(lotKey)
    if (!lot) return
    seen.add(`lot:${lotKey}`)
    out.push({
      root: { type: 'lot', lotKey },
      title: lot.materialName || normalizeCode(lot.material),
      subtitle: `${normalizeCode(lot.material)} · ${lot.batch ? `Batch ${lot.batch}` : 'Tanpa batch'}`,
      reason,
    })
  }

  // 1. Production order
  const order = g.orders.get(qNorm)
  if (order) {
    seen.add(`order:${order.orderNo}`)
    out.push({
      root: { type: 'order', orderNo: order.orderNo },
      title: `Order Produksi ${order.orderNo}`,
      subtitle: `${order.inputs.size} bahan masuk · ${order.outputs.size} hasil produksi`,
      reason: 'Nomor order produksi',
    })
  }

  // 2. Batch (exact first, then partial)
  const lots = Array.from(g.lots.values())
  lots.filter((l) => l.batch && l.batch.toUpperCase() === q).forEach((l) => lotCandidate(l.key, 'Nomor batch'))
  if (q.length >= 3) {
    lots.filter((l) => l.batch && l.batch.toUpperCase().includes(q)).forEach((l) => lotCandidate(l.key, 'Nomor batch (sebagian)'))
  }

  // 3. Document references on movements (PO / SO / material doc / partner name)
  for (const lot of lots) {
    for (const r of lot.rows) {
      if (out.length >= limit) break
      if (r.nomorPo && normalizeCode(r.nomorPo) === qNorm) lotCandidate(lot.key, `PO ${r.nomorPo}`)
      else if (r.nomorSO && normalizeCode(r.nomorSO) === qNorm) lotCandidate(lot.key, `SO ${r.nomorSO}`)
      else if (r.nomorDokMaterial && normalizeCode(r.nomorDokMaterial) === qNorm) lotCandidate(lot.key, `Dokumen material ${r.nomorDokMaterial}`)
      else if (q.length >= 3 && r.namaMitra && r.namaMitra.toUpperCase().includes(q)) {
        lotCandidate(lot.key, `${r.peranMitra === 'Customer' ? 'Customer' : 'Vendor'}: ${r.namaMitra}`)
      }
    }
  }

  // 4. Material code / name
  lots.filter((l) => normalizeCode(l.material) === qNorm).forEach((l) => lotCandidate(l.key, 'Kode material'))
  if (q.length >= 3) {
    lots.filter((l) => l.materialName.toUpperCase().includes(q)).forEach((l) => lotCandidate(l.key, 'Nama material'))
  }

  return out.slice(0, limit)
}
