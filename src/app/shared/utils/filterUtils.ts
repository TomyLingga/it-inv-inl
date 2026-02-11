// src/app/shared/utils/filterUtils.ts

import { BaseData, SortConfig, DateRange } from '../types'

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export const getDefaultDateRange = (): DateRange => {
  const today = new Date()
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  return {
    start: firstDayOfMonth.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  }
}

export const createSortFunction = <T extends BaseData>(sortConfig: SortConfig<T>) => {
  return (a: T, b: T): number => {
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]
    
    // Date sorting
    if (sortConfig.key === 'postingDate' || sortConfig.key.toString().includes('tgl')) {
      const dateA = new Date(a[sortConfig.key] as string).getTime()
      const dateB = new Date(b[sortConfig.key] as string).getTime()
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA
    }
    
    // Number sorting
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    // String sorting
    const aStr = aValue?.toString().toLowerCase() || ''
    const bStr = bValue?.toString().toLowerCase() || ''
    
    if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
    if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
    return 0
  }
}

export const applyFilters = <T extends BaseData>(
  data: T[],
  searchTerm: string,
  selectedPlant: string,
  dateRange: DateRange,
  columnFilters: Record<string, string>
): T[] => {
  let filtered = [...data]
  
  // Global search
  if (searchTerm) {
    filtered = filtered.filter(row =>
      Object.values(row).some(val => 
        val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      )
    )
  }
  
  // Plant filter (if exists in data)
  // if (selectedPlant && filtered.length > 0 && 'plant' in filtered[0]) {
  //   filtered = filtered.filter(row => (row as any).plant === selectedPlant)
  // }
  
  // Date range filter
  if (dateRange.start && dateRange.end) {
    filtered = filtered.filter(row => {
      const postingDate = new Date(row.postingDate)
      return postingDate >= new Date(dateRange.start) && postingDate <= new Date(dateRange.end)
    })
  }
  
  // Column filters
  Object.entries(columnFilters).forEach(([key, value]) => {
    if (value) {
      filtered = filtered.filter(row => 
        row[key as keyof T]?.toString().toLowerCase().includes(value.toLowerCase())
      )
    }
  })
  
  return filtered
}

export const resequenceData = <T extends BaseData>(data: T[]): T[] => {
  return data.map((row, index) => ({
    ...row,
    no: index + 1
  }))
}

export const calculateTotal = <T extends Record<string, any>>(
  data: T[],
  field: keyof T
): number => {
  return data.reduce((sum, row) => {
    const value = row[field]
    return sum + (typeof value === 'number' ? value : 0)
  }, 0)
}

export const formatCurrency = (value: number): string => {
  return `Rp ${value.toLocaleString('id-ID')}`
}

export const formatNumber = (value: number): string => {
  return value.toLocaleString('id-ID')
}
