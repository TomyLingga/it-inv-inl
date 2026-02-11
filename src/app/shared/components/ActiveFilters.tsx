// src/app/shared/components/ActiveFilters.tsx

'use client'
import { X } from 'lucide-react'
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
  customActiveFilters
}: ActiveFiltersProps<T>) {
  const activeFiltersCount = 
    Object.keys(columnFilters).length + 
    (searchTerm ? 1 : 0) + 
    (selectedPlant ? 1 : 0) + 
    (dateRange?.start && dateRange?.end ? 1 : 0)

  if (activeFiltersCount === 0 && !customActiveFilters) return null

  return (
    <div className='flex items-center space-x-2 pt-3 sm:pt-4 border-t border-gray-200'>
      <span className='text-xs font-medium text-gray-600'>Filter Aktif ({activeFiltersCount}):</span>
      <div className='flex flex-wrap gap-1.5 sm:gap-2'>
        {/* Plant Filter Badge */}
        {selectedPlant && onClearPlant && (
          <span className='inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700'>
            Plant: {plantOptions.find(p => p.value === selectedPlant)?.label || selectedPlant}
            <X className='w-3 h-3 ml-1 cursor-pointer' onClick={onClearPlant} />
          </span>
        )}
        
        {/* Search Badge */}
        {searchTerm && onClearSearch && (
          <span className='inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700'>
            Pencarian: {searchTerm}
            <X className='w-3 h-3 ml-1 cursor-pointer' onClick={onClearSearch} />
          </span>
        )}
        
        {/* Date Range Badge */}
        {dateRange?.start && dateRange?.end && onClearDateRange && (
          <span className='inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-700'>
            Tanggal: {formatDate(dateRange.start)} <span className='mx-1 text-gray-400'>→</span> {formatDate(dateRange.end)}
            <X className='w-3 h-3 ml-1 cursor-pointer' onClick={onClearDateRange} />
          </span>
        )}
        
        {/* Column Filters Badges */}
        {Object.entries(columnFilters).map(([key, value]) => (
          <span key={key} className='inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs bg-green-100 text-green-700'>
            {columns.find(c => c.key === key)?.label}: {value}
            <X className='w-3 h-3 ml-1 cursor-pointer' onClick={() => onClearColumnFilter?.(key)} />
          </span>
        ))}
        
        {/* Custom Filters */}
        {customActiveFilters}
        
        {/* Clear All Button */}
        <button
          onClick={onClearAll}
          className='text-xs text-red-600 hover:text-red-700 font-medium underline'
        >
          Hapus Semua
        </button>
      </div>
    </div>
  )
}
