// src/app/stok/config.tsx

import { StokData, ColumnConfig, PageConfig } from '@/app/shared/types'

export const STOK_COLUMNS: ColumnConfig<StokData>[] = [
  { key: 'no', label: 'NO', filterable: false, sortable: false, width: '8' },
  { key: 'kodeBarang', label: 'KODE MATERIAL', filterable: true, sortable: true },
  { key: 'kodeHS', label: 'KODE HS', filterable: true, sortable: true },
  {
    key: 'namaBarang',
    label: 'NAMA MATERIAL',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-slate-900 dark:text-slate-100 max-w-md truncate block font-medium">
        {value}
      </span>
    ),
  },
  { key: 'tipeMaterial', label: 'TIPE MATERIAL', filterable: true, sortable: true },
  { key: 'grupMaterial', label: 'GRUP MATERIAL', filterable: true, sortable: true },
  { key: 'batch', label: 'KODE BATCH', filterable: true, sortable: true, width: '16' },
  {
    key: 'lokasiId',
    label: 'KODE LOKASI',
    filterable: true,
    sortable: true,
    width: '12',
    render: (value) => (
      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
        {value || '-'}
      </span>
    ),
  },
  {
    key: 'lokasi',
    label: 'LOKASI',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/40 px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap inline-block max-w-[160px] truncate">
        {value || '-'}
      </span>
    ),
  },
  { key: 'satuan', label: 'SATUAN', filterable: true, sortable: true, width: '10' },
  { key: 'jumlah', label: 'JUMLAH STOK', filterable: false, sortable: true, width: '15' },
  { key: 'currency', label: 'MATA UANG', filterable: true, sortable: true, width: '12' },
  { key: 'nilaiBarang', label: 'NILAI STOK', filterable: false, sortable: true, width: '22' },
]

export const STOK_CONFIG: PageConfig<StokData> = {
  title: 'Stok Material',
  icon: 'Package',
  description: 'Monitor stok material di gudang per tanggal',
  columns: STOK_COLUMNS,
  filterConfig: {
    showGlobalSearch: true,
    showDateFilter: false,
    showPlantFilter: true,
    showExportButton: true,
    dateLabel: 'Tanggal Stok',
  },
  exportConfig: {
    filename: 'Stok_Material',
    title: 'LAPORAN STOK MATERIAL',
    formats: ['excel', 'pdf'],
  },
  tableConfig: {
    showFooter: true,
    footerCalculations: [
      {
        column: 'jumlah',
        type: 'sum',
        label: 'Total Qty Stok',
      },
      {
        column: 'nilaiBarang',
        type: 'sum',
        label: 'Total Nilai Stok',
      },
    ],
    emptyStateMessage: 'Tidak ada data stok ditemukan',
  },
}
