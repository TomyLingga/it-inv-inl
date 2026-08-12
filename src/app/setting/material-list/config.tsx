// src/app/setting/material-list/config.tsx

import { MaterialListData, ColumnConfig, PageConfig } from '@/app/shared/types'

export const MATERIAL_COLUMNS: ColumnConfig<MaterialListData>[] = [
  { key: 'no', label: 'No', filterable: false, sortable: false, width: '8' },
  {
    key: 'matnr',
    label: 'Nomor Material',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-200">
        {value}
      </span>
    ),
  },
  {
    key: 'isFacility',
    label: 'Fasilitas Kepabeanan',
    filterable: true,
    sortable: true,
    render: (value, row) => (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center space-x-1.5 ${
          row.isFacility
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-gray-200 text-gray-700 border border-gray-300'
        }`}
      >
        <span>{row.isFacility ? '🟢 Fasilitas' : '⚪ Non-Fasilitas'}</span>
      </span>
    ),
  },
  {
    key: 'maktx',
    label: 'Deskripsi Material',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-gray-900 font-medium max-w-xs truncate block" title={value}>
        {value || '-'}
      </span>
    ),
  },
  {
    key: 'werks',
    label: 'Plant',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold">
        {value || '-'}
      </span>
    ),
  },
  { key: 'bwtar', label: 'Valuation Type', filterable: true, sortable: true },
  { key: 'meins', label: 'Satuan (UoM)', filterable: true, sortable: true },
  { key: 'mtart', label: 'Kode Type', filterable: true, sortable: true },
  {
    key: 'mtbez',
    label: 'Material Type',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-xs font-medium">
        {value || '-'}
      </span>
    ),
  },
  { key: 'matkl', label: 'Material Group', filterable: true, sortable: true },
  { key: 'wgbez', label: 'Deskripsi Group', filterable: true, sortable: true },
]


export const MATERIAL_CONFIG: PageConfig<MaterialListData> = {
  title: 'Material List',
  icon: '📦',
  description: 'Daftar master material dan spesifikasi SAP',
  columns: MATERIAL_COLUMNS,
  filterConfig: {
    showGlobalSearch: true,
    showDateFilter: false,
    showPlantFilter: true,
    showExportButton: true,
  },
  exportConfig: {
    filename: 'Material_List_SAP',
    title: 'DAFTAR MATERIAL LIST SAP',
    formats: ['excel', 'pdf'],
  },
  tableConfig: {
    showFooter: true,
    footerCalculations: [
      {
        column: 'matnr',
        type: 'count',
        label: 'Total Material',
      },
    ],
  },
}
