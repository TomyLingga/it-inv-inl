// src/app/mutasi/mutasiData.ts
//
// Loading + mapping of MB51 goods movements (shared by the Mutasi and
// Traceability pages), enriched with the vendor / customer name taken from the
// Pemasukan (incoming) and Pengeluaran (outgoing) customs reports — MB51 itself
// only carries the LIFNR / KUNNR codes.

import { MutasiData } from '@/app/shared/types'
import { normalizeCode } from '@/app/shared/utils/filterUtils'
import { fetchWithTokenRefresh } from '@/lib/fetchWithTokenRefresh'

// ─── Format date for SAP: YYYYMMDD ───────────────────────────────────────────
export function toSapDate(isoDate: string): string {
  return isoDate ? isoDate.replace(/-/g, '') : ''
}

function formatLocation(lgort: string, werks: string): string {
  if (lgort && werks) return `Gudang ${lgort} (${werks})`
  if (lgort) return `Gudang ${lgort}`
  if (werks) return `Plant ${werks}`
  return 'Gudang'
}

function vendorLabel(row: MutasiData): string {
  const name = row.peranMitra === 'Vendor' ? row.namaMitra : ''
  if (row.nomorPo) return name ? `${name} (PO ${row.nomorPo})` : `Vendor (PO ${row.nomorPo})`
  if (name) return name
  return row.kodeVendor ? `Vendor (${row.kodeVendor})` : ''
}

function customerLabel(row: MutasiData): string {
  const name = row.peranMitra === 'Customer' ? row.namaMitra : ''
  const ref = row.nomorSO ? `SO ${row.nomorSO}` : row.customer ? row.customer : ''
  if (name) return ref ? `${name} (${ref})` : name
  return row.customer ? `Pelanggan (${row.customer})` : row.nomorSO ? `Pelanggan (SO ${row.nomorSO})` : ''
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

  const curLoc = formatLocation(lgort, werks)
  const destLoc = umlgo
    ? (umwrk && umwrk !== werks ? `Gudang ${umlgo} (${umwrk})` : `Gudang ${umlgo}`)
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
  // 301, 311, 303, 305, 309, 313, 315 - Transfer Posting (309 = konversi material/batch)
  else if (['301', '311', '303', '305', '309', '310', '313', '315'].includes(bwart)) {
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
      destPlant: item.UMWRK ?? '',
      destStorageLocation: item.UMLGO ?? '',
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
    }
    return withRoute(row)
  })
}

// ─── Vendor / Customer lookup (from Pemasukan & Pengeluaran) ─────────────────

interface PartnerInfo {
  name: string
  role: 'Vendor' | 'Customer'
  so?: string
}

export interface PartnerLookup {
  byDoc: Map<string, PartnerInfo>  // MBLNR → partner
  byPo: Map<string, PartnerInfo>   // EBELN → partner
  bySo: Map<string, PartnerInfo>   // VBELN → partner
}

const key = (v: unknown) => normalizeCode((v ?? '').toString())

export function buildPartnerLookup(pemasukanRaw: any[], pengeluaranRaw: any[]): PartnerLookup {
  const lookup: PartnerLookup = { byDoc: new Map(), byPo: new Map(), bySo: new Map() }

  for (const item of pemasukanRaw) {
    const name = (item.VENDOR ?? '').toString().trim()
    if (!name) continue
    const info: PartnerInfo = { name, role: 'Vendor' }
    if (key(item.MBLNR)) lookup.byDoc.set(key(item.MBLNR), info)
    if (key(item.EBELN)) lookup.byPo.set(key(item.EBELN), info)
  }

  for (const item of pengeluaranRaw) {
    const name = (item.VENDOR ?? '').toString().trim()
    if (!name) continue
    const so = (item.VBELN ?? '').toString().trim()
    const info: PartnerInfo = { name, role: 'Customer', so: so || undefined }
    if (key(item.MBLNR)) lookup.byDoc.set(key(item.MBLNR), info)
    if (key(item.VBELN)) lookup.bySo.set(key(item.VBELN), info)
    // Outgoing with a PO (e.g. return to vendor / subcon) — keep vendor names from Pemasukan first
    if (key(item.EBELN) && !lookup.byPo.has(key(item.EBELN))) lookup.byPo.set(key(item.EBELN), info)
  }

  return lookup
}

export function applyPartners(rows: MutasiData[], lookup: PartnerLookup): MutasiData[] {
  return rows.map((row) => {
    const partner =
      lookup.byDoc.get(key(row.nomorDokMaterial)) ??
      (row.nomorPo ? lookup.byPo.get(key(row.nomorPo)) : undefined) ??
      (row.nomorSO ? lookup.bySo.get(key(row.nomorSO)) : undefined)
    if (!partner) return row
    return withRoute({
      ...row,
      namaMitra: partner.name,
      peranMitra: partner.role,
      nomorSO: row.nomorSO || partner.so || '',
    })
  })
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

export interface LoadMutasiOptions {
  plant: string
  start: string
  end: string
  csrfToken: string
  refreshToken: () => Promise<string | null>
  logout: (clearStorage?: boolean) => void
  onLogout?: () => void
}

/**
 * Fetch MB51 movements and enrich them with vendor/customer names.
 * Pemasukan & Pengeluaran are fetched only AFTER MB51 succeeds, so a rejected
 * SAP password never fans out into several parallel failed logons.
 * A failure of the name lookup is not fatal — rows are returned without names.
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
    const [masuk, keluar] = await Promise.all([
      fetchWithTokenRefresh<any[]>({ ...common, url: '/api/pemasukan', body: customsBody }),
      fetchWithTokenRefresh<any[]>({ ...common, url: '/api/pengeluaran', body: customsBody }),
    ])
    if (masuk.didLogout || keluar.didLogout) return { rows: [], error: null, didLogout: true }

    const lookup = buildPartnerLookup(
      Array.isArray(masuk.data) ? masuk.data : [],
      Array.isArray(keluar.data) ? keluar.data : []
    )
    return { rows: applyPartners(rows, lookup), error: null, didLogout: false }
  } catch (err) {
    console.error('Gagal mengambil nama vendor/customer:', err)
    return { rows, error: null, didLogout: false }
  }
}
