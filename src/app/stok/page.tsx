// src/app/stok/page.tsx

'use client'
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/app/components/useAuth"
import Sidebar from "@/app/components/Sidebar"

// Shared Components
import FilterSection from "@/app/shared/components/FilterSection"
import ActiveFilters from "@/app/shared/components/ActiveFilters"
import ExportModal from "@/app/shared/components/ExportModal"
import DataTable from "@/app/shared/components/DataTable"

// Shared Utils & Types
import { StokData, SortConfig, ExportFormat } from "@/app/shared/types"
import { PLANT_OPTIONS } from "@/app/shared/utils/constants"
import { exportToExcel, exportToPDF } from "@/app/shared/utils/exportUtils"
import { 
  getDefaultDateRange, 
  createSortFunction, 
  applyFilters, 
  resequenceData 
} from "@/app/shared/utils/filterUtils"

// Module-specific Config
import { STOK_CONFIG } from "./config"
import { generateDummyStokData } from "./dummyData"

export default function StokPage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Data states
  const [data, setData] = useState<StokData[]>([])
  const [filteredData, setFilteredData] = useState<StokData[]>([])

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState(getDefaultDateRange())
  const [selectedPlant, setSelectedPlant] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [showColumnFilter, setShowColumnFilter] = useState<string | null>(null)

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig<StokData>>({
    key: 'postingDate',
    direction: 'desc'
  })

  // Export states
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('excel')

  // Initialize
  useEffect(() => {
    setIsClient(true)
    setData(generateDummyStokData())
  }, [])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, loading, router])

  // Apply filters and sorting
  useEffect(() => {
    const filtered = applyFilters(data, searchTerm, selectedPlant, dateRange, columnFilters, 'postingDate')
    const sortFn = createSortFunction(sortConfig)
    const sorted = [...filtered].sort(sortFn)
    const resequenced = resequenceData(sorted)
    setFilteredData(resequenced)
  }, [data, searchTerm, selectedPlant, dateRange, columnFilters, sortConfig])

  // Handlers
  const handleSort = (key: keyof StokData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleExport = () => {
    if (exportFormat === 'excel') {
      exportToExcel(
        filteredData, 
        STOK_CONFIG.columns, 
        STOK_CONFIG.exportConfig.filename
      )
    } else {
      exportToPDF(
        filteredData, 
        STOK_CONFIG.columns, 
        STOK_CONFIG.exportConfig.filename,
        STOK_CONFIG.exportConfig.title
      )
    }
    setShowExportModal(false)
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setSelectedPlant('')
    setDateRange(getDefaultDateRange())
    setColumnFilters({})
  }

  const clearColumnFilter = (key: string) => {
    setColumnFilters(prev => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
    setShowColumnFilter(null)
  }

  // Loading & Auth
  if (!isClient || loading) {
    return (
      <div className='flex h-screen bg-gray-50 items-center justify-center'>
        <div className='text-xl text-gray-500 animate-pulse'>Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  return (
    <div className='flex h-screen bg-gray-50'>
      <Sidebar />
      <div className='flex-1 min-w-0 overflow-hidden'>
        <div className='h-full overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
          <div className='max-w-full'>
            {/* Header */}
            <div className='mb-4 lg:mb-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-2 sm:space-x-3'>
                  <span className='text-2xl sm:text-3xl lg:text-4xl'>{STOK_CONFIG.icon}</span>
                  <div>
                    <h1 className='text-2xl sm:text-3xl lg:text-3xl font-bold text-gray-900'>
                      {STOK_CONFIG.title}
                    </h1>
                    <p className='text-gray-600 text-xs sm:text-sm mt-1'>
                      {STOK_CONFIG.description}
                    </p>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-xl sm:text-2xl lg:text-2xl font-bold text-blue-600'>
                    {filteredData.length}
                  </div>
                  <div className='text-xs text-gray-500'>dari {data.length} total data</div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <FilterSection
              config={STOK_CONFIG.filterConfig}
              selectedPlant={selectedPlant}
              onPlantChange={setSelectedPlant}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              dateRange={dateRange}
              onDateChange={(field, value) => setDateRange(prev => ({ ...prev, [field]: value }))}
              onExportClick={() => setShowExportModal(true)}
              dataCount={filteredData.length}
              plantOptions={PLANT_OPTIONS}
            />

            {/* Active Filters */}
            <div className='bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 lg:mb-6 border border-gray-200'>
              <ActiveFilters
                selectedPlant={selectedPlant}
                onClearPlant={() => setSelectedPlant('')}
                searchTerm={searchTerm}
                onClearSearch={() => setSearchTerm('')}
                dateRange={dateRange}
                onClearDateRange={() => setDateRange(getDefaultDateRange())}
                columnFilters={columnFilters}
                onClearColumnFilter={clearColumnFilter}
                onClearAll={clearAllFilters}
                columns={STOK_CONFIG.columns}
                plantOptions={PLANT_OPTIONS}
              />
            </div>

            {/* Export Modal */}
            <ExportModal
              isOpen={showExportModal}
              onClose={() => setShowExportModal(false)}
              dataCount={filteredData.length}
              exportFormat={exportFormat}
              onFormatChange={setExportFormat}
              onExport={handleExport}
            />

            {/* Data Table */}
            <DataTable
              data={filteredData}
              columns={STOK_CONFIG.columns}
              sortConfig={sortConfig}
              onSort={handleSort}
              columnFilters={columnFilters}
              onColumnFilter={(key, value) => setColumnFilters(prev => ({ ...prev, [key]: value }))}
              onClearColumnFilter={clearColumnFilter}
              showColumnFilter={showColumnFilter}
              setShowColumnFilter={setShowColumnFilter}
              onClearAllFilters={clearAllFilters}
              tableConfig={STOK_CONFIG.tableConfig}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
