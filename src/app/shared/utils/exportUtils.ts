// src/app/shared/utils/exportUtils.ts

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { BaseData, ColumnConfig } from '../types'

export const exportToExcel = <T extends BaseData>(
  data: T[],
  columns: ColumnConfig<T>[],
  filename: string
) => {
  if (data.length === 0) {
    alert('Tidak ada data untuk diexport!')
    return
  }

  const exportData = data.map(row => {
    const exportRow: Record<string, any> = {}
    columns.forEach(col => {
      const value = row[col.key]
      if (typeof value === 'number' && col.key.toString().includes('nilai')) {
        exportRow[col.label] = `Rp ${value.toLocaleString('id-ID')}`
      } else if (typeof value === 'number') {
        exportRow[col.label] = value
      } else {
        exportRow[col.label] = value || ''
      }
    })
    return exportRow
  })

  const ws = XLSX.utils.json_to_sheet(exportData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')

  const colWidths = columns.map(() => ({ wch: 18 }))
  ws['!cols'] = colWidths

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const exportToPDF = <T extends BaseData>(
  data: T[],
  columns: ColumnConfig<T>[],
  filename: string,
  title: string
) => {
  if (data.length === 0) {
    alert('Tidak ada data untuk diexport!')
    return
  }

  const doc = new jsPDF('l', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()

  // ─── Hitung total untuk kolom numerik ──────────────────────────────────────
  const numericTotals: Record<string, number> = {}
  columns.forEach(col => {
    if (typeof data[0]?.[col.key] === 'number') {
      numericTotals[col.key as string] = data.reduce(
        (sum, row) => sum + (Number(row[col.key]) || 0),
        0
      )
    }
  })

  // ─── Header dokumen ────────────────────────────────────────────────────────
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageWidth / 2, 15, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Tanggal Export: ${new Date().toLocaleDateString('id-ID')}`, pageWidth / 2, 25, { align: 'center' })
  doc.text(`Total Data: ${data.length}`, pageWidth / 2, 32, { align: 'center' })

  // ─── Table headers ─────────────────────────────────────────────────────────
  const headers = columns.map(col => col.label)

  // ─── Table body ────────────────────────────────────────────────────────────
  const body = data.map(row =>
    columns.map(col => {
      const value = row[col.key]
      if (typeof value === 'number' && col.key.toString().includes('nilai')) {
        return `Rp ${value.toLocaleString('id-ID')}`
      } else if (typeof value === 'number') {
        return value.toLocaleString('id-ID')
      } else {
        return value?.toString() || ''
      }
    })
  )

  // ─── Footer row total ──────────────────────────────────────────────────────
  // Hanya kolom 'nilaiBarang' yang ditampilkan totalnya
  // Label 'TOTAL' ditaruh di kolom ke-2 (idx === 1) agar lebih rapi
  const footerRow = columns.map((col, idx) => {
    if (idx === 1) return 'TOTAL'

    const key = col.key as string
    // Hanya tampilkan total untuk kolom yang mengandung 'nilai'
    if (key.includes('nilai') && numericTotals[key] !== undefined) {
      return `Rp ${numericTotals[key].toLocaleString('id-ID')}`
    }
    return ''
  })

  // ─── Column widths ─────────────────────────────────────────────────────────
  const columnStyles: { [key: number]: { cellWidth: number } } = {}
  columns.forEach((col, idx) => {
    if (col.width) {
      columnStyles[idx] = { cellWidth: parseInt(col.width) }
    }
  })

  // ─── Render tabel ──────────────────────────────────────────────────────────
  autoTable(doc, {
    head: [headers],
    body,
    foot: [footerRow],
    startY: 40,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      overflow: 'linebreak',
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    footStyles: {
      fillColor: [16, 185, 129],  // emerald-500
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 10, right: 10 },
    columnStyles,
    showFoot: 'lastPage', // total hanya muncul di halaman terakhir
    didDrawPage: (hookData) => {
      const pageCount = doc.getNumberOfPages()
      const cursorY = hookData.cursor?.y ?? 40

      if (hookData.pageNumber === pageCount) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'italic')
        doc.text(
          'Dicetak dari Sistem Inventory',
          pageWidth / 2,
          cursorY + 10,
          { align: 'center' }
        )
      }
    },
  })

  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`)
}