// src/app/shared/components/FilterSection.tsx

'use client'
import { Search, Download } from 'lucide-react'
import { DateRange, FilterConfig } from '../types'
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range'
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button'

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

  // Export
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

  showExportButton = true,
  onExportClick,
  dataCount = 0,

  customFilters,
  config,
}: FilterSectionProps) {
  const finalDateLabel = config?.dateLabel || dateLabel || 'Filter Tanggal'

  const finalShowPlant = config?.showPlantFilter ?? showPlantFilter
  const finalShowSearch = config?.showGlobalSearch ?? showGlobalSearch
  const finalShowDate = config?.showDateFilter ?? showDateFilter
  const finalShowExport = config?.showExportButton ?? showExportButton

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    if (value > todayStr) return
    onDateChange?.(field, value)
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-200 dark:border-slate-800 transition-colors duration-200">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Plant Filter */}
        {finalShowPlant && plantOptions.length > 0 && (
          <div className="md:col-span-1 lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Plant
            </label>
            <select
              value={selectedPlant}
              onChange={(e) => onPlantChange?.(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
            >
              {plantOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Global Search */}
        {finalShowSearch && (
          <div className="md:col-span-1 lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Pencarian Global
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        )}

        {/* Date Filter */}
        {finalShowDate && dateRange && (
          <div className="md:col-span-2 lg:col-span-4">
            <DatePickerWithRange
              label={finalDateLabel}
              dateRange={dateRange}
              onDateChange={handleDateChange}
            />
          </div>
        )}

        {/* Custom Filters */}
        {customFilters && (
          <div className="md:col-span-1 lg:col-span-3">{customFilters}</div>
        )}

        {/* Export Button */}
        {finalShowExport && (
          <div className="md:col-span-2 lg:col-span-2 flex items-end">
            <InteractiveHoverButton
              onClick={onExportClick}
              disabled={dataCount === 0}
              text="Export"
              icon={<Download className="w-4 h-4" />}
              className="w-full h-10"
            />
          </div>
        )}
      </div>
    </div>
  )
}
