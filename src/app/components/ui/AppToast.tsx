'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { AlertCircle, CheckCircle2, X } from 'lucide-react'

export type AppToastState = {
  type: 'ok' | 'err'
  text: string
  title?: string
  id?: number
} | null

interface ToastContextType {
  toast: AppToastState
  showToast: (text: string, type?: 'ok' | 'err', title?: string) => void
  success: (text: string, title?: string) => void
  error: (text: string, title?: string) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const TOAST_EVENT = 'it_inv_show_toast'

export function showGlobalToast(text: string, type: 'ok' | 'err' = 'ok', title?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { text, type, title } }))
  }
}

export const toast = {
  success: (text: string, title?: string) => showGlobalToast(text, 'ok', title),
  error: (text: string, title?: string) => showGlobalToast(text, 'err', title),
  show: (text: string, type: 'ok' | 'err' = 'ok', title?: string) => showGlobalToast(text, type, title),
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toastState, setToastState] = useState<AppToastState>(null)

  const hideToast = useCallback(() => {
    setToastState(null)
  }, [])

  const showToast = useCallback((text: string, type: 'ok' | 'err' = 'ok', title?: string) => {
    setToastState({ type, text, title, id: Date.now() })
  }, [])

  const success = useCallback((text: string, title?: string) => {
    showToast(text, 'ok', title)
  }, [showToast])

  const error = useCallback((text: string, title?: string) => {
    showToast(text, 'err', title)
  }, [showToast])

  useEffect(() => {
    const handleCustomToast = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string; type: 'ok' | 'err'; title?: string }>
      if (customEvent.detail) {
        showToast(customEvent.detail.text, customEvent.detail.type, customEvent.detail.title)
      }
    }

    window.addEventListener(TOAST_EVENT, handleCustomToast)

    const originalAlert = window.alert
    window.alert = (message?: any) => {
      showToast(String(message ?? ''), 'err')
    }

    return () => {
      window.removeEventListener(TOAST_EVENT, handleCustomToast)
      window.alert = originalAlert
    }
  }, [showToast])

  useEffect(() => {
    if (!toastState) return
    const timer = setTimeout(() => {
      setToastState(null)
    }, 3200)
    return () => clearTimeout(timer)
  }, [toastState])

  return (
    <ToastContext.Provider value={{ toast: toastState, showToast, success, error, hideToast }}>
      {children}
      <AppToast toast={toastState} onClose={hideToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      toast: null,
      showToast: showGlobalToast,
      success: (text: string, title?: string) => showGlobalToast(text, 'ok', title),
      error: (text: string, title?: string) => showGlobalToast(text, 'err', title),
      hideToast: () => {},
    }
  }
  return context
}

export function AppToast({ toast, onClose }: { toast: AppToastState; onClose?: () => void }) {
  if (!toast) return null

  const isSuccess = toast.type === 'ok'
  const Icon = isSuccess ? CheckCircle2 : AlertCircle
  const title = toast.title || (isSuccess ? 'Berhasil' : 'Tindakan gagal')

  return (
    <div
      role="status"
      aria-live={isSuccess ? 'polite' : 'assertive'}
      style={{
        zIndex: 2147483647,
        top: 'calc(env(safe-area-inset-top, 0px) + 18px)',
        right: 'max(16px, env(safe-area-inset-right, 0px))',
      }}
      className={`fixed w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-white shadow-[0_16px_38px_rgba(15,23,42,0.16)] animate-fade-up dark:bg-slate-900 text-left ${
        isSuccess
          ? 'border-emerald-200/90 dark:border-emerald-900/70'
          : 'border-rose-200/90 dark:border-rose-900/70'
      }`}
    >
      <div className="flex items-start px-4 py-3.5 text-left relative">
        <Icon
          className={`h-6 w-6 shrink-0 mt-0.5 mr-3 ${
            isSuccess ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
          }`}
        />
        <div className="min-w-0 flex-1 pt-0.5 text-left pr-4">
          <p className="text-xs font-bold text-slate-900 dark:text-white text-left">{title}</p>
          <p className="mt-1 break-words text-xs leading-relaxed text-slate-600 dark:text-slate-300 text-left">
            {toast.text}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden pointer-events-none rounded-b-xl">
        <span
          key={toast.id}
          className={`block h-full w-full animate-toast-progress ${
            isSuccess ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
          style={{ transformOrigin: 'left center' }}
        />
      </div>
    </div>
  )
}
