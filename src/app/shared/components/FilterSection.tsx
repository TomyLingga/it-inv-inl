// src/app/shared/components/FilterSection.tsx

'use client'
import { Search, Factory } from 'lucide-react'
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
  customFiltersSpan?: number

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
  customFiltersSpan = 4,
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

  // Calculate dynamic column spans based on customFilters presence and size
  let plantSpanClass = "sm:col-span-1 lg:col-span-3"
  let dateSpanClass = "sm:col-span-1 lg:col-span-9"
  let customSpanClass = "sm:col-span-1 lg:col-span-4"

  if (customFilters) {
    if (customFiltersSpan === 6) {
      plantSpanClass = "sm:col-span-1 lg:col-span-2"
      dateSpanClass = "sm:col-span-1 lg:col-span-4"
      customSpanClass = "sm:col-span-1 lg:col-span-6"
    } else if (customFiltersSpan === 5) {
      plantSpanClass = "sm:col-span-1 lg:col-span-2"
      dateSpanClass = "sm:col-span-1 lg:col-span-5"
      customSpanClass = "sm:col-span-1 lg:col-span-5"
    } else {
      plantSpanClass = "sm:col-span-1 lg:col-span-3"
      dateSpanClass = "sm:col-span-1 lg:col-span-5"
      customSpanClass = "sm:col-span-1 lg:col-span-4"
    }
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200 dark:border-slate-800 transition-colors duration-200 space-y-4">
      {/* Row 1: Filters (Plant, Date Range, & KPPBC / Custom Filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
        {/* Kolom 1: Plant Filter */}
        {finalShowPlant && plantOptions.length > 0 && (
          <div className={plantSpanClass}>
            <label className="flex items-center h-5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 gap-1.5">
              <Factory className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Plant</span>
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
          <div className={dateSpanClass}>
            <DatePickerWithRange
              label={finalDateLabel}
              dateRange={dateRange}
              onDateChange={handleDateChange}
            />
          </div>
        )}

        {/* Kolom 3: Custom Filters (e.g. KPPBC Select) */}
        {customFilters && (
          <div className={customSpanClass}>{customFilters}</div>
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
