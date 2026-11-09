// src/app/traceability/TraceHelp.tsx
//
// "Cara membaca" panel for the two traceability views. Shown by default; the
// hide/show choice is remembered per browser.
'use client'

import { useEffect, useState } from 'react'
import { HelpCircle, ChevronDown, ChevronUp, Boxes, Factory, Truck, Store, Warehouse, FileCheck2 } from 'lucide-react'

const STORAGE_KEY = 'trace-help-hidden'

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
      <span className="inline-flex items-center gap-1"><Truck className="w-3.5 h-3.5 text-teal-600" /> Supplier / vendor</span>
      <span className="inline-flex items-center gap-1"><Boxes className="w-3.5 h-3.5 text-violet-600" /> Material + batch</span>
      <span className="inline-flex items-center gap-1"><Factory className="w-3.5 h-3.5 text-amber-600" /> Order produksi</span>
      <span className="inline-flex items-center gap-1"><Store className="w-3.5 h-3.5 text-sky-600" /> Customer</span>
      <span className="inline-flex items-center gap-1"><Warehouse className="w-3.5 h-3.5 text-slate-500" /> Gudang (kode – nama)</span>
      <span className="inline-flex items-center gap-1"><FileCheck2 className="w-3.5 h-3.5 text-emerald-600" /> Dokumen pabean (BC, AJU)</span>
    </div>
  )
}

function AlurHelp() {
  return (
    <>
      <p>
        Halaman ini menjawab: <strong>produk yang dikirim ke customer dibuat dari bahan apa, bahan itu disimpan di gudang mana,
        dan dibeli dari supplier mana.</strong> Penelusuran berjalan mundur, dari pengeluaran ke customer sampai pembelian dari vendor.
      </p>
      <ol className="list-decimal pl-5 space-y-1">
        <li><strong>Alur bahan utama</strong> (paling atas) dibaca dari kiri ke kanan: supplier → bahan baku → tahap produksi → hasil → … → customer. Klik kotak Produksi untuk membuka tahapnya.</li>
        <li><strong>Pengeluaran ke customer</strong>: batch yang dikirim, gudang tempat barang disimpan sebelum keluar, dan dokumen BC 3.0.</li>
        <li><strong>Tahap 1, 2, 3, …</strong>: satu tahap = satu order produksi. Tahap 1 paling dekat ke customer (misalnya packaging), angka terbesar paling dekat ke supplier (misalnya refinery). Klik judul tahap untuk membuka atau menutup detailnya.</li>
        <li>Di dalam tahap: <strong>Hasil produksi</strong> (batch yang dibuat dan gudang penyimpanannya), <strong>Bahan baku</strong> (bahan utama yang diolah), dan <strong>Bahan pendukung</strong> (bahan kimia, kemasan, dan bahan lain).</li>
        <li>Kolom <strong>Asal bahan</strong>: &quot;Diproduksi di Tahap n&quot; berarti bahan dibuat di tahap lain (klik untuk melompat ke sana). Jika dibeli, tertulis nama vendor, PO, tanggal terima, gudang penerimaan, dan dokumen pabean pemasukan.</li>
        <li><strong>Ringkasan supplier</strong> (paling bawah) mengumpulkan semua vendor dari seluruh tahap dalam satu tabel.</li>
      </ol>
      <p className="text-slate-500 dark:text-slate-400">
        Hanya material yang terdaftar sebagai fasilitas kepabeanan yang ditelusuri. Bahan yang dipakai di suatu order tetapi belum terdaftar
        fasilitas dicantumkan di bagian bawah tahap tersebut, sehingga terlihat bahan apa saja yang perlu didaftarkan. Ikon ⌖ menjadikan batch atau
        order itu sebagai titik awal penelusuran baru.
      </p>
    </>
  )
}

function PohonHelp() {
  return (
    <>
      <p>
        Halaman ini menampilkan <strong>silsilah lengkap satu batch</strong> dalam dua arah sekaligus, dalam bentuk pohon yang bisa dibuka per cabang.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Hulu (kiri)</strong>: dari mana batch ini berasal. Batch → order produksi yang membuatnya → bahan yang dipakai order itu → dan seterusnya sampai vendor atau saldo awal.</li>
        <li><strong>Hilir (kanan)</strong>: ke mana batch ini pergi. Batch → order produksi yang memakainya → produk yang dihasilkan → dan seterusnya sampai customer, pemakaian lain, atau sisa stok.</li>
        <li><strong>Ringkasan</strong> di atas pohon adalah daftar ujung pohon: semua vendor asal (hulu) atau semua customer tujuan (hilir).</li>
        <li>Klik panah ▸ untuk membuka cabang. Cabang yang dalam tertutup secara default agar tetap mudah dibaca.</li>
      </ul>
      <p className="text-slate-500 dark:text-slate-400">
        Gunakan Pohon untuk melihat ke depan (batch CPO ini jadi produk apa dan dikirim ke siapa). Gunakan Alur produksi untuk melihat ke belakang
        dari satu pengiriman secara bertahap. Jika penelusuran dimulai dari SO yang berisi beberapa batch, pilih batchnya di atas pohon.
      </p>
    </>
  )
}

export default function TraceHelp({ view }: { view: 'alur' | 'pohon' }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      /* storage unavailable — keep default (shown) */
    }
  }, [])

  const toggle = () => {
    setHidden((h) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, h ? '0' : '1')
      } catch {
        /* ignore */
      }
      return !h
    })
  }

  return (
    <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/20">
      <button type="button" onClick={toggle} className="w-full flex items-center justify-between gap-2 px-4 sm:px-5 py-2.5 text-left">
        <span className="inline-flex items-center gap-2 text-xs font-extrabold text-indigo-900 dark:text-indigo-200">
          <HelpCircle className="w-4 h-4" />
          {view === 'alur' ? 'Apa ini dan cara membaca Alur produksi' : 'Apa ini dan cara membaca Pohon hulu & hilir'}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
          {hidden ? 'Tampilkan' : 'Sembunyikan'}
          {hidden ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </span>
      </button>
      {!hidden && (
        <div className="px-4 sm:px-5 pb-4 space-y-2 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          {view === 'alur' ? <AlurHelp /> : <PohonHelp />}
          <Legend />
        </div>
      )}
    </div>
  )
}
