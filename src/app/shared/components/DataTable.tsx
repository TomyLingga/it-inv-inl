// src/app/shared/components/DataTable.tsx

'use client'
import { ArrowUpDown, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import { BaseData, ColumnConfig, SortConfig, TableConfig } from '../types'
import { calculateTotal, formatCurrency } from '../utils/filterUtils'

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

  // Pagination config (opsional, default 25)
  pageSize?: number
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
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(pageSize)

  // Reset ke halaman 1 ketika data berubah (filter, sort, dll)
  useEffect(() => {
    setCurrentPage(1)
  }, [data.length, rowsPerPage])

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage))
  const startIdx = (currentPage - 1) * rowsPerPage
  const endIdx = Math.min(startIdx + rowsPerPage, data.length)
  const pageData = data.slice(startIdx, endIdx)

  // Footer hanya menghitung data pada halaman ini, atau total semua?
  // → Kita tampilkan total SEMUA data (lebih informatif)
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

  // ─── Empty state ─────────────────────────────────────────────────────────────
  if (data.length === 0) {
    return (
      <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
        <div className='text-center py-12 sm:py-16 bg-gray-50'>
          <div className='text-4xl sm:text-6xl mb-4'>
            {tableConfig?.emptyStateIcon || '🔍'}
          </div>
          <h3 className='text-lg sm:text-xl font-semibold text-gray-900 mb-2'>
            {tableConfig?.emptyStateMessage || 'Tidak ada data ditemukan'}
          </h3>
          <p className='text-gray-500 mb-6 text-sm'>Coba ubah filter atau kata kunci pencarian Anda</p>
          {onClearAllFilters && (
            <button
              onClick={onClearAllFilters}
              className='px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm'
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── Pagination controls ──────────────────────────────────────────────────────
  const goToPage = (page: number) => {
    setCurrentPage(Math.min(Math.max(1, page), totalPages))
  }

  // Build page number buttons (max 5 visible)
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
    <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
      {/* ─── Table ─────────────────────────────────────────────────────────────── */}
      <div className='overflow-x-auto'>
        <table className='w-full'>
          {/* HEADER */}
          <thead className='bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200'>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key as string}
                  className={`px-2 sm:px-3 lg:px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0 ${
                    col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''
                  } ${col.className || ''}`}
                  onClick={() => col.sortable && onSort(col.key)}
                >
                  <div className='flex items-center justify-between space-x-1 sm:space-x-2'>
                    <span className='truncate'>{col.label}</span>

                    {col.sortable && (
                      <div className='flex items-center space-x-0.5'>
                        <ArrowUpDown
                          className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-400 ${
                            sortConfig.key === col.key ? 'text-blue-600' : ''
                          }`}
                        />
                        {sortConfig.key === col.key && (
                          <span
                            className={`text-xs ${
                              sortConfig.direction === 'desc'
                                ? 'text-blue-600 font-medium'
                                : 'text-gray-500'
                            }`}
                          >
                            {sortConfig.direction === 'desc' ? '↓' : '↑'}
                          </span>
                        )}
                      </div>
                    )}

                    {col.filterable && onColumnFilter && (
                      <div className='relative flex-shrink-0 ml-1'>
                        <Filter
                          className={`w-3 h-3 sm:w-4 sm:h-4 cursor-pointer transition-colors ${
                            columnFilters[col.key as string]
                              ? 'text-blue-600'
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowColumnFilter?.(
                              showColumnFilter === col.key ? null : (col.key as string)
                            )
                          }}
                        />

                        {showColumnFilter === col.key && (
                          <div className='absolute top-6 right-0 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-2.5 sm:p-3 w-56 sm:w-64'>
                            <div className='mb-1.5 sm:mb-2'>
                              <label className='text-xs font-medium text-gray-700'>
                                Filter {col.label}
                              </label>
                            </div>
                            <input
                              type='text'
                              placeholder={`Cari ${col.label.toLowerCase()}...`}
                              value={columnFilters[col.key as string] || ''}
                              onChange={(e) => onColumnFilter(col.key as string, e.target.value)}
                              className='w-full px-2.5 sm:px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                              autoFocus
                            />
                            <div className='mt-1.5 sm:mt-2 flex justify-end space-x-1.5 sm:space-x-2'>
                              <button
                                onClick={() => onClearColumnFilter?.(col.key as string)}
                                className='px-2.5 sm:px-3 py-1 text-xs text-gray-600 hover:text-gray-800'
                              >
                                Clear
                              </button>
                              <button
                                onClick={() => setShowColumnFilter?.(null)}
                                className='px-2.5 sm:px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700'
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
          <tbody className='divide-y divide-gray-200 bg-white'>
            {pageData.map((row, idx) => (
              <tr
                key={`${row.no}-${idx}`}
                className={`hover:bg-blue-50 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                {columns.map((col) => {
                  const value = row[col.key]

                  if (col.render) {
                    return (
                      <td
                        key={col.key as string}
                        className={`px-2 sm:px-3 lg:px-4 py-2.5 text-xs sm:text-sm ${col.className || ''}`}
                      >
                        {col.render(value, row)}
                      </td>
                    )
                  }

                  let displayValue: React.ReactNode = value
                  let cellClass =
                    'px-2 sm:px-3 lg:px-4 py-2.5 text-xs sm:text-sm text-gray-700'

                  if (col.key === 'no') {
                    cellClass =
                      'px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900'
                  } else if (col.key === 'postingDate') {
                    cellClass = 'px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm'
                    displayValue = (
                      <span className='font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded'>
                        {value}
                      </span>
                    )
                  } else if (
                    typeof value === 'number' &&
                    col.key.toString().includes('nilai')
                  ) {
                    cellClass =
                      'px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-bold text-gray-900'
                    displayValue = formatCurrency(value)
                  } else if (
                    typeof value === 'number' &&
                    col.key.toString().includes('jumlah')
                  ) {
                    cellClass =
                      'px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-600'
                    displayValue = value.toLocaleString('id-ID')
                  }

                  return (
                    <td key={col.key as string} className={cellClass}>
                      {displayValue}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>

          {/* FOOTER — total semua data */}
          {tableConfig?.showFooter && tableConfig?.footerCalculations?.length ? (
            <tfoot className='bg-gradient-to-r from-emerald-50 to-green-50 border-t-2 border-emerald-200'>
              <tr className='border-t-2 border-emerald-300'>
                {columns.map((col) => {
                  const calculation = tableConfig.footerCalculations?.find(
                    (calc) => calc.column === col.key
                  )

                  if (!calculation) {
                    return (
                      <td
                        key={col.key as string}
                        className='px-3 py-2 text-sm font-semibold text-gray-700'
                      >
                        {col.key === columns[0].key ? 'TOTAL' : ''}
                      </td>
                    )
                  }

                  const totalValue = footerTotals[col.key as string] || 0

                  return (
                    <td
                      key={col.key as string}
                      className='px-3 py-2 text-sm font-bold text-emerald-700'
                    >
                      {formatCurrency(totalValue)}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {/* ─── Pagination Bar ───────────────────────────────────────────────────── */}
      <div className='flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 bg-gray-50'>
        {/* Info kiri */}
        <div className='flex items-center gap-3 text-xs text-gray-600'>
          <span>
            Menampilkan{' '}
            <span className='font-semibold text-gray-900'>{startIdx + 1}</span>–
            <span className='font-semibold text-gray-900'>{endIdx}</span> dari{' '}
            <span className='font-semibold text-gray-900'>{data.length}</span> data
          </span>

          {/* Rows per page */}
          <div className='flex items-center gap-1.5'>
            <span>Baris:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className='border border-gray-300 rounded px-1.5 py-0.5 text-xs bg-white focus:ring-1 focus:ring-blue-500'
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tombol navigasi */}
        {totalPages > 1 && (
          <div className='flex items-center gap-1'>
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className='p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              title='Halaman pertama'
            >
              <ChevronsLeft className='w-4 h-4' />
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className='p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              title='Halaman sebelumnya'
            >
              <ChevronLeft className='w-4 h-4' />
            </button>

            {getPageNumbers().map((page, i) =>
              page === '...' ? (
                <span key={`ellipsis-${i}`} className='px-1 text-gray-400 text-xs'>
                  …
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => goToPage(page as number)}
                  className={`min-w-[28px] h-7 px-1 rounded text-xs font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {page}
                </button>
              )
            )}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className='p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              title='Halaman berikutnya'
            >
              <ChevronRight className='w-4 h-4' />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className='p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors'
              title='Halaman terakhir'
            >
              <ChevronsRight className='w-4 h-4' />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
