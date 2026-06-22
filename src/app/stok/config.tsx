// src/app/stok/config.tsx

import { StokData, ColumnConfig, PageConfig } from '@/app/shared/types'

export const STOK_COLUMNS: ColumnConfig<StokData>[] = [
  { key: 'no',          label: 'No',             filterable: false, sortable: false, width: '10' },
  { key: 'kodeBarang',  label: 'Kode Barang',      filterable: true,  sortable: true },
  { key: 'batch',       label: 'Batch',            filterable: true,  sortable: true,  width: '18' },
  { key: 'kodeHS',      label: 'Kode HS',          filterable: true,  sortable: true },
  {
    key: 'namaBarang',
    label: 'Nama Barang',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className='text-gray-900 max-w-md truncate block'>{value}</span>
    ),
  },
  {
    key: 'lokasi',
    label: 'Lokasi',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className='text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap block max-w-[160px] truncate'>
        {value || '-'}
      </span>
    ),
  },
  { key: 'lokasiId',    label: 'Lokasi ID',        filterable: true,  sortable: true,  width: '12' },
  { key: 'satuan',      label: 'Satuan',           filterable: true,  sortable: true,  width: '12' },
  { key: 'jumlah',      label: 'Qty Stok',         filterable: false, sortable: true,  width: '15' },
  { key: 'nilaiBarang', label: 'Nilai Stok',       filterable: false, sortable: true,  width: '25' },
  { key: 'currency',    label: 'Mata Uang',        filterable: true,  sortable: true,  width: '14' },
]

export const STOK_CONFIG: PageConfig<StokData> = {
  title: 'Stok Barang',
  icon: '📊',
  description: 'Monitor stok barang di gudang per tanggal',
  columns: STOK_COLUMNS,
  filterConfig: {
    showGlobalSearch: true,
    showDateFilter: false,   // ← Digantikan oleh single date picker di page
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
    emptyStateIcon: '📦',
  },
}
