// src/app/setting/po-list/config.tsx

import { PoListData, ColumnConfig, PageConfig } from '@/app/shared/types'

export const PO_COLUMNS: ColumnConfig<PoListData>[] = [
  { key: 'no', label: 'No', filterable: false, sortable: false, width: '6' },
  {
    key: 'ebeln',
    label: 'Nomor PO',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
        {value || '-'}
      </span>
    ),
  },
  {
    key: 'jenisDok',
    label: 'Jenis Dokumen BC',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-purple-700 bg-purple-50 px-2.5 py-1 rounded text-xs font-bold border border-purple-200">
        {value || '-'}
      </span>
    ),
  },
  {
    key: 'noAju',
    label: 'Nomor Aju',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
        {value || '-'}
      </span>
    ),
  },
  { key: 'tglAju', label: 'Tanggal Aju', filterable: true, sortable: true },
  {
    key: 'noPend',
    label: 'No Pendaftaran',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
        {value || '-'}
      </span>
    ),
  },
  { key: 'tglPend', label: 'Tgl Pendaftaran', filterable: true, sortable: true },
]

export const PO_CONFIG: PageConfig<PoListData> = {
  title: 'PO List (Display Bea Cukai)',
  icon: '📄',
  description: 'Daftar Purchase Order dan Dokumen Bea Cukai SAP',
  columns: PO_COLUMNS,
  filterConfig: {
    showGlobalSearch: true,
    showDateFilter: false,
    showPlantFilter: false,
    showExportButton: true,
  },
  exportConfig: {
    filename: 'PO_List_BeaCukai_SAP',
    title: 'LAPORAN PO LIST DISPLAY BEA CUKAI SAP',
    formats: ['excel', 'pdf'],
  },
  tableConfig: {
    showFooter: true,
    footerCalculations: [
      {
        column: 'ebeln',
        type: 'count',
        label: 'Total Dokumen PO',
      },
    ],
  },
}

