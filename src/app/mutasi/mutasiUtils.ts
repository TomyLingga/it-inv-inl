// src/app/mutasi/mutasiUtils.ts
//
// Helpers for the Mutasi (MB51 goods-movement) view: reversal detection and
// batch-journey grouping. Kept separate from page.tsx so both the table config
// and the flow timeline can reuse them without a circular import.

import { MutasiData } from '@/app/shared/types'

// Movement types that represent a reversal / cancellation of a prior posting.
// (102↔101, 104↔103, 106↔105, 122 return, 262↔261 consumption reversal,
//  202↔201 cost-center reversal, 306/304 transfer reversal, 552/562 reversals.)
export const REVERSAL_BWART = new Set([
  '102', '104', '106', '122', '162', '202', '262', '304', '306', '308',
  '312', '314', '316', '542', '552', '562', '602', '702',
])

/**
 * A movement is a reversal when its BWART is a known reversal code, or when the
 * signed quantity / value came back negative (SAP marks reversals in red — the
 * MB51 COLOR band — which maps to a negative ERFMG/DMBTR in this API).
 */
export function isReversal(row: MutasiData): boolean {
  const bwart = (row.movementType ?? '').toString().trim()
  if (REVERSAL_BWART.has(bwart)) return true
  if (Number(row.jumlah) < 0) return true
  if (Number(row.nilaiMutasi) < 0) return true
  return false
}

// ─── Batch journey grouping ───────────────────────────────────────────────────

export interface BatchJourney {
  key: string
  material: string       // kodeBarang (MATNR)
  materialName: string   // namaBarang (MAKTX)
  batch: string          // CHARG — '' means "Tanpa Batch"
  plant: string
  satuan: string
  steps: MutasiData[]     // chronological (oldest → newest)
  totalMasuk: number
  totalKeluar: number
  netQty: number
  totalNilai: number
  stages: string[]        // derived chain labels (PO → S.Loc → Produksi → …)
}

const RECEIPT_BWART = new Set(['101', '103', '105'])
const TRANSFER_BWART = new Set(['301', '303', '305', '311', '313', '315'])
const PROD_CONSUME_BWART = new Set(['261', '221', '231', '241'])
const PROD_RECEIPT_BWART = new Set(['101', '531', '521', '101'])
const ISSUE_BWART = new Set(['201', '551', '601', '901'])

/**
 * Derive the human-readable movement chain that appears in a journey, ordered
 * per the Bea Cukai flow: Supplier/PO → S.Loc (batch) → Produksi → Produk.
 */
function deriveStages(steps: MutasiData[]): string[] {
  const stages: string[] = []
  const has = (pred: (m: MutasiData) => boolean) => steps.some(pred)

  if (has((m) => RECEIPT_BWART.has(m.movementType) && (Boolean(m.nomorPo) || Boolean(m.kodeVendor)) && !m.orderNo)) {
    stages.push('Penerimaan (PO/Supplier)')
  }
  if (has((m) => TRANSFER_BWART.has(m.movementType))) {
    stages.push('Transfer S.Loc')
  }
  if (has((m) => PROD_CONSUME_BWART.has(m.movementType) || (m.shkzg === 'H' && Boolean(m.orderNo)))) {
    stages.push('Konsumsi Produksi')
  }
  if (has((m) => PROD_RECEIPT_BWART.has(m.movementType) && Boolean(m.orderNo))) {
    stages.push('Hasil Produksi')
  }
  if (has((m) => ISSUE_BWART.has(m.movementType) || (m.shkzg === 'H' && !m.orderNo && !TRANSFER_BWART.has(m.movementType)))) {
    stages.push('Pengeluaran')
  }
  if (has(isReversal)) {
    stages.push('Pembatalan')
  }
  return stages.length ? Array.from(new Set(stages)) : ['Mutasi Umum']
}

function chronoKey(m: MutasiData): string {
  return `${m.postingDate ?? ''}T${m.entryTime ?? '00:00:00'}`
}

/**
 * Group mutasi rows into batch journeys, keyed by material + batch. Rows without
 * a batch (some materials are GR'd without one, per the MoM) fall into a shared
 * "Tanpa Batch" journey per material so they can still be traced by material.
 * Journeys are ordered by their most-recent activity; steps run oldest → newest.
 */
export function buildBatchJourneys(data: MutasiData[]): BatchJourney[] {
  const map = new Map<string, BatchJourney>()

  for (const row of data) {
    const material = (row.kodeBarang ?? '').toString()
    const batch = (row.batch ?? '').toString()
    const key = `${material}__${batch}`

    let journey = map.get(key)
    if (!journey) {
      journey = {
        key,
        material,
        materialName: row.namaBarang ?? '',
        batch,
        plant: row.plant ?? '',
        satuan: row.satuan ?? '',
        steps: [],
        totalMasuk: 0,
        totalKeluar: 0,
        netQty: 0,
        totalNilai: 0,
        stages: [],
      }
      map.set(key, journey)
    }

    journey.steps.push(row)
    const qty = Math.abs(Number(row.jumlah) || 0)
    const isMasuk = row.shkzg === 'S' || row.arahMutasi === 'Masuk'
    if (isMasuk) journey.totalMasuk += qty
    else journey.totalKeluar += qty
    journey.totalNilai += Number(row.nilaiMutasi) || 0
    if (!journey.satuan && row.satuan) journey.satuan = row.satuan
  }

  const journeys = Array.from(map.values())
  for (const j of journeys) {
    j.steps.sort((a, b) => chronoKey(a).localeCompare(chronoKey(b)))
    j.netQty = j.totalMasuk - j.totalKeluar
    j.stages = deriveStages(j.steps)
  }

  // Most-recent activity first so the freshest journeys are on top.
  journeys.sort((a, b) => {
    const la = a.steps.length ? chronoKey(a.steps[a.steps.length - 1]) : ''
    const lb = b.steps.length ? chronoKey(b.steps[b.steps.length - 1]) : ''
    return lb.localeCompare(la)
  })

  return journeys
}
