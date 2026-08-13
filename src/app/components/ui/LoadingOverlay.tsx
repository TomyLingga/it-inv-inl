// src/app/components/ui/LoadingOverlay.tsx

import { Spinner } from '@/app/components/ui/spinner'

interface LoadingOverlayProps {
  title?: string
  subtitle?: string
  fullScreen?: boolean
}

export default function LoadingOverlay({
  title = 'Menghubungkan ke Sistem SAP...',
  subtitle = 'Mengambil data inventory PT Industri Nabati Lestari',
  fullScreen = false,
}: LoadingOverlayProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/75 dark:bg-slate-950/75 backdrop-blur-md transition-all duration-300">
        <div className="flex flex-col items-center justify-center text-center space-y-4 px-6 max-w-md">
          {/* Pure Spinner without background box */}
          <Spinner size="xl" variant="primary" label="" />

          <div className="space-y-1.5">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 sm:p-12 w-full h-full min-h-[400px]">
      <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-md">
        {/* Pure Spinner without background box */}
        <Spinner size="xl" variant="primary" label="" />

        <div className="space-y-1.5">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  )
}
