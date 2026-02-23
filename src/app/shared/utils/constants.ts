// src/app/shared/utils/constants.ts

export const PLANT_OPTIONS = [
  { value: 'IN01', label: 'IN01 - Plant Sei Mangkei' },
  { value: 'IN02', label: 'IN02 - Plant Surabaya' }
]

// export const JENIS_DOK_BC_OPTIONS = [
//   { value: '', label: 'Semua Jenis' },
//   { value: 'SP2', label: 'SP2' },
//   { value: 'PIB', label: 'PIB' },
//   { value: 'BC23', label: 'BC23' },
//   { value: 'BC25', label: 'BC25' }
// ]

// export const SATUAN_OPTIONS = [
//   { value: '', label: 'Semua Satuan' },
//   { value: 'PCS', label: 'PCS' },
//   { value: 'SET', label: 'SET' },
//   { value: 'UNIT', label: 'UNIT' },
//   { value: 'KG', label: 'KG' },
//   { value: 'LITER', label: 'LITER' }
// ]

export const DEFAULT_SORT_CONFIG = {
  key: 'postingDate',
  direction: 'desc' as const
}

export const EXPORT_FILENAME_PREFIX = {
  pemasukan: 'Pemasukan_Barang',
  pengeluaran: 'Pengeluaran_Barang',
  stok: 'Stok_Barang'
}

export const EXPORT_TITLE = {
  pemasukan: 'LAPORAN PEMASUKAN BARANG',
  pengeluaran: 'LAPORAN PENGELUARAN BARANG',
  stok: 'LAPORAN STOK BARANG'
}
