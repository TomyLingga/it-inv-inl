// src/app/components/Topbar.tsx

'use client'

import { useState, useEffect } from 'react'
import {
  Menu,
  Calendar,
  PanelLeftClose,
  PanelLeft,
  Sun,
  Moon,
} from 'lucide-react'

import AppBreadcrumb from '@/app/components/AppBreadcrumb'

export default function Topbar({ userName }: { userName: string }) {
  const [isOpen, setIsOpen] = useState(true)
  const [time, setTime] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Listen for sidebar state changes and window resize
  useEffect(() => {
    const isMobile = window.innerWidth < 1024
    setIsOpen(!isMobile)

    const handleState = (e: CustomEvent<{ isOpen?: boolean }>) => {
      if (e.detail && typeof e.detail.isOpen === 'boolean') {
        setIsOpen(e.detail.isOpen)
      } else {
        setIsOpen((prev) => !prev)
      }
    }

    window.addEventListener('sidebar:state', handleState as EventListener)
    window.addEventListener('sidebar:toggle', handleState as EventListener)

    return () => {
      window.removeEventListener('sidebar:state', handleState as EventListener)
      window.removeEventListener('sidebar:toggle', handleState as EventListener)
    }
  }, [])

  const toggleSidebar = () => {
    window.dispatchEvent(new CustomEvent('sidebar:toggle'))
  }

  useEffect(() => {
    const isDark =
      localStorage.getItem('theme') === 'dark' ||
      document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode
    setIsDarkMode(nextDark)
    if (nextDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date()
      setTime(
        `${now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })} WIB`
      )
      setDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      )
    }
    updateDateTime()
    const interval = window.setInterval(updateDateTime, 1000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 sm:px-6 shadow-sm shrink-0 transition-colors duration-200">
      <div className="flex h-full items-center justify-between">
        {/* Left: Sidebar toggle & Breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile menu button */}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            title={isOpen ? 'Tutup sidebar' : 'Buka sidebar'}
          >
            {isOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <PanelLeft className="w-5 h-5" />
            )}
          </button>

          {/* Vertical Separator */}
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

          {/* Dynamic Breadcrumb Navigation */}
          <AppBreadcrumb />
        </div>

        {/* Right: DateTime + Dark Mode Toggle + User */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* DateTime Badge */}
          <div className="hidden md:flex flex-col items-end pr-4 border-r border-slate-200 dark:border-slate-800 text-right">
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-400">
              <Calendar className="h-3 w-3 text-blue-500 shrink-0" />
              {dateStr || 'Memuat tanggal...'}
            </span>
            <span className="mt-0.5 text-xs font-bold tracking-tight text-slate-700 dark:text-slate-200">
              {time || 'Memuat jam...'}
            </span>
          </div>

          {/* Dark Mode Pill Toggle Switch */}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-slate-200 dark:bg-slate-700 transition-colors duration-300 ease-in-out focus:outline-none shadow-inner"
            role="switch"
            aria-checked={isDarkMode}
            title={isDarkMode ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white dark:bg-slate-900 shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center ${
                isDarkMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            >
              {isDarkMode ? (
                <Moon className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              )}
            </span>
          </button>

          {/* User Info */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-[130px]">
                {userName || 'SAP User'}
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 truncate">
                Session Active
              </span>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 dark:bg-blue-600 text-xs font-bold text-white shadow-sm">
              {(userName || 'S').charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
