// src/app/shared/types/index.ts

// ============================================================================
// GENERIC TYPES - Bisa dipakai untuk Pemasukan, Pengeluaran, Stok
// ============================================================================

export interface BaseData {
  no: number
  postingDate: string
  [key: string]: any // Allow dynamic properties
}

export interface DateRange {
  start: string
  end: string
}

export interface SortConfig<T = any> {
  key: keyof T
  direction: 'asc' | 'desc'
}

export interface ColumnConfig<T = any> {
  key: keyof T
  label: string
  filterable: boolean
  sortable: boolean
  width?: string
  render?: (value: any, row: T) => React.ReactNode
  className?: string
  /** Sticky column on horizontal scroll (identity columns on wide tables). */
  sticky?: 'left'
  /** Fixed pixel width for a sticky column, used to compute left offsets. */
  stickyWidth?: number
  /** Explicit cell alignment override for the generic (non-render) formatter. */
  align?: 'left' | 'right' | 'center'
}

/** Grouping band rendered above the column header row (wide tables). */
export interface ColumnGroup {
  label: string
  span: number
  icon?: string
}

/** Row density for tables — persisted per view. */
export type TableDensity = 'comfortable' | 'compact'

export interface FilterConfig {
  showGlobalSearch?: boolean
  showDateFilter?: boolean
  showPlantFilter?: boolean
  showExportButton?: boolean
  dateLabel?: string
  customFilters?: CustomFilter[]
}

