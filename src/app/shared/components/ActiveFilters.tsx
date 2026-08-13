// src/app/shared/components/ActiveFilters.tsx

'use client'
import { X, RotateCcw, Download } from 'lucide-react'
import { ColumnConfig, DateRange } from '../types'
import { formatDate } from '../utils/filterUtils'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'

interface ActiveFiltersProps<T = any> {
  selectedPlant?: string
  onClearPlant?: () => void

  searchTerm?: string
  onClearSearch?: () => void

  dateRange?: DateRange
  onClearDateRange?: () => void

  columnFilters?: Record<string, string>
  onClearColumnFilter?: (key: string) => void

  onClearAll: () => void

  columns: ColumnConfig<T>[]
  plantOptions?: { value: string; label: string }[]

  customActiveFilters?: React.ReactNode

  // Export Button Props
  showExportButton?: boolean
  onExportClick?: () => void
  dataCount?: number
}

export default function ActiveFilters<T = any>({
  selectedPlant,
  onClearPlant,
  searchTerm,
  onClearSearch,
  dateRange,
  onClearDateRange,
  columnFilters = {},
  onClearColumnFilter,
  onClearAll,
  columns,
  plantOptions = [],
  customActiveFilters,
  showExportButton = true,
  onExportClick,
  dataCount = 0,
}: ActiveFiltersProps<T>) {
  const activeFiltersCount =
    Object.keys(columnFilters).length +
    (searchTerm ? 1 : 0) +
    (selectedPlant ? 1 : 0) +
    (dateRange?.start && dateRange?.end ? 1 : 0)

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Left side: Active Filter Badges */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mr-1">
          Filter Aktif ({activeFiltersCount}):
        </span>

        {/* Plant Filter Badge */}
        {selectedPlant && onClearPlant && (
          <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
            Plant: {plantOptions.find((p) => p.value === selectedPlant)?.label || selectedPlant}
            <X className="w-3 h-3 ml-1.5 cursor-pointer hover:opacity-75" onClick={onClearPlant} />
          </span>
        )}

        {/* Search Badge */}
        {searchTerm && onClearSearch && (
          <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50">
            Pencarian: {searchTerm}
            <X className="w-3 h-3 ml-1.5 cursor-pointer hover:opacity-75" onClick={onClearSearch} />
          </span>
        )}

        {/* Date Range Badge */}
        {dateRange?.start && dateRange?.end && onClearDateRange && (
          <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/50">
            Tanggal: {formatDate(dateRange.start)}{' '}
            <span className="mx-1 text-slate-400 dark:text-slate-500">→</span>{' '}
            {formatDate(dateRange.end)}
            <X className="w-3 h-3 ml-1.5 cursor-pointer hover:opacity-75" onClick={onClearDateRange} />
          </span>
        )}

        {/* Column Filters Badges */}
        {Object.entries(columnFilters).map(([key, value]) => (
          <span
            key={key}
            className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50"
          >
            {columns.find((c) => c.key === key)?.label}: {value}
            <X
              className="w-3 h-3 ml-1.5 cursor-pointer hover:opacity-75"
              onClick={() => onClearColumnFilter?.(key)}
            />
          </span>
        ))}

        {/* Custom Active Filters */}
        {customActiveFilters}

        {/* Reset All Filters Button */}
        {activeFiltersCount > 0 && (
          <button
            onClick={onClearAll}
            title="Reset semua filter"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Right side: Export Button */}
      {showExportButton && onExportClick && (
        <div className="shrink-0 self-end sm:self-auto pt-2 sm:pt-0">
          <InteractiveHoverButton
            onClick={onExportClick}
            disabled={dataCount === 0}
            text="Export"
            icon={<Download className="w-4 h-4" />}
            className="w-[138px] h-9 text-xs"
          />
        </div>
      )}
    </div>
  )
}
