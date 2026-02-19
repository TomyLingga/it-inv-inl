// src/app/shared/components/FilterSection.tsx

'use client'
import { Search, Calendar, Download } from 'lucide-react'
import { DateRange, FilterConfig } from '../types'  // ✅ Pastikan import FilterConfig

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
  dateLabel?: string  // ✅ Type sudah ada
  
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
  dateLabel = 'Filter Tanggal',  // ✅ FIXED: Default string biasa
  
  showExportButton = true,
  onExportClick,
  dataCount = 0,
  
  customFilters,
  config
}: FilterSectionProps) {
  // ✅ FIXED: Ambil dateLabel dari config atau props
  const finalDateLabel = config?.dateLabel || dateLabel || 'Filter Tanggal'
  
  // Use config if provided
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

  // Calculate grid columns
  let gridCols = 'lg:grid-cols-12'
  const activeFilters = [
    finalShowPlant,
    finalShowSearch,
    finalShowDate,
    finalShowExport,
    !!customFilters
  ].filter(Boolean).length

  return (
    <div className='bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 lg:mb-6 border border-gray-200'>
      <div className={`grid grid-cols-1 ${gridCols} gap-3 sm:gap-4`}>
        {/* Plant Filter */}
        {finalShowPlant && plantOptions.length > 0 && (
          <div className='lg:col-span-3'>
            <label className='block text-xs font-medium text-gray-700 mb-1.5'>Plant</label>
            <select
              value={selectedPlant}
              onChange={(e) => onPlantChange?.(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
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
          <div className='lg:col-span-4'>
            <label className='block text-xs font-medium text-gray-700 mb-1.5'>Pencarian Global</label>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5' />
              <input
                type='text'
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange?.(e.target.value)}
                className='w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
              />
            </div>
          </div>
        )}

        {/* Date Filter */}
        {finalShowDate && dateRange && (
          <div className='lg:col-span-3'>
            <label className='block text-xs font-medium text-gray-700 mb-1.5'>
              {finalDateLabel}
            </label>
            <div className='flex space-x-1 sm:space-x-2'>
              <input
                type='date'
                value={dateRange.start}
                onChange={(e) => handleDateChange('start', e.target.value)}
                max={dateRange.end || new Date().toISOString().split('T')[0]}
                className='flex-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              />
              <div className='flex items-center px-1 sm:px-2'>
                <Calendar className='w-4 h-4 sm:w-5 sm:h-5 text-gray-400' />
              </div>
              <input
                type='date'
                value={dateRange.end}
                onChange={(e) => handleDateChange('end', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className='flex-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              />
            </div>
          </div>
        )}

        {/* Custom Filters */}
        {customFilters && (
          <div className='lg:col-span-3'>
            {customFilters}
          </div>
        )}

        {/* Export Button */}
        {finalShowExport && (
          <div className='lg:col-span-2 flex items-end'>
            <button 
              onClick={onExportClick}
              disabled={dataCount === 0}
              className='w-full px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center space-x-1.5 text-sm'
            >
              <Download className='w-3 h-3 sm:w-4 sm:h-4' />
              <span>Export</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
