// src/app/components/Sidebar.tsx

'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/app/components/useAuth'
import { useState, useEffect, createContext, useContext } from 'react'
import {
  Menu,
  X,
  LayoutDashboard,
  ArrowDownToLine,
  ArrowUpFromLine,
  Package,
  LogOut,
  AlertCircle,
  Settings,
  ChevronDown,
  ChevronRight,
  Boxes,
  FileText,
  Calendar,
  Loader2,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
  Factory,
  Building2,
  FolderOpen,
  ArrowLeftRight,
} from 'lucide-react'

import Topbar from '@/app/components/Topbar'

// ─── Sidebar Context ──────────────────────────────────────────────────────────
export const SidebarContext = createContext<{
  isOpen: boolean
  toggleSidebar: () => void
}>({ isOpen: true, toggleSidebar: () => {} })

export { Topbar }

// ─── Sidebar Panel Component ──────────────────────────────────────────────────
function SidebarPanel() {
  const pathname = usePathname()
  const { isOpen, toggleSidebar } = useContext(SidebarContext)
  const { userName } = useAuth()
  const [isSettingOpen, setIsSettingOpen] = useState(false)

  // Auto-expand setting menu if current path is under /setting
  useEffect(() => {
    if (pathname.startsWith('/setting')) {
      setIsSettingOpen(true)
    }
  }, [pathname])

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/pemasukan', label: 'Pemasukan', icon: ArrowDownToLine },
    { href: '/pengeluaran', label: 'Pengeluaran', icon: ArrowUpFromLine },
    { href: '/stok', label: 'Stok', icon: Package },
    { href: '/mutasi', label: 'Mutasi', icon: ArrowLeftRight },
    { href: '/dokumen', label: 'Dokumen', icon: FolderOpen },
  ]

  return (
    <aside
      className={`
        fixed lg:static inset-y-0 left-0 z-40 h-screen flex flex-col
        bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/80 shadow-sm
        transition-all duration-300 ease-in-out overflow-hidden
        ${isOpen ? 'w-64' : 'w-0 lg:w-[68px]'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* ── Brand Header ─────────────────────────────────────────────── */}
      <div
        className={`
          flex items-center border-b border-slate-200 dark:border-slate-700/80 h-16 shrink-0
          ${isOpen ? 'px-4 gap-3' : 'justify-center px-0 gap-0'}
        `}
      >
        <Package className="h-7 w-7 text-slate-800 dark:text-blue-400 shrink-0" />

        {isOpen && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
              IT Inventory
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              PT Industri Nabati Lestari
            </span>
          </div>
        )}

        {/* Mobile close button */}
        {isOpen && (
          <button
            onClick={toggleSidebar}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ── Navigation Menu ──────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2.5 space-y-1">
        {/* Group Label */}
        {isOpen && (
          <div className="px-2 pb-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Menu Utama
            </span>
          </div>
        )}

        {menuItems.map((item) => {
          const isActive = pathname === item.href
          const IconComponent = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (window.innerWidth < 1024) toggleSidebar()
              }}
              className={`
                flex items-center rounded-xl transition-all duration-200 group border
                ${isOpen ? 'px-3 py-2.5 gap-2.5' : 'justify-center p-2.5'}
                ${
                  isActive
                    ? 'border-slate-900 dark:border-blue-400 text-slate-900 dark:text-blue-400 font-bold bg-slate-50/80 dark:bg-blue-500/10 shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white'
                }
              `}
              title={!isOpen ? item.label : undefined}
            >
              <IconComponent
                className={`
                  w-[18px] h-[18px] shrink-0 transition-colors duration-200
                  ${isActive ? 'text-slate-900 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white'}
                `}
              />
              {isOpen && (
                <span className="text-sm truncate">
                  {item.label}
                </span>
              )}
            </Link>
          )
        })}

        {/* ── Setting Group ────────────────────────────────────────────── */}
        {isOpen && (
          <div className="px-2 pb-1 pt-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Pengaturan
            </span>
          </div>
        )}

        <div className="space-y-0.5">
          <button
            onClick={() => {
              if (!isOpen) {
                // On collapsed sidebar, expand first
                toggleSidebar()
                // small delay to let sidebar expand before toggling submenu
                setTimeout(() => setIsSettingOpen(true), 150)
                return
              }
              setIsSettingOpen(!isSettingOpen)
            }}
            className={`
              flex items-center justify-between rounded-xl transition-all duration-200 group w-full border
              ${isOpen ? 'px-3 py-2.5' : 'justify-center p-2.5'}
              ${
                pathname.startsWith('/setting')
                  ? 'border-slate-900 dark:border-blue-400 text-slate-900 dark:text-blue-400 font-bold bg-slate-50/80 dark:bg-blue-500/10 shadow-xs'
                  : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/80 hover:text-slate-900 dark:hover:text-white'
              }
            `}
            title={!isOpen ? 'Setting' : undefined}
          >
            <div className={`flex items-center ${isOpen ? 'gap-2.5' : ''}`}>
              <Settings
                className={`
                  w-[18px] h-[18px] shrink-0 transition-all duration-300
                  ${pathname.startsWith('/setting') ? 'text-slate-900 dark:text-blue-400' : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white'}
                  ${isSettingOpen && isOpen ? 'rotate-90' : ''}
                `}
              />
              {isOpen && (
                <span className="text-sm">Setting</span>
              )}
            </div>
            {isOpen &&
              (isSettingOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400 dark:text-slate-400 transition-transform duration-200" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-400 transition-transform duration-200" />
              ))}
          </button>

          {/* Submenu */}
          {isSettingOpen && isOpen && (
            <div className="ml-4 pl-2.5 border-l-2 border-slate-200 dark:border-slate-700 space-y-0.5 pt-1">
              <Link
                href="/setting/material-list"
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar()
                }}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 group text-[13px] font-semibold
                  ${
                    pathname === '/setting/material-list'
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/70'
                  }
                `}
              >
                <Boxes
                  className={`w-4 h-4 shrink-0 ${
                    pathname === '/setting/material-list'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                  }`}
                />
                <span>Material List</span>
              </Link>

              <Link
                href="/setting/po-list"
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar()
                }}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 group text-[13px] font-semibold
                  ${
                    pathname === '/setting/po-list'
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/70'
                  }
                `}
              >
                <FileText
                  className={`w-4 h-4 shrink-0 ${
                    pathname === '/setting/po-list'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                  }`}
                />
                <span>PO List</span>
              </Link>

              <Link
                href="/setting/plant-list"
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar()
                }}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 group text-[13px] font-semibold
                  ${
                    pathname === '/setting/plant-list'
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/70'
                  }
                `}
              >
                <Factory
                  className={`w-4 h-4 shrink-0 ${
                    pathname === '/setting/plant-list'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                  }`}
                />
                <span>Plant List</span>
              </Link>

              <Link
                href="/setting/kppbc-list"
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar()
                }}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 group text-[13px] font-semibold
                  ${
                    pathname === '/setting/kppbc-list'
                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                      : 'text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/70'
                  }
                `}
              >
                <Building2
                  className={`w-4 h-4 shrink-0 ${
                    pathname === '/setting/kppbc-list'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-400 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                  }`}
                />
                <span>KPPBC List</span>
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ── Mobile Profile Card (Only shown on mobile above logout) ────── */}
      {isOpen && (
        <div className="shrink-0 px-2.5 pt-2 pb-1 border-t border-slate-200 dark:border-slate-700/80 lg:hidden">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700/80">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 dark:bg-blue-600 text-xs font-bold text-white shadow-xs">
              {(userName || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {userName || 'User Profile'}
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate">
                Session Active
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout Button ────────────────────────────────────────────── */}
      <div className="shrink-0 p-2.5 border-t border-slate-200 dark:border-slate-700/80">
        <button
          onClick={() =>
            window.dispatchEvent(new CustomEvent('sidebar:logout'))
          }
          className={`
            flex items-center rounded-xl transition-all duration-200 group w-full
            text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/60 dark:border-rose-800/60
            ${isOpen ? 'px-3 py-2.5 gap-2.5 justify-start' : 'justify-center p-2.5'}
          `}
          title={!isOpen ? 'Logout' : undefined}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0 text-rose-500 dark:text-rose-400" />
          {isOpen && (
            <span className="text-sm font-bold truncate">Keluar</span>
          )}
        </button>
      </div>
    </aside>
  )
}

// ─── Main Sidebar Export (wraps sidebar + topbar + content layout) ─────────
export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { userName, logout, loading } = useAuth()
  const [isOpen, setIsOpen] = useState(true)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  // Di mobile: mulai dengan sidebar tertutup
  useEffect(() => {
    const isMobile = window.innerWidth < 1024
    setIsOpen(!isMobile)
  }, [])

  // Listen for sidebar toggle events from Topbar or other components
  useEffect(() => {
    const handleToggle = () => setIsOpen((prev) => !prev)
    window.addEventListener('sidebar:toggle', handleToggle)
    return () => window.removeEventListener('sidebar:toggle', handleToggle)
  }, [])

  // Broadcast state changes to Topbar
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sidebar:state', { detail: { isOpen } })
    )
  }, [isOpen])

  // Listen for logout event from sidebar panel
  useEffect(() => {
    const handler = () => setShowLogoutDialog(true)
    window.addEventListener('sidebar:logout', handler)
    return () => window.removeEventListener('sidebar:logout', handler)
  }, [])

  const toggleSidebar = () => setIsOpen((o) => !o)

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
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-slate-400" />
          <span className="text-sm font-semibold text-slate-400">
            Memuat...
          </span>
        </div>
      </div>
    )
  }

  return (
    <SidebarContext.Provider value={{ isOpen, toggleSidebar }}>
      {/* Sidebar Panel */}
      <SidebarPanel />

      {/* ─── Logout Confirmation Dialog ──────────────────────────────── */}
      {showLogoutDialog && (
        <>
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50"
            onClick={handleCancelLogout}
          />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center">
            <div className="flex flex-col items-center gap-3 mb-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/30">
                <AlertCircle className="w-6 h-6 text-rose-500 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                  Keluar dari Aplikasi?
                </h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  Apakah Anda yakin ingin logout dari sesi ini?
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCancelLogout}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 rounded-xl bg-rose-500 hover:bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition-all"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─── Mobile Overlay ──────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </SidebarContext.Provider>
  )
}


