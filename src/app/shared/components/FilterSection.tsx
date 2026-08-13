// src/app/shared/components/FilterSection.tsx

'use client'
import { Search } from 'lucide-react'
import { DateRange, FilterConfig } from '../types'
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range'

interface FilterSectionProps {
  // Plant filter
  showPlantFilter?: boolean
  selectedPlant?: string
  onPlantChange?: (plant: string) => void
  plantOptions?: { value: string; label: string }[]

  // Global search
  showGlobalSearch?: boolean
  searchTerm?: string
  onSearchChange?: (search: string) => void
  searchPlaceholder?: string

  // Date filter
  showDateFilter?: boolean
  dateRange?: DateRange
  onDateChange?: (field: 'start' | 'end', value: string) => void
  dateLabel?: string

  // Export (optional prop preserved for backward compatibility)
  showExportButton?: boolean
  onExportClick?: () => void
  dataCount?: number

  // Custom filters
  customFilters?: React.ReactNode

  // Config
  config?: FilterConfig
}

export default function FilterSection({
  showPlantFilter = true,
  selectedPlant = '',
  onPlantChange,
  plantOptions = [],

  showGlobalSearch = true,
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Cari nomor dokumen, nama barang...',

  showDateFilter = true,
  dateRange,
  onDateChange,
  dateLabel = 'Filter Tanggal',

  customFilters,
  config,
}: FilterSectionProps) {
  const finalDateLabel = config?.dateLabel || dateLabel || 'Filter Tanggal'

  const finalShowPlant = config?.showPlantFilter ?? showPlantFilter
  const finalShowSearch = config?.showGlobalSearch ?? showGlobalSearch
  const finalShowDate = config?.showDateFilter ?? showDateFilter

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    if (value > todayStr) return
    onDateChange?.(field, value)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200 dark:border-slate-800 transition-colors duration-200 space-y-4">
      {/* Row 1: Filters (Plant, Date Range, & KPPBC / Custom Filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
        {/* Kolom 1: Plant Filter */}
        {finalShowPlant && plantOptions.length > 0 && (
          <div className="sm:col-span-1 lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Plant
            </label>
            <select
              value={selectedPlant}
              onChange={(e) => onPlantChange?.(e.target.value)}
              className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium cursor-pointer shadow-2xs"
            >
              {plantOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Kolom 2: Date Filter */}
        {finalShowDate && dateRange && (
          <div className={customFilters ? "sm:col-span-1 lg:col-span-5" : "sm:col-span-1 lg:col-span-9"}>
            <DatePickerWithRange
              label={finalDateLabel}
              dateRange={dateRange}
              onDateChange={handleDateChange}
            />
          </div>
        )}

        {/* Kolom 3: Custom Filters (e.g. KPPBC Select) */}
        {customFilters && (
          <div className="sm:col-span-1 lg:col-span-4">{customFilters}</div>
        )}
      </div>

      {/* Row 2: Full Width Global Search */}
      {finalShowSearch && (
        <div className="w-full pt-1">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Pencarian Global
          </label>
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full h-10 pl-10 sm:pl-11 pr-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-2xs"
            />
          </div>
        </div>
      )}
    </div>
  )
}
