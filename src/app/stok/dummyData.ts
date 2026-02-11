// src/app/stok/dummyData.ts

import { StokData } from '@/app/shared/types'

export const generateDummyStokData = (): StokData[] => {
  return Array.from({ length: 50 }, (_, i) => {
    const no = i + 1
    const months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02']
    const randomMonth = months[Math.floor(Math.random() * months.length)]
    const postingDayNum = Math.floor(Math.random() * 28) + 1
    
    const postingDay = postingDayNum.toString().padStart(2, '0')
    const noStr = no.toString().padStart(3, '0')
    const hsCode = (30 + (no % 70)).toString().padStart(2, '0')
    
    return {
      no,
      // plant: i % 2 === 0 ? 'IN01' : 'IN02',
      kodeBarang: `BRG${noStr}`,
      kodeHS: `8471.${hsCode}`,
      namaBarang: [
        'Laptop Dell XPS 13', 'Printer HP LaserJet', 'Keyboard Mechanical', 'Monitor LG 24"', 
        'Mouse Logitech Wireless', 'Harddisk SSD 1TB', 'RAM 16GB DDR4', 'Webcam HD',
        'Router Cisco', 'Switch D-Link', 'UPS APC', 'Scanner Epson'
      ][Math.floor(Math.random() * 12)],
      satuan: ['PCS', 'SET', 'UNIT'][Math.floor(Math.random() * 3)],
      jumlah: 20 + Math.floor(Math.random() * 180), // Stok lebih banyak
      nilaiBarang: 10000000 + Math.floor(Math.random() * 90000000),
      postingDate: `${randomMonth}-${postingDay}`
    }
  })
}
