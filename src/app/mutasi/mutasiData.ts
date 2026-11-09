// src/app/mutasi/mutasiData.ts
//
// Loading + mapping of MB51 goods movements (shared by the Mutasi and
// Traceability pages). MB51 only carries codes, so rows are enriched with:
//   • vendor / customer name + customs document (BC, AJU, pendaftaran) from the
//     Pemasukan (incoming) and Pengeluaran (outgoing) customs reports
//   • storage location name (LGOBE) from Stock INL
//   • material type (MTBEZ: Bahan Baku, Produk Jadi, Kemasan, …) from Material List

import { AsalKebun, MutasiData } from '@/app/shared/types'
import { normalizeCode } from '@/app/shared/utils/filterUtils'
import { fetchWithTokenRefresh } from '@/lib/fetchWithTokenRefresh'

// ─── Format date for SAP: YYYYMMDD ───────────────────────────────────────────
export function toSapDate(isoDate: string): string {
  return isoDate ? isoDate.replace(/-/g, '') : ''
}

/** "3003 – OIP RBDPO" (or just "3003" when the name is unknown). */
export function slocText(lgort: string, name?: string): string {
  const code = (lgort ?? '').toString().trim()
  const n = (name ?? '').toString().trim()
  if (!code) return n
  return n && n.toUpperCase() !== code.toUpperCase() ? `${code} – ${n}` : code
}

function formatLocation(lgort: string, werks: string, name?: string): string {
  if (lgort && werks) return `Gudang ${slocText(lgort, name)} (${werks})`
  if (lgort) return `Gudang ${slocText(lgort, name)}`
  if (werks) return `Plant ${werks}`
  return 'Gudang'
}

/** "PT Lestari (12000345)" — name first, code in brackets unless the name already carries it. */
export function partnerText(name: string, code: string): string {
  const n = (name ?? '').toString().trim()
  const c = normalizeCode((code ?? '').toString())
  if (!n) return c
  if (!c || normalizeCode(n.split(/\s+/)[0]) === c) return n
  return `${n} (${c})`
}

function vendorLabel(row: MutasiData): string {
  const name = row.peranMitra === 'Vendor' ? row.namaMitra : ''
  if (row.nomorPo) {
    const who = name || (row.kodeVendor ? `Vendor ${normalizeCode(row.kodeVendor)}` : 'Vendor')
    return `${who} (PO ${row.nomorPo})`
  }
  if (name) return name
  return row.kodeVendor ? `Vendor (${normalizeCode(row.kodeVendor)})` : ''
}

function customerLabel(row: MutasiData): string {
  const name = row.peranMitra === 'Customer' ? partnerText(row.namaMitra, row.customer) : ''
  const ref = row.nomorSO ? `SO ${row.nomorSO}` : ''
  if (name) return ref ? `${name} · ${ref}` : name
  return row.customer ? `Customer (${normalizeCode(row.customer)})` : row.nomorSO ? `Customer (SO ${row.nomorSO})` : ''
}

