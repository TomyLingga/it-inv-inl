// src/app/components/AppBreadcrumb.tsx

'use client'

import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/app/components/ui/breadcrumb'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  pemasukan: 'Pemasukan',
  pengeluaran: 'Pengeluaran',
  stok: 'Stok Inventory',
  'po-list': 'Daftar PO',
  'material-list': 'Daftar Material',
}

export default function AppBreadcrumb() {
  const pathname = usePathname()

  // Remove trailing slashes and split by '/'
  const rawSegments = pathname.split('/').filter(Boolean)

  // Skip non-page group segments like 'setting' and 'dashboard'
  const filteredSegments = rawSegments.filter(
    (seg) => seg !== 'setting' && seg !== 'dashboard'
  )

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Home Item */}
        <BreadcrumbItem>
          <BreadcrumbLink
            href="/dashboard"
            className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Beranda</span>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {filteredSegments.length > 0 && <BreadcrumbSeparator />}

        {filteredSegments.map((segment, index) => {
          const isLast = index === filteredSegments.length - 1
          const href = `/${rawSegments.slice(0, rawSegments.indexOf(segment) + 1).join('/')}`
          const label =
            routeLabels[segment] ||
            segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ')

          return (
            <div key={segment} className="inline-flex items-center gap-1.5 sm:gap-2.5">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
