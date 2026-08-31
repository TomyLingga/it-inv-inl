// src/app/shared/components/SearchableSelect.tsx
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search, Check, X } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  /** Always-present option shown on top (e.g. "Semua Material"). */
  allOption?: SelectOption
  placeholder?: string
  searchPlaceholder?: string
  icon?: React.ReactNode
  disabled?: boolean
  className?: string
  /** Accent ring color utility (defaults to indigo). */
  focusRing?: string
}

/**
 * Lightweight searchable dropdown (combobox). Click to open, type to filter,
 * click an option to select. Closes on outside-click or Escape. No external deps.
 */
export default function SearchableSelect({
  value,
  onChange,
  options,
  allOption,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Cari...',
  icon,
  disabled = false,
  className = '',
  focusRing = 'focus:ring-indigo-500',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const allOptions = useMemo(
    () => (allOption ? [allOption, ...options] : options),
    [allOption, options]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allOptions
    return allOptions.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
  }, [allOptions, query])

  const selected = allOptions.find((o) => o.value === value)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Focus the search box when opening
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
      // defer so the input is mounted
      const t = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(t)
    }
  }, [open])

  const commit = (val: string) => {
    onChange(val)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const opt = filtered[activeIdx]
      if (opt) commit(opt.value)
    }
  }

  // Keep the active option in view
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx, open])

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`w-full h-10 flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 ${focusRing} font-medium cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {icon && <span className="shrink-0 text-slate-400">{icon}</span>}
        <span className={`flex-1 text-left truncate ${selected ? '' : 'text-slate-400 dark:text-slate-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full min-w-[240px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Search box */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-700/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIdx(0)
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                className="w-full h-9 pl-8 pr-8 text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    inputRef.current?.focus()
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <ul ref={listRef} className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-xs text-slate-400 text-center">Tidak ada material yang cocok</li>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.value === value
                const isActive = idx === activeIdx
                return (
                  <li key={opt.value} data-idx={idx}>
                    <button
                      type="button"
                      onClick={() => commit(opt.value)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white font-semibold'
                          : isActive
                          ? 'bg-slate-100 dark:bg-slate-700/70 text-slate-900 dark:text-slate-100'
                          : 'text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="flex-1 truncate">{opt.label}</span>
                      {isSelected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