// ─── Route (Dari ➔ Ke) Resolver ─────────────────────────────────────────────
export function determineRoute(row: MutasiData): { asal: string; tujuan: string; alur: string } {
  const bwart = (row.movementType ?? '').toString().trim()
  const shkzg = (row.shkzg ?? 'S').toString().toUpperCase()
  const lgort = (row.storageLocation ?? '').toString().trim()
  const werks = (row.plant ?? '').toString().trim()
  const ebeln = (row.nomorPo ?? '').toString().trim()
  const aufnr = (row.orderNo ?? '').toString().trim()
  const kostl = (row.costCenter ?? '').toString().trim()
  const umlgo = (row.destStorageLocation ?? '').toString().trim()
  const umwrk = (row.destPlant ?? '').toString().trim()
  const vendor = vendorLabel(row)
  const customer = customerLabel(row)

  const curLoc = formatLocation(lgort, werks, row.storageLocationName)
  const destName = slocText(umlgo, row.destStorageLocationName)
  const destLoc = umlgo
    ? (umwrk && umwrk !== werks ? `Gudang ${destName} (${umwrk})` : `Gudang ${destName}`)
    : (umwrk && umwrk !== werks ? `Plant ${umwrk}` : '')

  let asal = ''
  let tujuan = ''

  // 101, 103, 105 - Goods Receipt
  if (['101', '103', '105'].includes(bwart)) {
    if (ebeln) {
      asal = vendor
      tujuan = curLoc
    } else if (aufnr) {
      asal = `Order Produksi (${aufnr})`
      tujuan = curLoc
    } else {
      asal = vendor || 'Penerimaan Luar'
      tujuan = curLoc
    }
  }
  // 102, 104, 106, 122 - Reversal / Return
  else if (['102', '104', '106', '122'].includes(bwart)) {
    asal = curLoc
    tujuan = ebeln ? `Retur ke ${vendor}` : aufnr ? `Batal GR Produksi (${aufnr})` : 'Retur / Batal Penerimaan'
  }
  // 261, 262 - Consumption for Order (Produksi)
  else if (bwart === '261') {
    asal = curLoc
    tujuan = aufnr ? `Proses Produksi (${aufnr})` : 'Proses Produksi'
  } else if (bwart === '262') {
    asal = aufnr ? `Proses Produksi (${aufnr})` : 'Proses Produksi'
    tujuan = curLoc
  }
  // 201, 202 - Consumption for Cost Center
  else if (bwart === '201') {
    asal = curLoc
    tujuan = kostl ? `Cost Center (${kostl})` : 'Pemakaian Biaya'
  } else if (bwart === '202') {
    asal = kostl ? `Cost Center (${kostl})` : 'Pemakaian Biaya'
    tujuan = curLoc
  }
  // 301, 311, 303, 305, 309, 313, 315 - Transfer Posting (309 = konversi material/batch); Z23/Z24/Z25 = transfer custom INL (remove from / place in storage)
  else if (['301', '311', '303', '305', '309', '310', '313', '315', 'Z23', 'Z24', 'Z25'].includes(bwart)) {
    if (shkzg === 'H') {
      asal = curLoc
      tujuan = destLoc ? destLoc : (umwrk && umwrk !== werks ? `Plant ${umwrk}` : `Transfer Antar Gudang (${werks})`)
    } else {
      asal = destLoc ? destLoc : (umwrk && umwrk !== werks ? `Plant ${umwrk}` : `Transfer Antar Gudang (${werks})`)
      tujuan = curLoc
    }
  }
  // 601, 602 - Goods Issue for Delivery / Sales
  else if (bwart === '601') {
    asal = curLoc
    tujuan = customer || 'Pengeluaran / Delivery'
  } else if (bwart === '602') {
    asal = customer || 'Retur Pelanggan'
    tujuan = curLoc
  }
  // 551, 552 - Scrap / Penyesuaian Rusak
  else if (['551', '552'].includes(bwart)) {
    if (bwart === '551') {
      asal = curLoc
      tujuan = 'Scrap / Pemusnahan'
    } else {
      asal = 'Scrap / Pemusnahan'
      tujuan = curLoc
    }
  }
  // 561, 562 - Initial Stock / Saldo Awal
  else if (['561', '562'].includes(bwart)) {
    asal = 'Saldo Awal / Inisialisasi'
    tujuan = curLoc
  }
  // Fallback based on Debit/Credit
  else {
    if (shkzg === 'S') {
      asal = vendor || (aufnr ? `Order ${aufnr}` : 'Penerimaan')
      tujuan = curLoc
    } else {
      asal = curLoc
      tujuan = aufnr ? `Order ${aufnr}` : kostl ? `Cost Center ${kostl}` : customer || 'Pengeluaran'
    }
  }

  return {
    asal,
    tujuan,
    alur: `${asal} ➔ ${tujuan}`,
  }
}

function withRoute(row: MutasiData): MutasiData {
  const route = determineRoute(row)
  return { ...row, asalMutasi: route.asal, tujuanMutasi: route.tujuan, alurMutasi: route.alur }
}

