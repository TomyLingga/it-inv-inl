// src/app/pengeluaran/config.ts

import { PengeluaranData, ColumnConfig, PageConfig } from '@/app/shared/types'

export const PENGELUARAN_COLUMNS: ColumnConfig<PengeluaranData>[] = [
  { key: 'no', label: 'NO', filterable: false, sortable: false, width: '8' },
  { key: 'postingDate', label: 'TGL KELUAR', filterable: true, sortable: true, width: '18' },
  { key: 'nomorDokMaterial', label: 'NO DOK GR', filterable: true, sortable: true, width: '20' },
  { key: 'jenisDokBC', label: 'DOC BC', filterable: true, sortable: true },
  { key: 'nomorDokAju', label: 'NO DOK AJU', filterable: true, sortable: true },
  { key: 'tglDokAju', label: 'TGL DOK AJU', filterable: true, sortable: true },
  { key: 'nomorDokPendaftaran', label: 'NO DOK PENDFTR', filterable: true, sortable: true },
  { key: 'tglDokPendaftaran', label: 'TGL DOK PENDFTR', filterable: true, sortable: true },
  { key: 'nomorPo', label: 'NO PO', filterable: true, sortable: true },
  { key: 'nomorSO', label: 'NO SO', filterable: true, sortable: true },
  {
    key: 'penerima',
    label: 'PENERIMA',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-slate-900 dark:text-slate-100 font-medium max-w-xs truncate block">{value}</span>
    ),
  },
  { key: 'kodeBarang', label: 'KODE MATERIAL', filterable: true, sortable: true },
  { key: 'kodeHS', label: 'KODE HS', filterable: true, sortable: true },
  {
    key: 'namaBarang',
    label: 'NAMA MATERIAL',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-slate-900 dark:text-slate-100 font-medium max-w-[200px] sm:max-w-md truncate block">{value}</span>
    ),
  },
  { key: 'tipeMaterial', label: 'TIPE MATERIAL', filterable: true, sortable: true },
  { key: 'grupMaterial', label: 'GRUP MATERIAL', filterable: true, sortable: true },
  { key: 'satuan', label: 'SATUAN', filterable: true, sortable: true, width: '10' },
  { key: 'jumlah', label: 'JUMLAH', filterable: false, sortable: true, width: '15' },
  { key: 'mataUangDokumen', label: 'MATA UANG DOK', filterable: true, sortable: true },
  { key: 'nilaiBarang', label: 'NILAI MATERIAL', filterable: false, sortable: true, width: '22' },
  { key: 'kursDokumen', label: 'KURS DOK', filterable: false, sortable: true },
  { key: 'mataUangLokal', label: 'MATA UANG LOKAL', filterable: true, sortable: true },
  { key: 'nilaiBarangLokal', label: 'NILAI MATERIAL (LOKAL)', filterable: false, sortable: true, width: '24' },
]

export const PENGELUARAN_CONFIG: PageConfig<PengeluaranData> = {
  title: 'Pengeluaran Material',
  icon: 'ArrowUpFromLine',
  description: 'Monitor laporan pengeluaran material per periode',
  columns: PENGELUARAN_COLUMNS,
  filterConfig: {
    showGlobalSearch: true,
    showDateFilter: true,
    showPlantFilter: true,
    showExportButton: true,
    dateLabel: 'Filter Tanggal Keluar',
  },
  exportConfig: {
    filename: 'Pengeluaran_Material',
    title: 'LAPORAN PENGELUARAN MATERIAL',
    formats: ['excel', 'pdf'],
  },
  tableConfig: {
    showFooter: true,
    footerCalculations: [
      {
        column: 'jumlah',
        type: 'sum',
        label: 'Total Jumlah',
      },
      {
        column: 'nilaiBarang',
        type: 'sum',
        label: 'Total Nilai Dokumen',
      },
      {
        column: 'nilaiBarangLokal',
        type: 'sum',
        label: 'Total Nilai Lokal',
      },
    ],
    emptyStateMessage: 'Tidak ada data pengeluaran ditemukan',
  },
}
