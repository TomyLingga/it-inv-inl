// src/app/shared/components/ExportModal.tsx

'use client'
import { FileText, FileSpreadsheet } from 'lucide-react'
import { ExportFormat } from '../types'

interface ExportModalProps {
  isOpen: boolean
  onClose: () => void
  dataCount: number
  exportFormat: ExportFormat
  onFormatChange: (format: ExportFormat) => void
  onExport: () => void
}

export default function ExportModal({
  isOpen,
  onClose,
  dataCount,
  exportFormat,
  onFormatChange,
  onExport
}: ExportModalProps) {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto'>
        <div className='p-6 border-b border-gray-200'>
          <h3 className='text-lg font-bold text-gray-900 mb-2'>Export Data</h3>
          <p className='text-sm text-gray-600'>Export {dataCount} data yang sudah difilter</p>
        </div>
        
        <div className='p-6'>
          <div className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Format Export</label>
              <div className='grid grid-cols-2 gap-3'>
                <button
                  onClick={() => onFormatChange('excel')}
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
                  onClick={() => onFormatChange('pdf')}
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
              • {dataCount} baris data filtered<br/>
              • Format tanggal & angka Indonesia
            </div>
          </div>
        </div>
        
        <div className='px-6 py-4 bg-gray-50 border-t border-gray-200 flex space-x-3 justify-end'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-all'
          >
            Batal
          </button>
          <button
            onClick={onExport}
            className='px-6 py-2 text-sm font-medium text-white bg-cyan-600 rounded-lg hover:bg-cyan-700 transition-all shadow-sm'
          >
            Export {exportFormat === 'excel' ? 'Excel' : 'PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