// ─── Kebun / PKS asal (ZZKODE_KEBUN_1..4, ZZNAMA_KEBUN_1..4, ZZKG_1..4) ────────
function mapAsalKebun(item: any): AsalKebun[] {
  const out: AsalKebun[] = []
  for (let i = 1; i <= 4; i++) {
    const kode = (item[`ZZKODE_KEBUN_${i}`] ?? '').toString().trim()
    const nama = (item[`ZZNAMA_KEBUN_${i}`] ?? '').toString().trim()
    const kg = Number(item[`ZZKG_${i}`]) || 0
    if (kode || nama) out.push({ kode, nama, kg })
  }
  return out
}

// ─── SAP response → MutasiData mapper ────────────────────────────────────────
export function mapSapToMutasi(raw: any[]): MutasiData[] {
  return raw.map((item, idx) => {
    const shkzg = (item.SHKZG ?? 'S').toString().toUpperCase()
    const isMasuk = shkzg === 'S'
    const rawQty = Number(item.ERFMG ?? item.MENGE ?? item.BSTMG) || 0
    const rawVal = Number(item.DMBTR) || 0
    const headerText = (item.BKTXT ?? '').toString().trim()
    const itemText = (item.SGTXT ?? '').toString().trim()

    const row: MutasiData = {
      no: idx + 1,
      postingDate: item.BUDAT ?? '',
      docDate: item.BLDAT ?? '',
      entryDate: item.CPUDT ?? '',
      entryTime: item.CPUTM ?? '',
      nomorDokMaterial: item.MBLNR ?? '',
      tahunDokumen: Number(item.MJAHR) || new Date().getFullYear(),
      itemDokumen: Number(item.ZEILE) || 1,
      movementType: item.BWART ?? '',
      movementText: item.BTEXT ?? '',
      transType: item.VGART ?? '',
      shkzg,
      arahMutasi: isMasuk ? 'Masuk' : 'Keluar',
      asalMutasi: '',
      tujuanMutasi: '',
      alurMutasi: '',
      kodeBarang: item.MATNR ?? '',
      namaBarang: item.MAKTX ?? '',
      batch: item.CHARG ?? '',
      valuationType: item.BWTAR ?? '',
      plant: item.WERKS ?? '',
      plantName: item.NAME1 ?? '',
      storageLocation: item.LGORT ?? '',
      storageLocationName: (item.LGOBE ?? '').toString().trim(),
      destPlant: item.UMWRK ?? '',
      destStorageLocation: item.UMLGO ?? '',
      destStorageLocationName: '',
      jumlah: rawQty,
      satuan: item.ERFME ?? item.MEINS ?? item.BSTME ?? 'KG',
      nilaiMutasi: rawVal,
      mataUang: item.WAERS ?? 'IDR',
      nomorPo: item.EBELN ?? '',
      itemPo: Number(item.EBELP) || 0,
      kodeVendor: item.LIFNR ?? '',
      customer: item.KUNNR ?? '',
      nomorSO: (item.KDAUF ?? '').toString().trim(),
      namaMitra: '',
      peranMitra: '',
      penerimaBarang: item.WEMPF ?? '',
      orderNo: item.AUFNR ?? '',
      costCenter: item.KOSTL ?? '',
      userSap: item.USNAM ?? '',
      headerText,
      itemText,
      keterangan: itemText || headerText || '-',
      grupMaterial: item.ZZMATKL ?? '',
      namaGrupMaterial: item.ZZWGBEZ ?? '',
      tipeMaterial: (item.MTBEZ ?? '').toString().trim(),
      jenisDokBC: '',
      nomorAju: '',
      nomorPendaftaran: '',
      tglPendaftaran: '',
      asalKebun: mapAsalKebun(item),
    }
    return withRoute(row)
  })
}

// ─── Vendor / Customer + customs document lookup (Pemasukan & Pengeluaran) ───

interface PartnerInfo {
  name: string
  role: 'Vendor' | 'Customer'
  so?: string
  po?: string
  jenisDokBC: string
  nomorAju: string
  nomorPendaftaran: string
  tglPendaftaran: string
}

export interface PartnerLookup {
  byDoc: Map<string, PartnerInfo>  // MBLNR → partner
  byPo: Map<string, PartnerInfo>   // EBELN → partner
  bySo: Map<string, PartnerInfo>   // VBELN → partner
}

