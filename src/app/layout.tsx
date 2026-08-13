import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/app/components/ui/AppToast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IT Inventory',
  description: 'Aplikasi IT Inventory',
}

import { AuthProvider } from '@/app/components/useAuth'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <ToastProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
