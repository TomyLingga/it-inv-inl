// src/app/pengeluaran/dummyData.ts

import { PengeluaranData } from '@/app/shared/types'

export const generateDummyPengeluaranData = (): PengeluaranData[] => {
  return Array.from({ length: 50 }, (_, i) => {
    const no = i + 1
    const months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
    const randomMonth = months[Math.floor(Math.random() * months.length)]
    const randomDayNum = Math.floor(Math.random() * 28) + 1
    const postingDayNum = Math.floor(Math.random() * 28) + 1
    
    const randomDay = randomDayNum.toString().padStart(2, '0')
    const postingDay = postingDayNum.toString().padStart(2, '0')
    const nextDay = Math.min(randomDayNum + 1, 28).toString().padStart(2, '0')
    const noStr = no.toString().padStart(3, '0')
    const docNo = (200000 + no * 7).toString().padStart(9, '0')
    const hsCode = (30 + (no % 70)).toString().padStart(2, '0')
    
    const [year, month] = randomMonth.split('-')
    
    return {
      no,
      plant: i % 2 === 0 ? 'IN01' : 'IN02',
      jenisDokBC: ['BC23', 'BC25'][Math.floor(Math.random() * 2)],
      nomorDokAju: `BC-OUT-${noStr}/${month}/${year}`,
      tglDokAju: `${randomMonth}-${randomDay}`,
      nomorDokPendaftaran: `PEND-OUT-${noStr}/${year}`,
      tglDokPendaftaran: `${randomMonth}-${nextDay}`,
      nomorPo: `DOC-OUT-${docNo}`,
      penerima: ['PT XYZ Manufacturing', 'PT DEF Industries', 'CV GHI Export', 'PT JKL Trading', 'UD MNO Supplier'][Math.floor(Math.random() * 5)],
      kodeBarang: `BRG${noStr}`,
      kodeHS: `8471.${hsCode}`,
      namaBarang: [
        'Laptop Dell XPS 13', 'Printer HP LaserJet', 'Keyboard Mechanical', 'Monitor LG 24"', 
        'Mouse Logitech Wireless', 'Harddisk SSD 1TB', 'RAM 16GB DDR4', 'Webcam HD'
      ][Math.floor(Math.random() * 8)],
      satuan: ['PCS', 'SET', 'UNIT'][Math.floor(Math.random() * 3)],
      jumlah: 5 + Math.floor(Math.random() * 50),
      nilaiBarang: 3000000 + Math.floor(Math.random() * 25000000),
      postingDate: `${randomMonth}-${postingDay}`
    }
  })
}