const key = (v: unknown) => normalizeCode((v ?? '').toString())
const str = (v: unknown) => (v ?? '').toString().trim()

function customsOf(item: any) {
  return {
    jenisDokBC: str(item.JENISDOK),
    nomorAju: str(item.NOAJU),
    nomorPendaftaran: str(item.NOPENDT),
    tglPendaftaran: str(item.TGLPEND),
  }
}

export function buildPartnerLookup(pemasukanRaw: any[], pengeluaranRaw: any[]): PartnerLookup {
  const lookup: PartnerLookup = { byDoc: new Map(), byPo: new Map(), bySo: new Map() }

  for (const item of pemasukanRaw) {
    const name = str(item.VENDOR)
    if (!name) continue
    const info: PartnerInfo = { name, role: 'Vendor', po: str(item.EBELN) || undefined, ...customsOf(item) }
    if (key(item.MBLNR)) lookup.byDoc.set(key(item.MBLNR), info)
    if (key(item.EBELN) && !lookup.byPo.has(key(item.EBELN))) lookup.byPo.set(key(item.EBELN), info)
  }

  for (const item of pengeluaranRaw) {
    const name = str(item.VENDOR)
    if (!name) continue
    const so = str(item.VBELN)
    const info: PartnerInfo = { name, role: 'Customer', so: so || undefined, po: str(item.EBELN) || undefined, ...customsOf(item) }
    if (key(item.MBLNR)) lookup.byDoc.set(key(item.MBLNR), info)
    if (key(item.VBELN)) lookup.bySo.set(key(item.VBELN), info)
    // Outgoing with a PO (e.g. return to vendor / subcon) — keep vendor names from Pemasukan first
    if (key(item.EBELN) && !lookup.byPo.has(key(item.EBELN))) lookup.byPo.set(key(item.EBELN), info)
  }

  return lookup
}

// ─── Storage location names & material types ─────────────────────────────────

export interface MasterLookup {
  slocNames: Map<string, string>     // "WERKS|LGORT" and "LGORT" → LGOBE
  materialTypes: Map<string, string> // normalized MATNR → MTBEZ
}

export function emptyMasterLookup(): MasterLookup {
  return { slocNames: new Map(), materialTypes: new Map() }
}

function addSloc(m: Map<string, string>, werks: unknown, lgort: unknown, name: unknown) {
  const l = str(lgort)
  const n = str(name)
  if (!l || !n) return
  const w = str(werks)
  if (w && !m.has(`${w}|${l}`)) m.set(`${w}|${l}`, n)
  if (!m.has(l)) m.set(l, n)
}

export function slocNameOf(lookup: MasterLookup, werks: string, lgort: string): string {
  const l = str(lgort)
  if (!l) return ''
  return lookup.slocNames.get(`${str(werks)}|${l}`) ?? lookup.slocNames.get(l) ?? ''
}

/** Rows from Stock INL (LGORT/LGOBE/MATNR/MTBEZ) and Material List (MATNR/MTBEZ). */
export function buildMasterLookup(stockRaw: any[], materialRaw: any[], extra: any[] = []): MasterLookup {
  const lookup = emptyMasterLookup()
  for (const item of stockRaw) {
    addSloc(lookup.slocNames, item.WERKS ?? item.PLANT, item.LGORT ?? item.LOCATION, item.LGOBE ?? item.NAMA_LOCATION)
    const t = str(item.MTBEZ)
    if (t && key(item.MATNR)) lookup.materialTypes.set(key(item.MATNR), t)
  }
  for (const item of [...materialRaw, ...extra]) {
    const t = str(item.MTBEZ)
    const m = key(item.MATNR ?? item.KODEBRG)
    if (t && m && !lookup.materialTypes.has(m)) lookup.materialTypes.set(m, t)
  }
  return lookup
}

