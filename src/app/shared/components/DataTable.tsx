// src/app/shared/components/DataTable.tsx

'use client'
import {
  ArrowUpDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PackageSearch,
  RotateCcw,
  RefreshCw,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { BaseData, ColumnConfig, SortConfig, TableConfig } from '../types'
import { calculateTotal, formatCurrency } from '../utils/filterUtils'
import { Spinner } from '@/app/components/ui/spinner'

interface DataTableProps<T extends BaseData> {
  data: T[]
  columns: ColumnConfig<T>[]
  sortConfig: SortConfig<T>
  onSort: (key: keyof T) => void

  columnFilters?: Record<string, string>
  onColumnFilter?: (key: string, value: string) => void
  onClearColumnFilter?: (key: string) => void

  showColumnFilter?: string | null
  setShowColumnFilter?: (key: string | null) => void

  onClearAllFilters?: () => void

  tableConfig?: TableConfig<T>

  pageSize?: number

  isLoading?: boolean
}

export default function DataTable<T extends BaseData>({
  data,
  columns,
  sortConfig,
  onSort,
  columnFilters = {},
  onColumnFilter,
  onClearColumnFilter,
  showColumnFilter,
  setShowColumnFilter,
  onClearAllFilters,
  tableConfig,
  pageSize = 25,
  isLoading = false,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [data.length, rowsPerPage])

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage))
  const startIdx = (currentPage - 1) * rowsPerPage
  const endIdx = Math.min(startIdx + rowsPerPage, data.length)
  const pageData = data.slice(startIdx, endIdx)

  // Hitung footer totals dari SEMUA data
  const footerTotals: Record<string, number> = {}
  if (tableConfig?.showFooter && tableConfig.footerCalculations) {
    tableConfig.footerCalculations.forEach((calc) => {
      if (calc.type === 'sum') {
        footerTotals[calc.column as string] = calculateTotal(data, calc.column)
      } else if (calc.type === 'count') {
        footerTotals[calc.column as string] = data.length
      }
    })
  }

  const formatFooterValue = (colKey: string, value: number): string => {
    const key = colKey.toLowerCase()
    if (key.includes('nilai')) return formatCurrency(value)
    return value.toLocaleString('id-ID')
  }

  // ─── Loading / Skeleton state ─────────────────────────────────────────────
  if (isLoading && data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden p-8 sm:p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <Spinner size="xl" variant="primary" label="" />
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Menghubungkan ke Sistem SAP...
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Mengambil data inventory PT Industri Nabati Lestari
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Empty state ──────────────────────────────────────────────────────────
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="text-center py-12 sm:py-16 px-4 bg-slate-50/40 dark:bg-slate-900/40 flex flex-col items-center justify-center">
          {/* Icon without background box */}
          <PackageSearch className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-3 stroke-[1.5]" />

          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
            {tableConfig?.emptyStateMessage || 'Tidak ada data ditemukan'}
          </h3>

          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-sm leading-relaxed">
            Coba ubah filter tanggal, lokasi plant, atau kata kunci pencarian Anda.
          </p>
        </div>
      </div>
    )
  }

  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages))
  }

  const getPageNumbers = () => {
    const delta = 2
    const range: (number | '...')[] = []
    const left = Math.max(2, currentPage - delta)
    const right = Math.min(totalPages - 1, currentPage + delta)

    range.push(1)
    if (left > 2) range.push('...')
    for (let i = left; i <= right; i++) range.push(i)
    if (right < totalPages - 1) range.push('...')
    if (totalPages > 1) range.push(totalPages)

    return range
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-200">
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* HEADER */}
          <thead className="bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key as string}
                  className={`px-3 lg:px-4 py-3.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider border-r border-slate-200 dark:border-slate-700/60 last:border-r-0 ${col.sortable ? 'cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700' : ''
                    } ${col.className || ''}`}
                  onClick={() => col.sortable && onSort(col.key)}
                >
                  <div className="flex items-center justify-between space-x-1.5">
                    <span className="truncate">{col.label}</span>

                    {col.sortable && (
                      <div className="flex items-center space-x-0.5 shrink-0">
                        <ArrowUpDown
                          className={`w-3.5 h-3.5 ${sortConfig.key === col.key
                              ? 'text-blue-600 dark:text-blue-400 font-bold'
                              : 'text-slate-400 dark:text-slate-500'
                            }`}
                        />
                        {sortConfig.key === col.key && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                            {sortConfig.direction === 'desc' ? '↓' : '↑'}
                          </span>
                        )}
                      </div>
                    )}

                    {col.filterable && onColumnFilter && (
                      <div className="relative shrink-0 ml-1">
                        <Filter
                          className={`w-3.5 h-3.5 cursor-pointer transition-colors ${columnFilters[col.key as string]
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowColumnFilter?.(
                              showColumnFilter === col.key ? null : (col.key as string)
                            )
                          }}
                        />

                        {/* Column Filter Popover */}
                        {showColumnFilter === col.key && (
                          <div className="absolute top-7 right-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 w-56 sm:w-64">
                            <div className="mb-2">
                              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Filter {col.label}
                              </label>
                            </div>
                            <input
                              type="text"
                              placeholder={`Cari ${col.label.toLowerCase()}...`}
                              value={columnFilters[col.key as string] || ''}
                              onChange={(e) => onColumnFilter(col.key as string, e.target.value)}
                              className="w-full px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              autoFocus
                            />
                            <div className="mt-2.5 flex justify-end space-x-2">
                              <button
                                onClick={() => onClearColumnFilter?.(col.key as string)}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                              >
                                Clear
                              </button>
                              <button
                                onClick={() => setShowColumnFilter?.(null)}
                                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs"
                              >
                                OK
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* BODY */}
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
            {pageData.map((row, idx) => {
              const isEvenRow = (idx + 1) % 2 === 0
              return (
                <tr
                  key={`${row.no}-${idx}`}
                  className={`transition-colors duration-150 ${isEvenRow
                      ? 'bg-slate-50/80 dark:bg-slate-800/65'
                      : 'bg-white dark:bg-slate-900'
                    } hover:bg-blue-50/80 dark:hover:bg-slate-700/70`}
                >
                  {columns.map((col) => {
                    const value = row[col.key]

                    if (col.render) {
                      return (
                        <td
                          key={col.key as string}
                          className={`px-3 lg:px-4 py-3 text-xs sm:text-sm border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 ${col.className || ''}`}
                        >
                          {col.render(value, row)}
                        </td>
                      )
                    }

                    let displayValue: React.ReactNode = value
                    let cellClass =
                      'px-3 lg:px-4 py-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60 last:border-r-0'

                    if (col.key === 'no') {
                      cellClass =
                        'px-3 lg:px-4 py-3 whitespace-nowrap text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/60'
                    } else if (col.key === 'postingDate') {
                      cellClass =
                        'px-3 lg:px-4 py-3 whitespace-nowrap text-xs sm:text-sm border-r border-slate-100 dark:border-slate-800/60'
                      displayValue = (
                        <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                          {value}
                        </span>
                      )
                    } else if (
                      typeof value === 'number' &&
                      col.key.toString().includes('nilai')
                    ) {
                      cellClass =
                        'px-3 lg:px-4 py-3 whitespace-nowrap text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800/60'
                      displayValue = formatCurrency(value)
                    } else if (
                      typeof value === 'number' &&
                      col.key.toString().includes('jumlah')
                    ) {
                      cellClass =
                        'px-3 lg:px-4 py-3 whitespace-nowrap text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-800/60'
                      displayValue = value.toLocaleString('id-ID')
                    }

                    return (
                      <td key={col.key as string} className={cellClass}>
                        {displayValue}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>

          {/* FOOTER */}
          {tableConfig?.showFooter && tableConfig?.footerCalculations?.length ? (
            <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                {columns.map((col, colIdx) => {
                  const calculation = tableConfig.footerCalculations?.find(
                    (calc) => calc.column === col.key
                  )

                  if (colIdx === 0) {
                    return (
                      <td
                        key={col.key as string}
                        className="px-4 py-3 text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider"
                      >
                        TOTAL
                      </td>
                    )
                  }

                  if (!calculation) {
                    return <td key={col.key as string} className="px-3 py-3" />
                  }

                  const totalValue = footerTotals[col.key as string] ?? 0
                  const formatted = formatFooterValue(col.key as string, totalValue)

                  const isNilai = (col.key as string).toLowerCase().includes('nilai')
                  const textClass = isNilai
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-blue-700 dark:text-blue-400'

                  return (
                    <td
                      key={col.key as string}
                      className={`px-3 lg:px-4 py-3 text-xs sm:text-sm font-black whitespace-nowrap ${textClass}`}
                    >
                      {formatted}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {/* ─── Pagination Bar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Menampilkan{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">{startIdx + 1}</span>–
            <span className="font-bold text-slate-900 dark:text-slate-100">{endIdx}</span> dari{' '}
            <span className="font-bold text-slate-900 dark:text-slate-100">{data.length}</span> data
          </span>

          <div className="flex items-center gap-1.5">
            <span>Baris:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 font-medium cursor-pointer"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Halaman pertama"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Halaman sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {getPageNumbers().map((page, i) =>
              page === '...' ? (
                <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs">
                  …
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => goToPage(page as number)}
                  className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-bold transition-all ${currentPage === page
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Halaman berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Halaman terakhir"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
