// src/app/pengeluaran/config.ts

import { PengeluaranData, ColumnConfig, PageConfig } from '@/app/shared/types'

export const PENGELUARAN_COLUMNS: ColumnConfig<PengeluaranData>[] = [
  { key: 'no', label: 'No', filterable: false, sortable: false, width: '10' },
  { key: 'postingDate', label: 'Posting Date', filterable: true, sortable: true, width: '22' },
  { key: 'jenisDokBC', label: 'Jenis Dok BC', filterable: true, sortable: true },
  { key: 'nomorDokAju', label: 'Nomor Dok Aju', filterable: true, sortable: true },
  { key: 'tglDokAju', label: 'Tgl Dok Aju', filterable: false, sortable: true },
  { key: 'nomorDokPendaftaran', label: 'Nomor Dok Pendftr', filterable: true, sortable: true },
  { key: 'tglDokPendaftaran', label: 'Tgl Dok Pendftr', filterable: false, sortable: true },
  { key: 'nomorPo', label: 'Nomor PO', filterable: true, sortable: true },
  { 
    key: 'penerima',  // ← BERBEDA dari Pemasukan (pengirim)
    label: 'Penerima', 
    filterable: true, 
    sortable: true,
    render: (value) => (
      <span className='text-gray-900 max-w-xs truncate block'>{value}</span>
    )
  },
  { key: 'kodeBarang', label: 'Kode Barang', filterable: true, sortable: true },
  { key: 'kodeHS', label: 'Kode HS', filterable: true, sortable: true },
  { 
    key: 'namaBarang', 
    label: 'Nama Barang', 
    filterable: true, 
    sortable: true,
    render: (value) => (
      <span className='text-gray-900 max-w-[200px] sm:max-w-md truncate block'>{value}</span>
    )
  },
  { key: 'satuan', label: 'Satuan', filterable: true, sortable: true, width: '12' },
  { key: 'jumlah', label: 'Jumlah', filterable: false, sortable: true, width: '15' },
  { key: 'nilaiBarang', label: 'Nilai Barang', filterable: false, sortable: true, width: '28' },
]

export const PENGELUARAN_CONFIG: PageConfig<PengeluaranData> = {
  title: 'Pengeluaran Barang',
  icon: '📤',
  description: 'Kelola data barang keluar dari gudang',
  columns: PENGELUARAN_COLUMNS,
  filterConfig: {
    showGlobalSearch: true,
    showDateFilter: true,
    showPlantFilter: true,
    showExportButton: true,
    dateLabel: "Filter Tanggal Dokumen Pendaftaran"
  },
  exportConfig: {
    filename: 'Pengeluaran_Barang',
    title: 'LAPORAN PENGELUARAN BARANG',
    formats: ['excel', 'pdf']
  },
  tableConfig: {
    showFooter: true,
    footerCalculations: [
      {
        column: 'nilaiBarang',
        type: 'sum',
        label: 'Total Nilai'
      }
    ],
    emptyStateMessage: 'Tidak ada data pengeluaran ditemukan',
    emptyStateIcon: '📦'
  }
}
