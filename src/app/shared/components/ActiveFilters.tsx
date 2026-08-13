// src/app/shared/components/ActiveFilters.tsx

'use client'
import { X, RotateCcw } from 'lucide-react'
import { ColumnConfig, DateRange } from '../types'
import { formatDate } from '../utils/filterUtils'

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
}: ActiveFiltersProps<T>) {
  const activeFiltersCount =
    Object.keys(columnFilters).length +
    (searchTerm ? 1 : 0) +
    (selectedPlant ? 1 : 0) +
    (dateRange?.start && dateRange?.end ? 1 : 0)

  if (activeFiltersCount === 0 && !customActiveFilters) return null

  return (
    <div className="flex items-center space-x-2 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-800">
      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
        Filter Aktif ({activeFiltersCount}):
      </span>
      <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
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

        {/* Custom Filters */}
        {customActiveFilters}

        {/* Reset All Filters Button with Icon */}
        <button
          onClick={onClearAll}
          title="Reset semua filter"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 transition-all cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  )
}