export interface CustomFilter {
  key: string
  label: string
  type: 'select' | 'text' | 'date'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export type ExportFormat = 'excel' | 'pdf'

export interface ExportConfig {
  filename: string
  title: string
  formats: ExportFormat[]
}

export interface TableConfig<T = any> {
  showFooter?: boolean
  footerCalculations?: {
    column: keyof T
    type: 'sum' | 'count' | 'avg'
    label: string
  }[]
  emptyStateMessage?: string
  emptyStateIcon?: string
}

// ============================================================================
// MODULE-SPECIFIC TYPES
// ============================================================================

// PEMASUKAN
export interface PemasukanData extends BaseData {
  nomorDokMaterial: string   // MBLNR
  jenisDokBC: string
  nomorDokAju: string
  tglDokAju: string
  nomorDokPendaftaran: string
  tglDokPendaftaran: string
  nomorPo: string
  pengirim: string
  kodeBarang: string
  kodeHS: string
  namaBarang: string
  tipeMaterial: string       // MTBEZ - Deskripsi Material Type
  grupMaterial: string       // WGBEZ - Deskripsi Material Group
  satuan: string
  jumlah: number
  nilaiBarang: number        // NILAIBRG (Nilai Barang Dokumen)
  mataUangDokumen: string    // DOC_WAERS
  mataUangLokal: string      // WAERS
  kursDokumen: number        // WKURS
  nilaiBarangLokal: number   // NILAIBRG * WKURS
  // plant?: string
}

// PENGELUARAN
export interface PengeluaranData extends BaseData {
  nomorDokMaterial: string   // MBLNR
  jenisDokBC: string
  nomorDokAju: string
  tglDokAju: string
  nomorDokPendaftaran: string
  tglDokPendaftaran: string
  nomorPo: string
  nomorSO: string       // VBELN
  penerima: string  // ← Berbeda dari Pemasukan (pengirim → penerima)
  kodeBarang: string
  kodeHS: string
  namaBarang: string
  tipeMaterial: string       // MTBEZ - Deskripsi Material Type
  grupMaterial: string       // WGBEZ - Deskripsi Material Group
  satuan: string
  jumlah: number
  nilaiBarang: number        // NILAIBRG (Nilai Barang Dokumen)
  mataUangDokumen: string    // DOC_WAERS
  mataUangLokal: string      // WAERS
  kursDokumen: number        // WKURS
  nilaiBarangLokal: number   // NILAIBRG * WKURS
  // plant?: string
}

// STOK
export interface StokBatchDetail {
  batch: string
  jumlah: number
  nilaiBarang: number
}

export interface StokData extends BaseData {
  startDate: string      // START_DATE
  endDate: string        // END_DATE
  batch: string          // CHARG
  kodeBarang: string     // MATNR
  kodeHS: string         // HSCODE
  namaBarang: string     // MAKTX
  tipeMaterial: string   // MTBEZ - Deskripsi Material Type
  grupMaterial: string   // WGBEZ - Deskripsi Material Group
  lokasi: string         // LGOBE
  lokasiId: string       // LGORT
  satuan: string         // MEINS
  jumlah: number         // END_STOCK_QTY
  nilaiBarang: number    // END_STOCK_VALUE
  currency: string       // WAERS
  groupKey?: string
  batchesCount?: number
  batchesList?: StokBatchDetail[]
}

// MATERIAL LIST
export interface MaterialListData extends BaseData {
  matnr: string          // MATNR - Nomor Material
  maktx: string          // MAKTX - Deskripsi Material
  werks: string          // WERKS - Kode Plant
  bwtar: string          // BWTAR - Valuation Type
  meins: string          // MEINS - Base Unit of Measure
  mtart: string          // MTART - Material Type
  mtbez: string          // MTBEZ - Deskripsi Material Type
  matkl: string          // MATKL - Material Group
  wgbez: string          // WGBEZ - Deskripsi Material Group
  isFacility: boolean    // true = Fasilitas Kepabeanan, false = Non-Fasilitas
  facilityType: 'fasilitas' | 'non_fasilitas'
}

// PO LIST (DISPLAY BEA CUKAI)
export interface PoListData extends BaseData {
  mandt: string          // MANDT - Client (e.g. 800)
  ebeln: string          // EBELN - Nomor PO
  jenisDok: string       // ZJENISDOK - Jenis Dokumen BC (e.g. BC 4.1)
  noAju: string          // ZNOAJU - Nomor Pengajuan
  tglAju: string         // ZTGL_AJU - Tanggal Pengajuan
  noPend: string         // ZNOPENDT - Nomor Pendaftaran
  tglPend: string        // ZTGL_PENDT - Tanggal Pendaftaran
  kppbc: 'KPPBC Pematangsiantar' | 'KPPBC Kuala Tanjung' | string
}

// MUTASI (MB51 GOODS MOVEMENT)
export interface MutasiData extends BaseData {
  docDate: string        // BLDAT - Document Date
  entryDate: string      // CPUDT - Tanggal entry di SAP
  entryTime: string      // CPUTM - Waktu entry di SAP
  nomorDokMaterial: string // MBLNR - Nomor Material Document
  tahunDokumen: number   // MJAHR - Tahun fiskal Material Document
  itemDokumen: number    // ZEILE - Nomor item Material Document
  movementType: string   // BWART - Movement Type (101, 102, 201, 261, etc.)
  movementText: string   // BTEXT - Deskripsi Movement Type
  transType: string      // VGART - Jenis Transaksi (WE, WA, etc.)
  shkzg: 'S' | 'H' | string // S = Masuk/Debit (+), H = Keluar/Kredit (-)
  arahMutasi: string     // Masuk / Keluar
  asalMutasi: string     // Asal barang (Vendor, SLoc asal, Produksi, dll)
  tujuanMutasi: string   // Tujuan pergerakan (Gudang, Produksi, Cost Center, dll)
  alurMutasi: string     // Format visual ringkas: [Asal] ➔ [Tujuan]
  kodeBarang: string     // MATNR - Nomor Material SAP
  namaBarang: string     // MAKTX - Nama Material
  batch: string          // CHARG - Nomor Batch Material
  valuationType: string  // BWTAR - Valuation Type
  plant: string          // WERKS - Kode Plant
  plantName: string      // NAME1 - Nama Plant
  storageLocation: string // LGORT - Storage Location
  destPlant: string      // UMWRK - Plant Tujuan (Transfer)
  destStorageLocation: string // UMLGO - Storage Location Tujuan
  jumlah: number         // MENGE / ERFMG - Kuantitas
  satuan: string         // MEINS / ERFME - Satuan Unit
  nilaiMutasi: number    // DMBTR - Nilai Transaksi Mata Uang Lokal
  mataUang: string       // WAERS - Mata Uang (IDR)
  nomorPo: string        // EBELN - Nomor PO (jika ada)
  itemPo: number         // EBELP - Nomor Item PO
  kodeVendor: string     // LIFNR - Kode Vendor
  customer: string       // KUNNR - Kode Pelanggan / Konsumen
  penerimaBarang: string // WEMPF - Referensi Penerima Barang
  orderNo: string        // AUFNR - Production / Internal Order
  costCenter: string     // KOSTL - Cost Center
  userSap: string        // USNAM - User SAP Pembuat
  headerText: string     // BKTXT - Document Header Text
  itemText: string       // SGTXT - Item Text
  keterangan: string     // Ringkasan keterangan (SGTXT / BKTXT)
  grupMaterial: string   // ZZMATKL - Material Group
  namaGrupMaterial: string // ZZWGBEZ - Deskripsi Material Group
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DataType = PemasukanData | PengeluaranData | StokData | MaterialListData | PoListData | MutasiData

export interface PageConfig<T = any> {
  title: string
  icon: string
  description: string
  columns: ColumnConfig<T>[]
  filterConfig: FilterConfig
  exportConfig: ExportConfig
  tableConfig?: TableConfig<T>
  /** Optional grouping bands rendered above the header (wide tables). Sum of spans must equal columns.length. */
  columnGroups?: ColumnGroup[]
}

