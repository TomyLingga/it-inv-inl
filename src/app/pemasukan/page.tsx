'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/useAuth";
import Sidebar from "@/app/components/Sidebar";
import { Search, Calendar, Download, Filter, X, ArrowUpDown, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface PemasukanData {
  no: number
  jenisDokBC: string
  nomorDokAju: string
  tglDokAju: string
  nomorDokPendaftaran: string
  tglDokPendaftaran: string
  nomorDokumen: string
  pengirim: string
  kodeBarang: string
  kodeHS: string
  namaBarang: string
  satuan: string
  jumlah: number
  nilaiBarang: number
  postingDate: string
}

export default function PemasukanPage() {
  const { isAuthenticated, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel')

  const [data, setData] = useState<PemasukanData[]>([])
  const [filteredData, setFilteredData] = useState<PemasukanData[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [selectedPlant, setSelectedPlant] = useState('')
  const [showColumnFilter, setShowColumnFilter] = useState<string | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof PemasukanData, direction: 'asc' | 'desc' }>({
    key: 'postingDate',
    direction: 'desc'
  })

  const plantOptions = [
    { value: 'IN01', label: 'IN01 - Plant Sei Mangkei' },
    { value: 'IN02', label: 'IN02 - Plant Surabaya' }
  ]

  const dummyData: PemasukanData[] = Array.from({ length: 50 }, (_, i) => {
    const no = i + 1
    const months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
    const randomMonth = months[Math.floor(Math.random() * months.length)]
    const randomDayNum = Math.floor(Math.random() * 28) + 1
    const postingDayNum = Math.floor(Math.random() * 28) + 1
    
    const randomDay = randomDayNum.toString().padStart(2, '0')
    const postingDay = postingDayNum.toString().padStart(2, '0')
    const nextDay = Math.min(randomDayNum + 1, 28).toString().padStart(2, '0')
    const noStr = no.toString().padStart(3, '0')
    const docNo = (100000 + no * 7).toString().padStart(9, '0')
    const hsCode = (30 + (no % 70)).toString().padStart(2, '0')
    
    const [year, month] = randomMonth.split('-')
    
    return {
      no,
      plant: i % 2 === 0 ? 'IN01' : 'IN02',
      jenisDokBC: ['SP2', 'PIB'][Math.floor(Math.random() * 2)],
      nomorDokAju: `BC-${noStr}/${month}/${year}`,
      tglDokAju: `${randomMonth}-${randomDay}`,
      nomorDokPendaftaran: `PEND-${noStr}/${year}`,
      tglDokPendaftaran: `${randomMonth}-${nextDay}`,
      nomorDokumen: `DOC-${docNo}`,
      pengirim: ['PT ABC Import', 'PT GHI Corp', 'UD JKL Import', 'PT MNO Trading', 'CV PQR Supplier'][Math.floor(Math.random() * 5)],
      kodeBarang: `BRG${noStr}`,
      kodeHS: `8471.${hsCode}`,
      namaBarang: [
        'Laptop Dell XPS 13', 'Printer HP LaserJet', 'Keyboard Mechanical', 'Monitor LG 24"', 
        'Mouse Logitech Wireless', 'Harddisk SSD 1TB', 'RAM 16GB DDR4', 'Webcam HD'
      ][Math.floor(Math.random() * 8)],
      satuan: ['PCS', 'SET', 'UNIT'][Math.floor(Math.random() * 3)],
      jumlah: 10 + Math.floor(Math.random() * 90),
      nilaiBarang: 5000000 + Math.floor(Math.random() * 45000000),
      postingDate: `${randomMonth}-${postingDay}`
    }
  })

  // ✅ EXPORT FUNCTIONS
  const exportToExcel = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data untuk diexport!')
      return
    }

    const exportData = filteredData.map(row => ({
      'No': row.no,
      'Posting Date': row.postingDate,
      'Jenis Dok BC': row.jenisDokBC,
      'Nomor Dok Aju': row.nomorDokAju,
      'Tgl Dok Aju': row.tglDokAju,
      'Nomor Dok Pendftr': row.nomorDokPendaftaran,
      'Tgl Dok Pendftr': row.tglDokPendaftaran,
      'Nomor Dokumen': row.nomorDokumen,
      'Pengirim': row.pengirim,
      'Kode Barang': row.kodeBarang,
      'Kode HS': row.kodeHS,
      'Nama Barang': row.namaBarang,
      'Satuan': row.satuan,
      'Jumlah': row.jumlah,
      'Nilai Barang': `Rp ${row.nilaiBarang.toLocaleString('id-ID')}`
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pemasukan Barang')

    const colWidths = exportData[0]
      ? Object.keys(exportData[0]).map(() => ({ wch: 18 }))
      : []

    ws['!cols'] = colWidths

    XLSX.writeFile(
      wb,
      `Pemasukan_Barang_${new Date().toISOString().split('T')[0]}.xlsx`
    )

    setShowExportModal(false)
  }


  const exportToPDF = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data untuk diexport!')
      return
    }

    const doc = new jsPDF('l', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()

    // ===== HEADER =====
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text(
      'LAPORAN PEMASUKAN BARANG',
      pageWidth / 2,
      15,
      { align: 'center' }
    )

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(
      `Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`,
      pageWidth / 2,
      25,
      { align: 'center' }
    )
    doc.text(
      `Total Data: ${filteredData.length}`,
      pageWidth / 2,
      32,
      { align: 'center' }
    )

    // ===== TABLE HEADER (NO PLANT) =====
    const headers = [
      'No',
      'Posting Date',
      'Jenis Dok BC',
      'Nomor Dok Aju',
      'Tgl Dok Aju',
      'Nomor Dok Pendftr',
      'Tgl Dok Pendftr',
      'Nomor Dokumen',
      'Pengirim',
      'Kode Barang',
      'Kode HS',
      'Nama Barang',
      'Satuan',
      'Jumlah',
      'Nilai Barang'
    ]

    // ===== TABLE BODY (NO PLANT) =====
    const body = filteredData.map(row => [
      row.no.toString(),
      row.postingDate,
      row.jenisDokBC,
      row.nomorDokAju,
      row.tglDokAju,
      row.nomorDokPendaftaran,
      row.tglDokPendaftaran,
      row.nomorDokumen,
      row.pengirim,
      row.kodeBarang,
      row.kodeHS,
      row.namaBarang,
      row.satuan,
      row.jumlah.toLocaleString(),
      `Rp ${row.nilaiBarang.toLocaleString('id-ID')}`
    ])

    // ===== TABLE =====
    autoTable(doc, {
      head: [headers],
      body,
      startY: 40,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: 2,
        overflow: 'linebreak',
        halign: 'center',
        valign: 'middle'
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 10, right: 10 },

      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 22 },
        12: { cellWidth: 12 },
        13: { cellWidth: 15 },
        14: { cellWidth: 28 }
      },

      // ===== FOOTER =====
      didDrawPage: (data) => {
        const pageCount = doc.getNumberOfPages()

        const cursorY =
          data.cursor && data.cursor.y
            ? data.cursor.y
            : 40

        if (data.pageNumber === pageCount) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'italic')
          doc.text(
            'Dicetak dari Sistem Pemasukan Barang',
            pageWidth / 2,
            cursorY + 10,
            { align: 'center' }
          )
        }
      }
    })

    doc.save(
      `Pemasukan_Barang_${new Date().toISOString().split('T')[0]}.pdf`
    )

    setShowExportModal(false)
  }


  // ... rest of your existing useEffect hooks and functions remain THE SAME ...
  
  useEffect(() => {
    setData(dummyData)
    setFilteredData(dummyData)
  }, [])

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/')
    }
  }, [isAuthenticated, loading, router])

  useEffect(() => {
    if (isClient) {
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const startDate = firstDayOfMonth.toISOString().split('T')[0]
      const endDate = today.toISOString().split('T')[0]
      setDateRange({ start: startDate, end: endDate })
    }
  }, [isClient])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const sortData = (a: PemasukanData, b: PemasukanData) => {
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]
    
    if (sortConfig.key === 'postingDate') {
      const dateA = new Date(a.postingDate).getTime()
      const dateB = new Date(b.postingDate).getTime()
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA
    }
    
    const aStr = aValue?.toString().toLowerCase() || ''
    const bStr = bValue?.toString().toLowerCase() || ''
    
    if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1
    if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1
    return 0
  }

  useEffect(() => {
    let filtered = [...data]
    
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(val => 
          val?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    }
    
    // if (selectedPlant) {
    //   filtered = filtered.filter(row => row.plant === selectedPlant)
    // }
    
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter(row => {
        const postingDate = new Date(row.postingDate)
        return postingDate >= new Date(dateRange.start) && postingDate <= new Date(dateRange.end)
      })
    }
    
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(row => 
          row[key as keyof PemasukanData]?.toString().toLowerCase().includes(value.toLowerCase())
        )
      }
    })
    
    filtered.sort(sortData)
    
    const resequencedData = filtered.map((row, index) => ({
      ...row,
      no: index + 1
    }))
    
    setFilteredData(resequencedData)
  }, [searchTerm, selectedPlant, dateRange, columnFilters, data, sortConfig])

  const handleSort = (key: keyof PemasukanData) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const handleDateChange = (field: 'start' | 'end', value: string) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    if (value > todayStr) return
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const handleColumnFilter = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearColumnFilter = (key: string) => {
    setColumnFilters(prev => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
    setShowColumnFilter(null)
  }

  const clearAllFilters = () => {
    setSearchTerm('')
    setSelectedPlant('')
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    setDateRange({
      start: firstDayOfMonth.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    })
    setColumnFilters({})
  }

  const activeFiltersCount = Object.keys(columnFilters).length + 
    (searchTerm ? 1 : 0) + 
    (selectedPlant ? 1 : 0) + 
    (dateRange.start && dateRange.end ? 1 : 0)

  if (!isClient || loading) {
    return (
      <div className='flex h-screen bg-gray-50 items-center justify-center'>
        <div className='text-xl text-gray-500 animate-pulse'>Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) return null

  const columns = [
    { key: 'no' as keyof PemasukanData, label: 'No', filterable: false, sortable: false },
    { key: 'postingDate' as keyof PemasukanData, label: 'Posting Date', filterable: false, sortable: true },
    { key: 'jenisDokBC' as keyof PemasukanData, label: 'Jenis Dok BC', filterable: true, sortable: true },
    { key: 'nomorDokAju' as keyof PemasukanData, label: 'Nomor Dok Aju', filterable: true, sortable: true },
    { key: 'tglDokAju' as keyof PemasukanData, label: 'Tgl Dok Aju', filterable: false, sortable: true },
    { key: 'nomorDokPendaftaran' as keyof PemasukanData, label: 'Nomor Dok Pendftr', filterable: true, sortable: true },
    { key: 'tglDokPendaftaran' as keyof PemasukanData, label: 'Tgl Dok Pendftr', filterable: false, sortable: true },
    { key: 'nomorDokumen' as keyof PemasukanData, label: 'Nomor Dokumen', filterable: true, sortable: true },
    { key: 'pengirim' as keyof PemasukanData, label: 'Pengirim', filterable: true, sortable: true },
    { key: 'kodeBarang' as keyof PemasukanData, label: 'Kode Barang', filterable: true, sortable: true },
    { key: 'kodeHS' as keyof PemasukanData, label: 'Kode HS', filterable: true, sortable: true },
    { key: 'namaBarang' as keyof PemasukanData, label: 'Nama Barang', filterable: true, sortable: true },
    { key: 'satuan' as keyof PemasukanData, label: 'Satuan', filterable: true, sortable: true },
    { key: 'jumlah' as keyof PemasukanData, label: 'Jumlah', filterable: false, sortable: true },
    { key: 'nilaiBarang' as keyof PemasukanData, label: 'Nilai Barang', filterable: false, sortable: true },
  ]

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
                  <span className='text-2xl sm:text-3xl lg:text-4xl'>📈</span>
                  <div>
                    <h1 className='text-2xl sm:text-3xl lg:text-3xl font-bold text-gray-900'>Pemasukan Barang</h1>
                    <p className='text-gray-600 text-xs sm:text-sm mt-1'>Kelola data barang masuk ke gudang</p>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-xl sm:text-2xl lg:text-2xl font-bold text-blue-600'>{filteredData.length}</div>
                  <div className='text-xs text-gray-500'>dari {data.length} total data</div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className='bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-4 lg:mb-6 border border-gray-200'>
              <div className='grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 mb-3 sm:mb-4'>
                <div className='lg:col-span-3'>
                  <label className='block text-xs font-medium text-gray-700 mb-1.5'>Plant</label>
                  <select
                    value={selectedPlant}
                    onChange={(e) => setSelectedPlant(e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
                  >
                    {plantOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='lg:col-span-4'>
                  <label className='block text-xs font-medium text-gray-700 mb-1.5'>Pencarian Global</label>
                  <div className='relative'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5' />
                    <input
                      type='text'
                      placeholder='Cari nomor dokumen, nama barang, pengirim...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className='w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
                    />
                  </div>
                </div>

                <div className='lg:col-span-3'>
                  <label className='block text-xs font-medium text-gray-700 mb-1.5'>Filter Tanggal Posting Date</label>
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

                <div className='lg:col-span-2 flex items-end'>
                  <button 
                    onClick={() => setShowExportModal(true)}
                    disabled={filteredData.length === 0}
                    className='w-full px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-medium flex items-center justify-center space-x-1.5 text-sm'
                  >
                    <Download className='w-3 h-3 sm:w-4 sm:h-4' />
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {activeFiltersCount > 0 && (
                <div className='flex items-center space-x-2 pt-3 sm:pt-4 border-t border-gray-200'>
                  <span className='text-xs font-medium text-gray-600'>Filter Aktif ({activeFiltersCount}):</span>
                  <div className='flex flex-wrap gap-1.5 sm:gap-2'>
                    {selectedPlant && (
                      <span className='inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs bg-indigo-100 text-indigo-700'>
                        Plant: {plantOptions.find(p => p.value === selectedPlant)?.label}
                        <X className='w-3 h-3 ml-1 cursor-pointer' onClick={() => setSelectedPlant('')} />
                      </span>
                    )}
                    {searchTerm && (
                      <span className='inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700'>
                        Pencarian: {searchTerm}
                        <X className='w-3 h-3 ml-1 cursor-pointer' onClick={() => setSearchTerm('')} />
                      </span>
                    )}
                    {dateRange.start && dateRange.end && (
                      <span className='inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs bg-purple-100 text-purple-700'>
                        Tanggal: {formatDate(dateRange.start)} <span className='mx-1 text-gray-400'>→</span> {formatDate(dateRange.end)}
                        <X className='w-3 h-3 ml-1 cursor-pointer' onClick={() => {
                          const today = new Date()
                          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
                          setDateRange({
                            start: firstDayOfMonth.toISOString().split('T')[0],
                            end: today.toISOString().split('T')[0]
                          })
                        }} />
                      </span>
                    )}
                    {Object.entries(columnFilters).map(([key, value]) => (
                      <span key={key} className='inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full text-xs bg-green-100 text-green-700'>
                        {columns.find(c => c.key === key)?.label}: {value}
                        <X className='w-3 h-3 ml-1 cursor-pointer' onClick={() => clearColumnFilter(key)} />
                      </span>
                    ))}
                    <button
                      onClick={clearAllFilters}
                      className='text-xs text-red-600 hover:text-red-700 font-medium underline'
                    >
                      Hapus Semua
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* EXPORT MODAL */}
            {showExportModal && (
              <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
                <div className='bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto'>
                  <div className='p-6 border-b border-gray-200'>
                    <h3 className='text-lg font-bold text-gray-900 mb-2'>Export Data</h3>
                    <p className='text-sm text-gray-600'>Export {filteredData.length} data yang sudah difilter</p>
                  </div>
                  
                  <div className='p-6'>
                    <div className='space-y-4'>
                      <div>
                        <label className='block text-sm font-medium text-gray-700 mb-2'>Format Export</label>
                        <div className='grid grid-cols-2 gap-3'>
                          <button
                            onClick={() => setExportFormat('excel')}
                            className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                              exportFormat === 'excel'
                                ? 'border-green-500 bg-green-50 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <FileSpreadsheet className={`w-8 h-8 mb-2 ${exportFormat === 'excel' ? 'text-green-600' : 'text-gray-400'}`} />
                              <span className={`font-medium text-sm ${exportFormat === 'excel' ? 'text-green-700' : 'text-gray-900'}`}>Excel</span>
                              <span className='text-xs text-gray-500'>(.xlsx)</span>
                          </button>
                          <button
                            onClick={() => setExportFormat('pdf')}
                            className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                              exportFormat === 'pdf'
                                ? 'border-red-500 bg-red-50 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                             <FileText className={`w-8 h-8 mb-2 ${exportFormat === 'pdf' ? 'text-red-600' : 'text-gray-400'}`} />
                              <span className={`font-medium text-sm ${exportFormat === 'pdf' ? 'text-red-700' : 'text-gray-900'}`}>PDF</span>
                              <span className='text-xs text-gray-500'>(.pdf)</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className='text-xs text-gray-500 bg-gray-50 p-3 rounded-lg'>
                        <strong>Data yang akan diexport:</strong><br/>
                        • {filteredData.length} baris data filtered<br/>
                        • Format tanggal & angka Indonesia
                      </div>
                    </div>
                  </div>
                  
                  <div className='px-6 py-4 bg-gray-50 border-t border-gray-200 flex space-x-3 justify-end'>
                    <button
                      onClick={() => setShowExportModal(false)}
                      className='px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all'
                    >
                      Batal
                    </button>
                    <button
                      onClick={exportFormat === 'excel' ? exportToExcel : exportToPDF}
                      className='px-6 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-all shadow-sm'
                    >
                      Export {exportFormat === 'excel' ? 'Excel' : 'PDF'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Table - REMAINS EXACTLY THE SAME */}
            <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200'>
                    <tr>
                      {columns.map((col) => (
                        <th 
                          key={col.key} 
                          className='px-2 sm:px-3 lg:px-4 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-gray-100'
                          onClick={() => col.sortable && handleSort(col.key)}
                        >
                          <div className='flex items-center justify-between space-x-1 sm:space-x-2'>
                            <span className='truncate'>{col.label}</span>
                            {col.sortable && (
                              <div className='flex items-center space-x-0.5'>
                                <ArrowUpDown className={`w-3 h-3 sm:w-4 sm:h-4 text-gray-400 ${sortConfig.key === col.key ? 'text-blue-600' : ''}`} />
                                {sortConfig.key === col.key && (
                                  <span className={`text-xs ${sortConfig.direction === 'desc' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                                    {sortConfig.direction === 'desc' ? '↓' : '↑'}
                                  </span>
                                )}
                              </div>
                            )}
                            {col.filterable && col.key !== 'postingDate' && (
                              <div className='relative flex-shrink-0 ml-1'>
                                <Filter 
                                  className={`w-3 h-3 sm:w-4 sm:h-4 cursor-pointer transition-colors ${
                                    columnFilters[col.key as string] ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setShowColumnFilter(showColumnFilter === col.key ? null : col.key)
                                  }}
                                />
                                {showColumnFilter === col.key && (
                                  <div className='absolute top-6 right-0 z-50 bg-white border border-gray-300 rounded-lg shadow-xl p-2.5 sm:p-3 w-56 sm:w-64'>
                                    <div className='mb-1.5 sm:mb-2'>
                                      <label className='text-xs font-medium text-gray-700'>Filter {col.label}</label>
                                    </div>
                                    <input
                                      type='text'
                                      placeholder={`Cari ${col.label.toLowerCase()}...`}
                                      value={columnFilters[col.key as string] || ''}
                                      onChange={(e) => handleColumnFilter(col.key as string, e.target.value)}
                                      className='w-full px-2.5 sm:px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-gray-900 text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                      autoFocus
                                    />
                                    <div className='mt-1.5 sm:mt-2 flex justify-end space-x-1.5 sm:space-x-2'>
                                      <button
                                        onClick={() => clearColumnFilter(col.key as string)}
                                        className='px-2.5 sm:px-3 py-1 text-xs text-gray-600 hover:text-gray-800'
                                      >
                                        Clear
                                      </button>
                                      <button
                                        onClick={() => setShowColumnFilter(null)}
                                        className='px-2.5 sm:px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700'
                                      >
                                        OK
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200 bg-white'>
                    {filteredData.map((row, idx) => (
                      <tr key={`${row.nomorDokumen}-${idx}`} className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900'>{row.no}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded'>
                          {row.postingDate}
                        </td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm'>
                          <span className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium ${
                            row.jenisDokBC === 'SP2' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {row.jenisDokBC}
                          </span>
                        </td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline'>{row.nomorDokAju}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm text-gray-700'>{row.tglDokAju}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm text-gray-700'>{row.nomorDokPendaftaran}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm text-gray-700'>{row.tglDokPendaftaran}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-mono text-gray-700'>{row.nomorDokumen}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 text-xs sm:text-sm text-gray-900 max-w-xs truncate'>{row.pengirim}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-mono text-gray-700'>{row.kodeBarang}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-mono text-gray-700'>{row.kodeHS}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 text-xs sm:text-sm text-gray-900 max-w-[200px] sm:max-w-md truncate'>{row.namaBarang}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm text-gray-700'>{row.satuan}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-semibold text-green-600'>{row.jumlah.toLocaleString()}</td>
                        <td className='px-2 sm:px-3 lg:px-4 py-2.5 whitespace-nowrap text-xs sm:text-sm font-bold text-gray-900'>Rp {row.nilaiBarang.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredData.length === 0 && (
                <div className='text-center py-12 sm:py-16 bg-gray-50'>
                  <div className='text-4xl sm:text-6xl mb-4'>🔍</div>
                  <h3 className='text-lg sm:text-xl font-semibold text-gray-900 mb-2'>Tidak ada data ditemukan</h3>
                  <p className='text-gray-500 mb-6 text-sm'>Coba ubah filter atau kata kunci pencarian Anda</p>
                  <button
                    onClick={clearAllFilters}
                    className='px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm'
                  >
                    Reset Semua Filter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
