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
  onExport,
}: ExportModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Export Data</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Export <span className="font-semibold text-slate-800 dark:text-slate-200">{dataCount}</span> data yang sudah difilter
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
                Format Export
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onFormatChange('excel')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                    exportFormat === 'excel'
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <FileSpreadsheet
                    className={`w-8 h-8 mb-2 ${
                      exportFormat === 'excel'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span
                    className={`font-bold text-sm ${
                      exportFormat === 'excel'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    Excel
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">(.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onFormatChange('pdf')}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                    exportFormat === 'pdf'
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <FileText
                    className={`w-8 h-8 mb-2 ${
                      exportFormat === 'pdf'
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span
                    className={`font-bold text-sm ${
                      exportFormat === 'pdf'
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    PDF
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">(.pdf)</span>
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50 space-y-1">
              <strong className="text-slate-800 dark:text-slate-200">Data yang akan diexport:</strong>
              <div>• {dataCount} baris data filtered</div>
              <div>• Format tanggal & angka Indonesia</div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex space-x-3 justify-end rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onExport}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm"
          >
            Export {exportFormat === 'excel' ? 'Excel' : 'PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}
