// src/app/stok/config.tsx

import { StokData, ColumnConfig, PageConfig } from '@/app/shared/types'

export const STOK_COLUMNS: ColumnConfig<StokData>[] = [
  { key: 'no', label: 'No', filterable: false, sortable: false, width: '10' },
  { key: 'kodeBarang', label: 'Kode Barang', filterable: true, sortable: true },
  { key: 'batch', label: 'Batch', filterable: true, sortable: true, width: '18' },
  { key: 'kodeHS', label: 'Kode HS', filterable: true, sortable: true },
  {
    key: 'namaBarang',
    label: 'Nama Barang',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-slate-900 dark:text-slate-100 max-w-md truncate block font-medium">
        {value}
      </span>
    ),
  },
  {
    key: 'lokasi',
    label: 'Lokasi',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/40 px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap inline-block max-w-[160px] truncate">
        {value || '-'}
      </span>
    ),
  },
  {
    key: 'lokasiId',
    label: 'Lokasi ID',
    filterable: true,
    sortable: true,
    width: '12',
    render: (value) => (
      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
        {value || '-'}
      </span>
    ),
  },
  { key: 'satuan', label: 'Satuan', filterable: true, sortable: true, width: '12' },
  { key: 'jumlah', label: 'Qty Stok', filterable: false, sortable: true, width: '15' },
  { key: 'nilaiBarang', label: 'Nilai Stok', filterable: false, sortable: true, width: '25' },
  { key: 'currency', label: 'Mata Uang', filterable: true, sortable: true, width: '14' },
]

export const STOK_CONFIG: PageConfig<StokData> = {
  title: 'Stok Barang',
  icon: 'Package',
  description: 'Monitor stok barang di gudang per tanggal',
  columns: STOK_COLUMNS,
  filterConfig: {
    showGlobalSearch: true,
    showDateFilter: false,
    showPlantFilter: true,
    showExportButton: true,
    dateLabel: 'Tanggal Stok',
  },
  exportConfig: {
    filename: 'Stok_Barang',
    title: 'LAPORAN STOK BARANG',
    formats: ['excel', 'pdf'],
  },
  tableConfig: {
    showFooter: true,
    footerCalculations: [
      {
        column: 'jumlah',
        type: 'sum',
        label: 'Total Qty',
      },
      {
        column: 'nilaiBarang',
        type: 'sum',
        label: 'Total Nilai',
      },
    ],
    emptyStateMessage: 'Tidak ada data stok ditemukan',
  },
}
