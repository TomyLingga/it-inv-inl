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
}

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
  satuan: string
  jumlah: number
  nilaiBarang: number
  // plant?: string
}

// PENGELUARAN
export interface PengeluaranData extends BaseData {
  jenisDokBC: string
  nomorDokAju: string
  tglDokAju: string
  nomorDokPendaftaran: string
  tglDokPendaftaran: string
  nomorPo: string
  penerima: string  // ← Berbeda dari Pemasukan (pengirim → penerima)
  kodeBarang: string
  kodeHS: string
  namaBarang: string
  satuan: string
  jumlah: number
  nilaiBarang: number
  // plant?: string
}

// STOK
export interface StokData extends BaseData {
  kodeBarang: string
  kodeHS: string
  namaBarang: string
  lokasi: string
  lokasiId: string
  satuan: string
  jumlah: number
  nilaiBarang: number
  // plant?: string
}


// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DataType = PemasukanData | PengeluaranData | StokData

export interface PageConfig<T = any> {
  title: string
  icon: string
  description: string
  columns: ColumnConfig<T>[]
  filterConfig: FilterConfig
  exportConfig: ExportConfig
  tableConfig?: TableConfig<T>
}
