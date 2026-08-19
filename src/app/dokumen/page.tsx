// src/app/dokumen/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import Sidebar, { Topbar } from '@/app/components/Sidebar'
import { toast } from '@/app/components/ui/AppToast'
import {
  FolderOpen,
  Upload,
  Search,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  File,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Calendar,
  Plus,
  Eye,
  Filter,
  ExternalLink,
  Info,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DocumentItem {
  id: number
  name: string
  document_date: string
  file_name: string
  file_size: number
  mime_type: string
  description: string | null
  uploaded_by: string | null
  created_at: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────────
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function getDefaultDateRange() {
  const today = new Date()
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(today.getMonth() - 1)

  const toIso = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return {
    from: toIso(oneMonthAgo),
    to: toIso(today),
  }
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

function isPdf(doc: DocumentItem): boolean {
  const ext = getFileExtension(doc.file_name)
  return doc.mime_type === 'application/pdf' || ext === 'pdf'
}

function isWord(doc: DocumentItem): boolean {
  const ext = getFileExtension(doc.file_name)
  return ext === 'doc' || ext === 'docx' || doc.mime_type.includes('word') || doc.mime_type.includes('officedocument.wordprocessingml')
}

function isExcel(doc: DocumentItem): boolean {
  const ext = getFileExtension(doc.file_name)
  return ext === 'xls' || ext === 'xlsx' || doc.mime_type.includes('excel') || doc.mime_type.includes('spreadsheetml')
}

function getFileIcon(docOrMime: string | DocumentItem) {
  const mime = typeof docOrMime === 'string' ? docOrMime : docOrMime.mime_type
  const name = typeof docOrMime === 'string' ? '' : docOrMime.file_name
  const ext = getFileExtension(name)

  if (mime === 'application/pdf' || ext === 'pdf')
    return <FileText className="w-5 h-5 text-rose-500" />
  if (mime.includes('spreadsheet') || mime.includes('excel') || ext === 'xls' || ext === 'xlsx')
    return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
  if (mime.includes('word') || ext === 'doc' || ext === 'docx')
    return <FileText className="w-5 h-5 text-blue-500" />
  return <File className="w-5 h-5 text-slate-400" />
}

function getFileTypeBadge(doc: DocumentItem) {
  if (isPdf(doc))
    return <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">PDF</span>
  if (isExcel(doc))
    return <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">Excel</span>
  if (isWord(doc))
    return <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">Word</span>
  return <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">File</span>
}

function LoadingOverlay() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Memuat...</span>
      </div>
    </div>
  )
}

// ─── Preview Modal ──────────────────────────────────────────────────────────────
interface PreviewModalProps {
  doc: DocumentItem
  onClose: () => void
}

function PreviewModal({ doc, onClose }: PreviewModalProps) {
  const pdfMode = isPdf(doc)
  const wordMode = isWord(doc)
  const excelMode = isExcel(doc)

  const previewUrl = `/api/documents/${doc.id}/preview`
  const downloadUrl = `/api/documents/${doc.id}/download`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Box */}
      <div
        className={`relative w-full ${
          pdfMode ? 'max-w-5xl h-[90vh]' : 'max-w-lg'
        } bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
              {getFileIcon(doc)}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                {doc.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                <span className="truncate max-w-[200px]">{doc.file_name}</span>
                <span>•</span>
                <span>{formatFileSize(doc.file_size)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {pdfMode && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-200/70 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                title="Buka di tab baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Tab Baru</span>
              </a>
            )}
            <a
              href={downloadUrl}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors"
              title="Unduh file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {pdfMode ? (
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 overflow-hidden">
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
              title={doc.name}
            />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Info Card */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tipe Dokumen</span>
                {getFileTypeBadge(doc)}
              </div>

              <div className="space-y-1.5 pt-1 border-t border-slate-200/80 dark:border-slate-700/50">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Tanggal Dokumen:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(doc.document_date)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Ukuran File:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{formatFileSize(doc.file_size)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Diunggah Oleh:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{doc.uploaded_by || '-'}</span>
                </div>
              </div>

              {doc.description && (
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Keterangan:</span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                    {doc.description}
                  </p>
                </div>
              )}
            </div>

            {/* Note */}
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 text-blue-800 dark:text-blue-300 text-xs">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <span>
                File <strong>{wordMode ? 'Word (.doc/.docx)' : excelMode ? 'Excel (.xls/.xlsx)' : 'dokumen'}</strong> dapat diunduh untuk dibuka dan diedit menggunakan aplikasi pengolah dokumen Anda.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
              <a
                href={downloadUrl}
                className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Unduh File</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Upload Modal ───────────────────────────────────────────────────────────────
interface UploadModalProps {
  onClose: () => void
  onSuccess: () => void
  userName: string | null
}

function UploadModal({ onClose, onSuccess, userName }: UploadModalProps) {
  const [docName, setDocName] = useState('')
  const [docDate, setDocDate] = useState(new Date().toISOString().split('T')[0])
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx']
  const MAX_SIZE_MB = 50

  function validateFile(f: File): string {
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXTENSIONS.includes(ext))
      return 'Format tidak diizinkan. Hanya PDF (.pdf), Word (.doc, .docx), Excel (.xls, .xlsx).'
    if (f.size > MAX_SIZE_MB * 1024 * 1024)
      return `Ukuran file melebihi batas ${MAX_SIZE_MB} MB.`
    return ''
  }

  function handleFileSelect(f: File) {
    const err = validateFile(f)
    setFileError(err)
    if (!err) setFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return toast.error('Pilih file terlebih dahulu.')
    if (!docName.trim()) return toast.error('Nama dokumen wajib diisi.')
    if (!docDate) return toast.error('Tanggal dokumen wajib diisi.')

    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('name', docName.trim())
      fd.append('document_date', docDate)
      fd.append('file', file)
      if (description.trim()) fd.append('description', description.trim())
      if (userName) fd.append('uploaded_by', userName)

      const res = await fetch('/api/documents', { method: 'POST', body: fd })
      const json = await res.json()

      if (json.success) {
        toast.success('Dokumen berhasil diupload!')
        onSuccess()
        onClose()
      } else {
        toast.error(json.message ?? 'Gagal upload dokumen.')
      }
    } catch {
      toast.error('Terjadi kesalahan. Coba lagi.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={!uploading ? onClose : undefined} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 shadow-md shadow-indigo-500/30">
              <Upload className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Upload Dokumen</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">PDF, Word, Excel — maks. 50 MB</p>
            </div>
          </div>
          {!uploading && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Nama Dokumen */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Nama Dokumen <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="Contoh: Berita Acara Stock Opname Juli 2026"
              required
              disabled={uploading}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:opacity-60"
            />
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tanggal Dokumen <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              required
              disabled={uploading}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all disabled:opacity-60"
            />
          </div>

          {/* Keterangan */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Keterangan <span className="text-slate-400 font-normal">(opsional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Tambahkan catatan atau keterangan dokumen..."
              disabled={uploading}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none disabled:opacity-60"
            />
          </div>

          {/* Drop Zone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              File <span className="text-rose-500">*</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all
                ${isDragging
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : file
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20'
                }
                ${uploading ? 'pointer-events-none opacity-60' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFileSelect(e.target.files[0]) }}
              />
              {file ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
                    {getFileIcon(file.name)}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setFileError('') }}
                    className="absolute top-2 right-2 p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Upload className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Drag & drop atau <span className="text-indigo-600 dark:text-indigo-400">klik untuk pilih</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">PDF, Word (.doc/.docx), Excel (.xls/.xlsx) — maks. 50 MB</p>
                  </div>
                </>
              )}
            </div>
            {fileError && (
              <p className="mt-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{fileError}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !!fileError}
              className="flex-1 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Mengupload...</>
              ) : (
                <><Upload className="w-4 h-4" />Upload</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function DokumenPage() {
  const { isAuthenticated, userName, loading } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Default date range: 1 bulan terakhir
  const defaultRange = getDefaultDateRange()

  // Data
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Filters (Default 1 bulan terakhir)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState(defaultRange.from)
  const [dateTo, setDateTo] = useState(defaultRange.to)

  // Applied filters
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedDateFrom, setAppliedDateFrom] = useState(defaultRange.from)
  const [appliedDateTo, setAppliedDateTo] = useState(defaultRange.to)

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [previewTarget, setPreviewTarget] = useState<DocumentItem | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // isClient guard
  useEffect(() => { setIsClient(true) }, [])
  useEffect(() => {
    if (isClient && !loading && !isAuthenticated) router.replace('/')
  }, [isClient, loading, isAuthenticated, router])

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    setIsFetching(true)
    setFetchError(null)
    try {
      const params = new URLSearchParams()
      if (appliedSearch) params.set('search', appliedSearch)
      if (appliedDateFrom) params.set('date_from', appliedDateFrom)
      if (appliedDateTo) params.set('date_to', appliedDateTo)

      const res = await fetch(`/api/documents?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setDocuments(json.data)
      } else {
        setFetchError('Gagal mengambil data dokumen.')
      }
    } catch {
      setFetchError('Tidak dapat terhubung ke server.')
    } finally {
      setIsFetching(false)
    }
  }, [appliedSearch, appliedDateFrom, appliedDateTo])

  useEffect(() => {
    if (isClient && isAuthenticated) fetchDocuments()
  }, [fetchDocuments, isClient, isAuthenticated])

  // Apply filter
  function handleApplyFilter() {
    setAppliedSearch(search)
    setAppliedDateFrom(dateFrom)
    setAppliedDateTo(dateTo)
  }

  function handleResetFilter() {
    const freshRange = getDefaultDateRange()
    setSearch('')
    setDateFrom(freshRange.from)
    setDateTo(freshRange.to)
    setAppliedSearch('')
    setAppliedDateFrom(freshRange.from)
    setAppliedDateTo(freshRange.to)
  }

  // Direct Download
  function handleDownload(doc: DocumentItem) {
    const link = document.createElement('a')
    link.href = `/api/documents/${doc.id}/download`
    link.download = doc.file_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Delete
  async function handleDelete(doc: DocumentItem) {
    if (!confirm(`Hapus dokumen "${doc.name}"?\n\nFile juga akan dihapus dari server.`)) return
    setDeletingId(doc.id)
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Dokumen berhasil dihapus.')
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      } else {
        toast.error(json.message ?? 'Gagal menghapus dokumen.')
      }
    } catch {
      toast.error('Tidak dapat menghubungi server.')
    } finally {
      setDeletingId(null)
    }
  }

  const isPageLoading = !isClient || loading

  if (isClient && !loading && !isAuthenticated) return null

  const hasCustomFilter =
    appliedSearch !== '' ||
    appliedDateFrom !== defaultRange.from ||
    appliedDateTo !== defaultRange.to

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar userName={userName} />

        {isPageLoading ? (
          <LoadingOverlay />
        ) : (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
            <div className="max-w-full space-y-6">

              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 dark:bg-indigo-500 shadow-lg shadow-indigo-500/25">
                    <FolderOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      Dokumen
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
                      Manajemen dokumen — upload, pratinjau, dan unduh file
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400">
                      {isFetching ? '...' : documents.length}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">total dokumen</div>
                  </div>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-500/25 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                </div>
              </div>

              {/* ── Error ──────────────────────────────────────────────── */}
              {fetchError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2.5 text-rose-700 dark:text-rose-300 text-sm font-semibold">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{fetchError}</span>
                  </div>
                  <button
                    onClick={fetchDocuments}
                    className="text-xs font-bold text-rose-600 dark:text-rose-400 underline hover:text-rose-800 dark:hover:text-rose-200 ml-4 shrink-0"
                  >
                    Coba lagi
                  </button>
                </div>
              )}

              {/* ── Filter Bar ─────────────────────────────────────────── */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-4 sm:p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                  {/* Search */}
                  <div className="sm:col-span-2 lg:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Cari Dokumen</span>
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyFilter()}
                        placeholder="Nama dokumen, file, atau keterangan..."
                        className="w-full h-10 pl-9 pr-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Date From */}
                  <div className="sm:col-span-1 lg:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Dari Tanggal</span>
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
                    />
                  </div>

                  {/* Date To */}
                  <div className="sm:col-span-1 lg:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Sampai Tanggal</span>
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium"
                    />
                  </div>

                  {/* Buttons */}
                  <div className="lg:col-span-1 flex gap-2">
                    <button
                      onClick={handleApplyFilter}
                      className="flex-1 h-10 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Filter</span>
                      <span className="lg:hidden">Terapkan</span>
                    </button>
                    {hasCustomFilter && (
                      <button
                        onClick={handleResetFilter}
                        className="h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                        title="Reset ke default 1 bulan terakhir"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={fetchDocuments}
                      disabled={isFetching}
                      className="h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                      title="Refresh"
                    >
                      <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Active filter badges */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                  <span className="text-slate-400 font-semibold">Filter aktif:</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-900/40">
                    <Calendar className="w-3 h-3" />
                    <span>Periode: {formatDate(appliedDateFrom)} s/d {formatDate(appliedDateTo)}</span>
                  </span>
                  {appliedSearch && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40">
                      <Search className="w-3 h-3" />
                      <span>Cari: "{appliedSearch}"</span>
                      <button onClick={() => { setSearch(''); setAppliedSearch('') }} className="hover:text-indigo-900 dark:hover:text-indigo-100 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>

              {/* ── Document Table / Cards ──────────────────────────────── */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Daftar Dokumen
                    {!isFetching && (
                      <span className="ml-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                        ({documents.length} file)
                      </span>
                    )}
                  </span>
                  {isFetching && (
                    <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />Memuat data...
                    </div>
                  )}
                </div>

                {/* Loading skeleton */}
                {isFetching && documents.length === 0 ? (
                  <div className="p-6 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ))}
                  </div>
                ) : documents.length === 0 ? (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                      <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <div className="text-center">
                      <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                        Tidak ada dokumen pada periode ini
                      </p>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                        Coba ubah filter tanggal atau klik tombol Upload untuk menambahkan dokumen
                      </p>
                    </div>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="flex items-center gap-2 h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />Upload Dokumen
                    </button>
                  </div>
                ) : (
                  /* Table */
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-10">No</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama Dokumen</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tipe</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ukuran</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Diunggah Oleh</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {documents.map((doc, idx) => (
                          <tr
                            key={doc.id}
                            className="group hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors duration-150"
                          >
                            <td className="px-4 py-3.5 text-xs font-bold text-slate-400 dark:text-slate-600">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors">
                                  {getFileIcon(doc)}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[260px]">
                                    {doc.name}
                                  </p>
                                  {doc.description && (
                                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[260px] mt-0.5">
                                      {doc.description}
                                    </p>
                                  )}
                                  <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-0.5 font-mono">
                                    {doc.file_name}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                {formatDate(doc.document_date)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              {getFileTypeBadge(doc)}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 dark:text-slate-400 text-xs font-semibold whitespace-nowrap">
                              {formatFileSize(doc.file_size)}
                            </td>
                            <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 text-xs">
                              {doc.uploaded_by || '-'}
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center justify-center gap-1.5">
                                {/* Preview Action */}
                                <button
                                  onClick={() => setPreviewTarget(doc)}
                                  title="Pratinjau Dokumen"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors cursor-pointer"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {/* Direct Download Action */}
                                <button
                                  onClick={() => handleDownload(doc)}
                                  title="Download File"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                {/* Delete Action */}
                                <button
                                  onClick={() => handleDelete(doc)}
                                  disabled={deletingId === doc.id}
                                  title="Hapus dokumen"
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors disabled:opacity-40 cursor-pointer"
                                >
                                  {deletingId === doc.id
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : <Trash2 className="w-4 h-4" />
                                  }
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={fetchDocuments}
          userName={userName}
        />
      )}

      {/* Preview Modal */}
      {previewTarget && (
        <PreviewModal
          doc={previewTarget}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </div>
  )
}
