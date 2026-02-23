// src/app/stok/config.tsx

import { StokData, ColumnConfig, PageConfig } from '@/app/shared/types'

export const STOK_COLUMNS: ColumnConfig<StokData>[] = [
  { key: 'no',          label: 'No',           filterable: false, sortable: false, width: '10' },
  { key: 'postingDate', label: 'Posting Date',  filterable: false, sortable: true,  width: '22' },
  { key: 'kodeBarang',  label: 'Kode Barang',   filterable: true,  sortable: true },
  { key: 'kodeHS',      label: 'Kode HS',       filterable: true,  sortable: true },
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
  { key: 'lokasiId',      label: 'Lokasi ID',        filterable: true,  sortable: true,  width: '12' },
  { key: 'satuan',      label: 'Satuan',        filterable: true,  sortable: true,  width: '12' },
  { key: 'jumlah',      label: 'Jumlah',        filterable: false, sortable: true,  width: '15' },
  { key: 'nilaiBarang', label: 'Nilai Barang',   filterable: false, sortable: true,  width: '28' },
]

export const STOK_CONFIG: PageConfig<StokData> = {
  title: 'Stok Barang',
  icon: '📊',
  description: 'Monitor stok barang di gudang',
  columns: STOK_COLUMNS,
  filterConfig: {
    showGlobalSearch: true,
    showDateFilter: true,
    showPlantFilter: true,
    showExportButton: true,
    dateLabel: 'Filter Tanggal Posting Date',
  },
  exportConfig: {
    filename: 'Stok_Barang',
    title: 'LAPORAN STOK BARANG',
    formats: ['excel', 'pdf'],
  },
  tableConfig: {
    showFooter: true,
    footerCalculations: [
      { column: 'nilaiBarang', type: 'sum', label: 'Total Nilai'  },
    ],
    emptyStateMessage: 'Tidak ada data stok ditemukan',
    emptyStateIcon: '📦',
  },
}
