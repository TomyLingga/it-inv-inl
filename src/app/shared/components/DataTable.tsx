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
  Rows3,
  AlignJustify,
} from 'lucide-react'
import { useState, useEffect, Fragment } from 'react'
import { BaseData, ColumnConfig, SortConfig, TableConfig, ColumnGroup, TableDensity } from '../types'
import { calculateTotal } from '../utils/filterUtils'
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

  /** Optional grouping bands rendered above the header (wide tables). */
  columnGroups?: ColumnGroup[]

  /** Initial row density; persisted per view when `storageKey` is provided. */
  density?: TableDensity
  /** localStorage key used to remember the density choice for this view. */
  storageKey?: string

  pageSize?: number

  isLoading?: boolean

  renderExpandedRow?: (row: T) => React.ReactNode
  onRowClick?: (row: T) => void
}

const DEFAULT_STICKY_WIDTH = 120

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
  columnGroups,
  density = 'comfortable',
  storageKey,
  pageSize = 25,
  isLoading = false,
  renderExpandedRow,
  onRowClick,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(pageSize)
  const [expandedRowKeys, setExpandedRowKeys] = useState<Record<string, boolean>>({})
  const [rowDensity, setRowDensity] = useState<TableDensity>(density)

  // Restore persisted density (per view) — guarded so private/blocked storage never throws.
  useEffect(() => {
    if (!storageKey) return
    try {
      const saved = window.localStorage.getItem(`density:${storageKey}`)
      if (saved === 'compact' || saved === 'comfortable') setRowDensity(saved)
    } catch {
      /* storage unavailable — keep default */
    }
  }, [storageKey])

  const changeDensity = (next: TableDensity) => {
    setRowDensity(next)
    if (!storageKey) return
    try {
      window.localStorage.setItem(`density:${storageKey}`, next)
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [data.length, rowsPerPage])

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage))
  const startIdx = (currentPage - 1) * rowsPerPage
  const endIdx = Math.min(startIdx + rowsPerPage, data.length)
  const pageData = data.slice(startIdx, endIdx)

  // ─── Sticky-left offsets (identity columns on wide tables) ─────────────────
  const stickyOffsets: Record<string, number> = {}
  let stickyAcc = 0
  columns.forEach((col) => {
    if (col.sticky === 'left') {
      stickyOffsets[col.key as string] = stickyAcc
      stickyAcc += col.stickyWidth ?? DEFAULT_STICKY_WIDTH
    }
  })
  const stickyKeys = columns.filter((c) => c.sticky === 'left').map((c) => c.key as string)
  const lastStickyKey = stickyKeys[stickyKeys.length - 1]

  // Density-driven paddings
  const headPadY = rowDensity === 'compact' ? 'py-2' : 'py-3.5'
  const bodyPadY = rowDensity === 'compact' ? 'py-1.5' : 'py-3'

  // Footer totals from ALL data
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

  // Sticky style/class helpers ------------------------------------------------
  const stickyStyle = (col: ColumnConfig<T>): React.CSSProperties | undefined => {
    if (col.sticky !== 'left') return undefined
    const w = col.stickyWidth ?? DEFAULT_STICKY_WIDTH
    return { left: stickyOffsets[col.key as string], minWidth: w, maxWidth: w }
  }

  const isLastSticky = (col: ColumnConfig<T>) => (col.key as string) === lastStickyKey

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-200">
      {/* Scroll region: bounded height so the header can stay sticky on long lists */}
      <div className="overflow-auto max-h-[calc(100vh-320px)] min-h-[240px]">
        <table className="w-full">
          {/* HEADER */}
          <thead className="text-slate-200">
            {/* Optional column-group band */}
            {columnGroups && columnGroups.length > 0 && (
              <tr className="bg-slate-950 dark:bg-black/60">
                {columnGroups.map((g, gi) => (
                  <th
                    key={`${g.label}-${gi}`}
                    colSpan={g.span}
                    className="sticky top-0 z-20 px-3 lg:px-4 py-2 text-left text-[10px] font-black text-slate-300 uppercase tracking-[0.12em] border-r border-b border-slate-800/80 last:border-r-0 whitespace-nowrap bg-slate-950 dark:bg-black/60"
                  >
                    {g.label}
                  </th>
                ))}
              </tr>
            )}

            <tr>
              {columns.map((col) => {
                const isSorted = sortConfig.key === col.key
                const isFiltered = Boolean(columnFilters[col.key as string])
                const sticky = col.sticky === 'left'
                const topClass = columnGroups && columnGroups.length > 0 ? 'top-9' : 'top-0'

                return (
                  <th
                    key={col.key as string}
                    style={stickyStyle(col)}
                    className={`sticky ${topClass} ${sticky ? 'z-30' : 'z-20'} bg-slate-900 dark:bg-slate-950 px-3 lg:px-4 ${headPadY} text-left text-[11px] sm:text-xs font-extrabold text-slate-200 uppercase tracking-wider border-r border-b-2 border-slate-800/80 border-b-slate-700/80 last:border-r-0 whitespace-nowrap select-none ${
                      sticky ? 'left-0' : ''
                    } ${sticky && isLastSticky(col) ? 'shadow-[6px_0_8px_-6px_rgba(0,0,0,0.55)]' : ''} ${
                      col.sortable ? 'cursor-pointer hover:bg-slate-800/90 transition-colors' : ''
                    } ${col.className || ''}`}
                    onClick={() => col.sortable && onSort(col.key)}
                  >
                    <div className="flex items-center justify-between space-x-2">
                      <span className="truncate">{col.label}</span>

                      <div className="flex items-center space-x-1 shrink-0">
                        {col.sortable && (
                          <div className="flex items-center">
                            {isSorted ? (
                              <span className="bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded flex items-center space-x-0.5 shadow-xs">
                                <span>{sortConfig.direction === 'desc' ? '▼' : '▲'}</span>
                              </span>
                            ) : (
                              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200 transition-colors" />
                            )}
                          </div>
                        )}

                        {col.filterable && onColumnFilter && (
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowColumnFilter?.(
                                  showColumnFilter === col.key ? null : (col.key as string)
                                )
                              }}
                              className={`p-1 rounded-md transition-colors ${
                                isFiltered
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                              title={`Filter ${col.label}`}
                            >
                              <Filter className="w-3.5 h-3.5" />
                              {isFiltered && (
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-slate-900" />
                              )}
                            </button>

                            {/* Column Filter Popover */}
                            {showColumnFilter === col.key && (
                              <div
                                className="absolute top-8 right-0 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 w-56 sm:w-64"
                                onClick={(e) => e.stopPropagation()}
                              >
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
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>

          {/* BODY */}
          <tbody
            key={currentPage}
            className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-900 motion-safe:animate-fade-up"
          >
            {pageData.map((row, idx) => {
              const isEvenRow = (idx + 1) % 2 === 0
              const rowId = (row as any).groupKey || (row as any).id || `${row.no}-${idx}`
              const isExpanded = Boolean(expandedRowKeys[rowId])
              const hasExpandableContent = renderExpandedRow && ((row as any).batchesCount > 1 || (row as any).batchesList?.length > 1)

              // Opaque backgrounds so sticky cells fully cover scrolling content.
              const rowBg = isExpanded
                ? 'bg-blue-50 dark:bg-slate-800'
                : isEvenRow
                ? 'bg-slate-50 dark:bg-slate-800/60'
                : 'bg-white dark:bg-slate-900'
              const stickyBg = isExpanded
                ? 'bg-blue-50 dark:bg-slate-800'
                : isEvenRow
                ? 'bg-slate-100 dark:bg-slate-800'
                : 'bg-white dark:bg-slate-900'

              return (
                <Fragment key={`${rowId}-${idx}`}>
                  <tr
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`group transition-colors duration-150 ${rowBg} ${
                      onRowClick ? 'cursor-pointer' : ''
                    } hover:bg-blue-50/80 dark:hover:bg-slate-800/80`}
                  >
                    {columns.map((col) => {
                      const value = row[col.key]
                      const sticky = col.sticky === 'left'
                      const stickyCls = sticky
                        ? `sticky left-0 z-10 ${stickyBg} group-hover:bg-blue-50 dark:group-hover:bg-slate-800 ${
                            isLastSticky(col) ? 'shadow-[6px_0_8px_-6px_rgba(0,0,0,0.35)]' : ''
                          }`
                        : ''

                      if (col.render) {
                        return (
                          <td
                            key={col.key as string}
                            style={stickyStyle(col)}
                            className={`px-3 lg:px-4 ${bodyPadY} text-xs sm:text-sm border-r border-slate-100 dark:border-slate-800/60 last:border-r-0 ${stickyCls} ${col.className || ''}`}
                          >
                            {col.render(value, row)}
                          </td>
                        )
                      }

                      let displayValue: React.ReactNode = value
                      let cellClass =
                        `px-3 lg:px-4 ${bodyPadY} text-xs sm:text-sm text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60 last:border-r-0`

                      if (col.key === 'no') {
                        cellClass =
                          `px-3 lg:px-4 ${bodyPadY} whitespace-nowrap text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 border-r border-slate-100 dark:border-slate-800/60 text-center`

                        if (hasExpandableContent) {
                          displayValue = (
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedRowKeys((prev) => ({ ...prev, [rowId]: !prev[rowId] }))
                                }}
                                className={`p-1 rounded-md transition-all shadow-2xs ${
                                  isExpanded
                                    ? 'bg-blue-600 text-white font-bold rotate-90'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-600 hover:text-white'
                                }`}
                                title={isExpanded ? 'Sembunyikan detail batch' : 'Lihat detail batch'}
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                              <span>{value}</span>
                            </div>
                          )
                        }
                      } else if (col.key === 'postingDate') {
                        cellClass =
                          `px-3 lg:px-4 ${bodyPadY} whitespace-nowrap text-xs sm:text-sm border-r border-slate-100 dark:border-slate-800/60`
                        displayValue = (
                          <span className="font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                            {value}
                          </span>
                        )
                      } else if (col.key === 'jenisDokBC') {
                        cellClass =
                          `px-3 lg:px-4 ${bodyPadY} whitespace-nowrap text-xs sm:text-sm border-r border-slate-100 dark:border-slate-800/60`
                        displayValue = (
                          <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-900/40 text-xs">
                            {value}
                          </span>
                        )
                      } else if (col.key === 'mataUangDokumen' || col.key === 'mataUangLokal' || col.key === 'currency') {
                        cellClass =
                          `px-3 lg:px-4 ${bodyPadY} whitespace-nowrap text-xs sm:text-sm border-r border-slate-100 dark:border-slate-800/60 text-center`
                        displayValue = (
                          <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs inline-block">
                            {value}
                          </span>
                        )
                      } else if (
                        typeof value === 'number' &&
                        col.key.toString().toLowerCase().includes('nilai')
                      ) {
                        cellClass =
                          `px-3 lg:px-4 ${bodyPadY} whitespace-nowrap text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white border-r border-slate-100 dark:border-slate-800/60 text-right num-tabular`
                        displayValue = value.toLocaleString('id-ID')
                      } else if (
                        typeof value === 'number' &&
                        col.key.toString().includes('jumlah')
                      ) {
                        cellClass =
                          `px-3 lg:px-4 ${bodyPadY} whitespace-nowrap text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-100 dark:border-slate-800/60 text-right num-tabular`
                        displayValue = value.toLocaleString('id-ID')
                      } else if (col.key === 'kursDokumen' && typeof value === 'number') {
                        cellClass =
                          `px-3 lg:px-4 ${bodyPadY} whitespace-nowrap text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/60 text-right num-tabular`
                        displayValue = value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 5 })
                      } else if (col.align === 'right') {
                        cellClass += ' text-right num-tabular'
                      } else if (col.align === 'center') {
                        cellClass += ' text-center'
                      }

                      return (
                        <td key={col.key as string} style={stickyStyle(col)} className={`${cellClass} ${stickyCls}`}>
                          {displayValue}
                        </td>
                      )
                    })}
                  </tr>

                  {renderExpandedRow && isExpanded && (
                    <tr className="bg-slate-900/90 dark:bg-slate-950/95">
                      <td colSpan={columns.length} className="p-0 border-b-2 border-indigo-500/50">
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>

          {/* FOOTER */}
          {tableConfig?.showFooter && tableConfig?.footerCalculations?.length ? (
            <tfoot className="bg-slate-900 dark:bg-slate-950 text-white">
              <tr>
                {columns.map((col, colIdx) => {
                  const calculation = tableConfig.footerCalculations?.find(
                    (calc) => calc.column === col.key
                  )
                  const sticky = col.sticky === 'left'
                  const stickyCls = sticky
                    ? `sticky left-0 z-10 bg-slate-900 dark:bg-slate-950 ${
                        isLastSticky(col) ? 'shadow-[6px_0_8px_-6px_rgba(0,0,0,0.55)]' : ''
                      }`
                    : ''

                  if (colIdx === 0) {
                    return (
                      <td
                        key={col.key as string}
                        style={stickyStyle(col)}
                        className={`px-4 py-3 text-xs font-black text-white uppercase tracking-wider text-center border-t-2 border-slate-700 ${stickyCls}`}
                      >
                        TOTAL
                      </td>
                    )
                  }

                  if (!calculation) {
                    return (
                      <td
                        key={col.key as string}
                        style={stickyStyle(col)}
                        className={`px-3 py-3 border-t-2 border-slate-700 ${stickyCls}`}
                      />
                    )
                  }

                  const totalValue = footerTotals[col.key as string] ?? 0
                  const formatted = formatFooterValue(col.key as string, totalValue)

                  const isNilai = (col.key as string).toLowerCase().includes('nilai')
                  const textClass = isNilai
                    ? 'text-emerald-400 font-extrabold text-right'
                    : 'text-blue-300 font-bold text-right'

                  return (
                    <td
                      key={col.key as string}
                      className={`px-3 lg:px-4 py-3 text-xs sm:text-sm whitespace-nowrap border-t-2 border-slate-700 num-tabular ${textClass}`}
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
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 flex-wrap">
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

          {/* Density toggle */}
          <div className="flex items-center gap-1 border border-slate-300 dark:border-slate-700 rounded-lg p-0.5 bg-white dark:bg-slate-800">
            <button
              type="button"
              onClick={() => changeDensity('comfortable')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                rowDensity === 'comfortable'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Kepadatan nyaman"
            >
              <Rows3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nyaman</span>
            </button>
            <button
              type="button"
              onClick={() => changeDensity('compact')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold transition-colors ${
                rowDensity === 'compact'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Kepadatan padat"
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Padat</span>
            </button>
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
