// src/app/mutasi/config.tsx

import React from 'react'
import { MutasiData, ColumnConfig, PageConfig } from '@/app/shared/types'
import { ArrowDownLeft, ArrowUpRight, ArrowRight } from 'lucide-react'

export const MUTASI_COLUMNS: ColumnConfig<MutasiData>[] = [
  { key: 'no', label: 'NO', filterable: false, sortable: false, width: '8' },
  { key: 'postingDate', label: 'TGL POSTING', filterable: true, sortable: true, width: '18' },
  {
    key: 'nomorDokMaterial',
    label: 'NO DOKUMEN',
    filterable: true,
    sortable: true,
    width: '20',
    render: (value, row) => (
      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
        {value}{row.itemDokumen ? ` / ${row.itemDokumen}` : ''}
      </span>
    ),
  },
  {
    key: 'arahMutasi',
    label: 'ARAH MUTASI',
    filterable: true,
    sortable: true,
    width: '18',
    render: (value, row) => {
      const isMasuk = row.shkzg === 'S' || value === 'Masuk'
      return (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold border ${
            isMasuk
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/40'
          }`}
        >
          {isMasuk ? (
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          )}
          <span>{isMasuk ? 'Masuk (Receipt)' : 'Keluar (Issue)'}</span>
        </span>
      )
    },
  },
  {
    key: 'alurMutasi',
    label: 'ALUR MUTASI (DARI ➔ KE)',
    filterable: true,
    sortable: true,
    render: (_value, row) => (
      <div className="flex items-center gap-1 text-xs max-w-[240px] truncate" title={`${row.asalMutasi} ➔ ${row.tujuanMutasi}`}>
        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
          {row.asalMutasi || '-'}
        </span>
        <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
        <span className="font-semibold text-indigo-700 dark:text-indigo-300 truncate max-w-[110px] bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/30">
          {row.tujuanMutasi || '-'}
        </span>
      </div>
    ),
  },
  {
    key: 'movementType',
    label: 'MVT TYPE',
    filterable: true,
    sortable: true,
    render: (value, row) => (
      <div className="flex flex-col">
        <span className="font-mono font-bold text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/40 w-fit">
          {value || '-'}
        </span>
        {row.movementText && (
          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[160px] mt-0.5" title={row.movementText}>
            {row.movementText}
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'kodeBarang',
    label: 'KODE MATERIAL',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
        {value || '-'}
      </span>
    ),
  },
  {
    key: 'namaBarang',
    label: 'NAMA MATERIAL',
    filterable: true,
    sortable: true,
    render: (value) => (
      <span className="text-slate-900 dark:text-slate-100 font-medium max-w-[200px] truncate block" title={value}>
        {value || '-'}
      </span>
    ),
  },
  {
    key: 'batch',
    label: 'BATCH',
    filterable: true,
    sortable: true,
    render: (value) =>
      value ? (
        <span className="font-mono text-xs font-bold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/60 px-2 py-0.5 rounded border border-violet-200 dark:border-violet-900/40">
          {value}
        </span>
      ) : (
        <span className="text-slate-400 text-xs">-</span>
      ),
  },
  {
    key: 'storageLocation',
    label: 'LOKASI (SLOC)',
    filterable: true,
    sortable: true,
    render: (value, row) => (
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {row.plant ? `${row.plant} - ` : ''}{value || '-'}
      </span>
    ),
  },
  {
    key: 'jumlah',
    label: 'JUMLAH',
    filterable: false,
    sortable: true,
    width: '16',
    render: (value, row) => {
      const isMasuk = row.shkzg === 'S' || row.arahMutasi === 'Masuk'
      const num = Number(value) || 0
      return (
        <span
          className={`font-mono text-xs font-bold ${
            isMasuk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}
        >
          {isMasuk ? '+' : '-'}{Math.abs(num).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
        </span>
      )
    },
  },
  { key: 'satuan', label: 'SATUAN', filterable: true, sortable: true, width: '10' },
  {
    key: 'nilaiMutasi',
    label: 'NILAI MUTASI (IDR)',
    filterable: false,
    sortable: true,
    width: '22',
    render: (value) => {
      const num = Number(value) || 0
      return (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
          Rp {num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      )
    },
  },
  {
    key: 'nomorPo',
    label: 'NO PO / ORDER',
    filterable: true,
    sortable: true,
    render: (value, row) => {
      const isOrder = Boolean(row.orderNo)
      const ref = value || row.orderNo
      return ref ? (
        <span
          className={`font-mono text-xs px-2 py-0.5 rounded border ${
            isOrder
              ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/40'
              : 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/40'
          }`}
          title={isOrder ? `Order Produksi: ${row.orderNo}` : `Purchase Order: ${value}`}
        >
          {isOrder ? `Ord: ${row.orderNo}` : `PO: ${value}`}
        </span>
      ) : (
        <span className="text-slate-400 text-xs">-</span>
      )
    },
  },
  {
    key: 'userSap',
    label: 'USER SAP',
    filterable: true,
    sortable: true,
    render: (value, row) => (
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{value || '-'}</span>
        {row.entryTime && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            {row.entryDate || ''} {row.entryTime}
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'keterangan',
    label: 'KETERANGAN',
    filterable: true,
    sortable: true,
    render: (_value, row) => {
      const text = row.itemText || row.headerText || '-'
      return (
        <div className="flex flex-col max-w-[200px]" title={`Header: ${row.headerText || '-'}\nItem: ${row.itemText || '-'}`}>
          <span className="text-xs text-slate-700 dark:text-slate-300 truncate font-medium">
            {text}
          </span>
          {row.headerText && row.itemText && row.headerText !== row.itemText && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
              Hdr: {row.headerText}
            </span>
          )}
        </div>
      )
    },
  },
]

export const MUTASI_CONFIG: PageConfig<MutasiData> = {
  title: 'Mutasi Material',
  icon: 'ArrowLeftRight',
  description: 'Monitor dan penelusuran (traceability) seluruh mutasi material di gudang',
  columns: MUTASI_COLUMNS,
  filterConfig: {
    showGlobalSearch: true,
    showDateFilter: true,
    showPlantFilter: true,
    showExportButton: true,
    dateLabel: 'Filter Tanggal Posting',
  },
  exportConfig: {
    filename: 'Mutasi_Material',
    title: 'LAPORAN MUTASI MATERIAL',
    formats: ['excel', 'pdf'],
  },
  tableConfig: {
    showFooter: true,
    footerCalculations: [
      {
        column: 'jumlah',
        type: 'sum',
        label: 'Total Qty Mutasi',
      },
      {
        column: 'nilaiMutasi',
        type: 'sum',
        label: 'Total Nilai Mutasi',
      },
    ],
    emptyStateMessage: 'Tidak ada data mutasi material pada periode ini',
  },
}
