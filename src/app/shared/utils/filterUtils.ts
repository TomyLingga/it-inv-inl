// src/app/shared/utils/filterUtils.ts

import { BaseData, SortConfig, DateRange } from '../types'

export const parseSapDate = (val: string | null | undefined): Date | null => {
  if (!val) return null
  const str = String(val).trim()
  if (!str) return null

  // Format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  }

  // Format YYYYMMDD
  if (/^\d{8}$/.test(str)) {
    const y = parseInt(str.substring(0, 4), 10)
    const m = parseInt(str.substring(4, 6), 10) - 1
    const d = parseInt(str.substring(6, 8), 10)
    return new Date(y, m, d)
  }

  // Format DD.MM.YYYY
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(str)) {
    const parts = str.split('.')
    const d = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10) - 1
    const y = parseInt(parts[2], 10)
    return new Date(y, m, d)
  }

  const parsed = new Date(str)
  return isNaN(parsed.getTime()) ? null : parsed
}

export const normalizeCode = (code: string | null | undefined): string => {
  if (!code) return ''
  return String(code).trim().replace(/^0+/, '')
}

export const formatDate = (dateString: string): string => {
  const date = parseSapDate(dateString)
  if (!date) return dateString || '-'
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
      const dateA = parseSapDate(a[sortConfig.key] as string)?.getTime() ?? 0
      const dateB = parseSapDate(b[sortConfig.key] as string)?.getTime() ?? 0
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
  columnFilters: Record<string, string>,
  dateFilterField: keyof T = 'tglDokPendaftaran' as keyof T // ← default tetap sama seperti Pemasukan
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
  
  // Date range filter — menggunakan field yang dikonfigurasi
  if (dateRange.start && dateRange.end) {
    const startDate = parseSapDate(dateRange.start)
    const endDate = parseSapDate(dateRange.end)
    if (startDate && endDate) {
      endDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter(row => {
        const rawDate = row[dateFilterField] as string
        const dateValue = parseSapDate(rawDate)
        if (!dateValue) return true
        return dateValue >= startDate && dateValue <= endDate
      })
    }
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