export function applyPartners(rows: MutasiData[], lookup: PartnerLookup, master: MasterLookup = emptyMasterLookup()): MutasiData[] {
  return rows.map((row) => {
    const partner =
      lookup.byDoc.get(key(row.nomorDokMaterial)) ??
      (row.nomorPo ? lookup.byPo.get(key(row.nomorPo)) : undefined) ??
      (row.nomorSO ? lookup.bySo.get(key(row.nomorSO)) : undefined)

    const next: MutasiData = {
      ...row,
      storageLocationName: row.storageLocationName || slocNameOf(master, row.plant, row.storageLocation),
      destStorageLocationName: row.destStorageLocationName || slocNameOf(master, row.destPlant || row.plant, row.destStorageLocation),
      tipeMaterial: row.tipeMaterial || master.materialTypes.get(key(row.kodeBarang)) || '',
    }
    if (partner) {
      next.namaMitra = partner.name
      next.peranMitra = partner.role
      next.nomorSO = row.nomorSO || partner.so || ''
      // Outgoing rows: the customs report PO (EBELN) is the customer's order reference
      if (!next.nomorPo && partner.role === 'Customer' && partner.po) next.nomorPo = partner.po
      // Customs document only belongs to the exact material document it was reported on
      if (lookup.byDoc.get(key(row.nomorDokMaterial)) === partner) {
        next.jenisDokBC = partner.jenisDokBC
        next.nomorAju = partner.nomorAju
        next.nomorPendaftaran = partner.nomorPendaftaran
        next.tglPendaftaran = partner.tglPendaftaran
      }
    }
    return withRoute(next)
  })
}

// ─── Facility (fasilitas kepabeanan) material filter ─────────────────────────

/** Normalized codes of materials flagged "fasilitas" in the IT Inventory master, or null if unavailable. */
export async function fetchFacilityCodes(): Promise<Set<string> | null> {
  try {
    const res = await fetch('/api/material-facility')
    const json = await res.json()
    if (!json?.success || !json?.data) return null
    const codes = new Set<string>()
    Object.entries(json.data as Record<string, any>).forEach(([k, v]) => {
      if (v?.is_facility) codes.add(normalizeCode(k))
    })
    return codes
  } catch (err) {
    console.error('Gagal mengambil data fasilitas material:', err)
    return null
  }
}

export function filterFacilityRows(rows: MutasiData[], codes: Set<string> | null): MutasiData[] {
  if (!codes) return rows
  return rows.filter((r) => codes.has(normalizeCode(r.kodeBarang ?? '')))
}

// ─── Loader ──────────────────────────────────────────────────────────────────

const EMPTY_RANGE = [{ SIGN: '', OPTION: '', LOW: '', HIGH: '' }]

export function buildMb51Request(plant: string, start: string, end: string) {
  return {
    I_LAYOUT: '/INL_PROD',
    S_WERKS: [{ SIGN: 'I', OPTION: 'EQ', LOW: plant || 'IN01', HIGH: '' }],
    S_BUDAT: [
      {
        SIGN: 'I',
        OPTION: start && end && start !== end ? 'BT' : 'EQ',
        LOW: toSapDate(start),
        HIGH: start !== end ? toSapDate(end) : '',
      },
    ],
    S_LGORT: EMPTY_RANGE,
    S_CHARG: EMPTY_RANGE,
    S_BWART: EMPTY_RANGE,
  }
}

function buildCustomsRequest(plant: string, start: string, end: string) {
  return {
    I_TGLDOKPEND: [],
    I_JENISDOK: [],
    I_NAMABRG: '',
    I_PLANT: plant || '',
    I_PSTINGDATE: [{ SIGN: 'I', OPTION: 'BT', LOW: toSapDate(start), HIGH: toSapDate(end || start) }],
  }
}

function buildStockRequest(plant: string) {
  return {
    I_COMPANY_CODE: [{ SIGN: 'I', OPTION: 'EQ', LOW: 'INL0', HIGH: '' }],
    I_PLANT: [{ SIGN: 'I', OPTION: 'EQ', LOW: plant || 'IN01', HIGH: '' }],
    I_POSTING_DATE: [{ SIGN: 'I', OPTION: 'EQ', LOW: toSapDate(new Date().toISOString().split('T')[0]), HIGH: '' }],
  }
}

function buildMaterialListRequest(plant: string) {
  return {
    I_BEWFLG: 'X',
    I_WERKS: [{ SIGN: 'I', OPTION: 'EQ', LOW: plant || 'IN01', HIGH: '' }],
    I_MATNR: [{ SIGN: 'I', OPTION: 'BT', LOW: '000000000000000001', HIGH: '999999999999999999' }],
  }
}

