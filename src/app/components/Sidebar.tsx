'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'  // ← IMPORT INI

export default function Sidebar() {
  const pathname = usePathname()
  const { userName, logout, loading } = useAuth()  // ← GUNAKAN INI

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊', color: 'text-blue-600' },
    { href: '/pemasukan', label: 'Pemasukan', icon: '📈', color: 'text-green-600' },
    { href: '/pengeluaran', label: 'Pengeluaran', icon: '💸', color: 'text-red-600' },
    { href: '/stok', label: 'Stok', icon: '📦', color: 'text-blue-600' },
  ]

  const handleLogout = () => {
    logout()  // ← GUNAKAN SAP LOGOUT
  }

  if (loading) {
    return (
      <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* User Info */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
            <span className="text-xl font-bold text-white">
              {userName?.[0] || 'S'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 truncate">
              {userName || 'SAP User'}
            </p>
            <p className="text-xs text-gray-500">SAP Session</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              } ${item.color}`}
            >
              <span className={`text-xl mr-3 group-hover:scale-110 transition-transform ${isActive ? 'text-white' : ''}`}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
        >
          <span className="text-xl mr-3 group-hover:rotate-180 transition-transform">🚪</span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  )
}
