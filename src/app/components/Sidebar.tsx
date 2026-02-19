// src/app/components/Sidebar.tsx

'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import { useState, useEffect } from 'react'
import { Menu, X, Gauge, Download, Upload, Package, LogOut, AlertCircle, CheckCircle } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { userName, logout, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(true)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  const menuItems = [
    { href: '/dashboard', label: 'Utama', icon: Gauge, color: 'text-blue-600' },
    { href: '/pemasukan', label: 'Pemasukan', icon: Download, color: 'text-green-600' },
    { href: '/pengeluaran', label: 'Pengeluaran', icon: Upload, color: 'text-red-600' },
    { href: '/stok', label: 'Stok', icon: Package, color: 'text-blue-600' },
  ]

  // **FIX: Reset sidebar to OPEN on every page load**
  useEffect(() => {
    setIsOpen(true)
  }, [pathname])

  const toggleSidebar = () => setIsOpen(!isOpen)
  
  const handleLogoutClick = () => {
    setShowLogoutDialog(true)
  }

  const handleConfirmLogout = () => {
    logout()
    router.push('/')
    setShowLogoutDialog(false)
  }

  const handleCancelLogout = () => {
    setShowLogoutDialog(false)
  }

  if (loading) {
    return (
      <div className="w-64 bg-gray-800 shadow-2xl border-r border-gray-700 flex items-center justify-center h-screen">
        <div className="text-gray-300">Loading...</div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white backdrop-blur-sm rounded-2xl shadow-lg border-0 hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl hover:scale-105 transition-all duration-300 lg:hidden"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-0 z-40 h-screen bg-gradient-to-b from-gray-800 to-gray-900 shadow-2xl border-r border-gray-700
        ${isOpen ? 'w-64 lg:w-64' : 'w-64 lg:w-20'} 
        backdrop-blur-sm
        transition-all duration-300 ease-in-out
        transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:shadow-2xl
      `}>
        {/* Header with Toggle */}
        <div className="p-4 border-b border-gray-600 bg-gradient-to-b from-gray-800 to-gray-900/90 flex items-center justify-between min-h-[68px]">
          <button
            onClick={toggleSidebar}
            className="p-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl shadow-lg hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:scale-105 transition-all lg:hidden flex-shrink-0"
          >
            <X className="w-6 h-6" />
          </button>
          
          <button
            onClick={toggleSidebar}
            className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg hover:from-indigo-600 hover:to-purple-700 hover:shadow-xl hover:scale-105 transition-all lg:block hidden flex-shrink-0"
          >
            <Menu className={`w-6 h-6 transition-transform duration-300 ${isOpen ? 'rotate-0' : '-rotate-180'}`} />
          </button>
        </div>

        {/* User Info */}
        <div className={`
          transition-all duration-300 overflow-hidden w-full
          ${isOpen ? 'opacity-100' : 'opacity-0 lg:opacity-100'}
        `}>
          <div className="p-4 border-b border-gray-600 w-full">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl font-bold text-white">
                  {userName?.[0]?.toUpperCase() || 'S'}
                </span>
              </div>
              <div className={`min-w-0 flex-1 transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 lg:opacity-0'}`}>
                <p className="text-lg font-semibold text-gray-100 truncate leading-tight">
                  {userName || 'SAP User'}
                </p>
                <p className="text-sm text-gray-400 truncate leading-tight">Session Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-1 py-6 space-y-2 overflow-y-auto overflow-x-hidden">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const IconComponent = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center px-4 py-4 rounded-2xl transition-all duration-300 group hover:shadow-xl w-full
                  overflow-hidden bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 border border-gray-700
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-2xl scale-105 border-blue-500'
                    : 'text-gray-300 hover:text-white'
                  }
                `}
              >
                <IconComponent className={`
                  w-7 h-7 mr-4 flex-shrink-0 group-hover:scale-110 transition-all
                  ${isActive ? 'text-white' : item.color}
                `} />
                <span className={`
                  font-semibold text-base transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis
                  ${isOpen ? 'opacity-100 w-32 lg:w-auto' : 'opacity-0 w-0 lg:opacity-0 lg:w-0'}
                `}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="px-1 py-4 space-y-2 border-t border-gray-600 mt-auto">
          <button
            onClick={handleLogoutClick}
            className="flex items-center px-4 py-4 rounded-2xl transition-all duration-300 group hover:shadow-xl w-full overflow-hidden bg-red-500/90 backdrop-blur-sm hover:bg-red-600/90 text-white border border-red-500/50"
          >
            <LogOut className="w-7 h-7 mr-4 flex-shrink-0 group-hover:scale-110 transition-all" />
            <span className={`
              font-semibold text-base transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis
              ${isOpen ? 'opacity-100 w-20 lg:w-auto' : 'opacity-0 w-0 lg:opacity-0 lg:w-0'}
            `}>
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Alert Dialog */}
      {showLogoutDialog && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={handleCancelLogout}
          />
          
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-gray-900/95 backdrop-blur-xl border border-gray-600 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start space-x-4 mb-6">
              <AlertCircle className="w-8 h-8 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-gray-100 mb-2">Konfirmasi Logout</h3>
                <p className="text-gray-300 leading-relaxed">Apakah Anda yakin ingin logout dari aplikasi ini?</p>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleConfirmLogout}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg flex items-center justify-center space-x-2 group hover:shadow-xl hover:-translate-y-0.5"
              >
                <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span>Ya, Logout</span>
              </button>
              <button
                onClick={handleCancelLogout}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Batal
              </button>
            </div>
          </div>
        </>
      )}

      {/* Mobile Overlay */}
      {!isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </>
  )
}