export interface LoadMutasiOptions {
  plant: string
  start: string
  end: string
  csrfToken: string
  refreshToken: () => Promise<string | null>
  logout: (clearStorage?: boolean) => void
  onLogout?: () => void
}

// Storage location names and material types change rarely — keep them for the session.
const MASTER_TTL_MS = 30 * 60 * 1000
const masterCache = new Map<string, { at: number; stock: any[]; materials: any[] }>()

async function loadMasterRaw(opts: LoadMutasiOptions, common: any): Promise<{ stock: any[]; materials: any[]; didLogout: boolean }> {
  const plant = opts.plant || 'IN01'
  const hit = masterCache.get(plant)
  if (hit && Date.now() - hit.at < MASTER_TTL_MS) return { stock: hit.stock, materials: hit.materials, didLogout: false }

  const [stock, materials] = await Promise.all([
    fetchWithTokenRefresh<any[]>({ ...common, url: '/api/stok', body: buildStockRequest(plant) }),
    fetchWithTokenRefresh<any[]>({ ...common, url: '/api/setting/material-list', body: buildMaterialListRequest(plant) }),
  ])
  if (stock.didLogout || materials.didLogout) return { stock: [], materials: [], didLogout: true }

  const result = {
    stock: Array.isArray(stock.data) ? stock.data : [],
    materials: Array.isArray(materials.data) ? materials.data : [],
  }
  if (result.stock.length > 0 || result.materials.length > 0) masterCache.set(plant, { at: Date.now(), ...result })
  return { ...result, didLogout: false }
}

/**
 * Fetch MB51 movements and enrich them with partner names, customs documents,
 * storage location names and material types.
 * The enrichment calls run only AFTER MB51 succeeds, so a rejected SAP password
 * never fans out into several parallel failed logons. A failure of any lookup is
 * not fatal — rows are returned with codes only.
 */
export async function loadMutasiWithPartners(
  opts: LoadMutasiOptions
): Promise<{ rows: MutasiData[]; error: string | null; didLogout: boolean }> {
  const common = {
    method: 'POST' as const,
    csrfToken: opts.csrfToken,
    refreshToken: opts.refreshToken,
    logout: opts.logout,
    onLogout: opts.onLogout,
  }

  const mb51 = await fetchWithTokenRefresh<any[]>({
    ...common,
    url: '/api/mutasi',
    body: buildMb51Request(opts.plant, opts.start, opts.end),
  })
  if (mb51.didLogout) return { rows: [], error: null, didLogout: true }
  if (mb51.error) return { rows: [], error: mb51.error, didLogout: false }

  const rows = mapSapToMutasi(Array.isArray(mb51.data) ? mb51.data : [])
  if (rows.length === 0) return { rows, error: null, didLogout: false }

  try {
    const customsBody = buildCustomsRequest(opts.plant, opts.start, opts.end)
    const [masuk, keluar, master] = await Promise.all([
      fetchWithTokenRefresh<any[]>({ ...common, url: '/api/pemasukan', body: customsBody }),
      fetchWithTokenRefresh<any[]>({ ...common, url: '/api/pengeluaran', body: customsBody }),
      loadMasterRaw(opts, common).catch((err) => {
        console.error('Gagal mengambil nama lokasi / tipe material:', err)
        return { stock: [], materials: [], didLogout: false }
      }),
    ])
    if (masuk.didLogout || keluar.didLogout || master.didLogout) return { rows: [], error: null, didLogout: true }

    const masukRaw = Array.isArray(masuk.data) ? masuk.data : []
    const keluarRaw = Array.isArray(keluar.data) ? keluar.data : []
    const lookup = buildPartnerLookup(masukRaw, keluarRaw)
    const masterLookup = buildMasterLookup(master.stock, master.materials, [...masukRaw, ...keluarRaw])
    return { rows: applyPartners(rows, lookup, masterLookup), error: null, didLogout: false }
  } catch (err) {
    console.error('Gagal mengambil nama vendor/customer:', err)
    return { rows, error: null, didLogout: false }
  }
}
