"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PopoverContextType {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const PopoverContext = React.createContext<PopoverContextType | null>(null)

export function Popover({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const popoverRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("keydown", handleKeyDown)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open])

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div ref={popoverRef} className="relative inline-block w-full">
        {children}
      </div>
    </PopoverContext.Provider>
  )
}

export function PopoverTrigger({
  render,
  children,
  className,
  ...props
}: {
  render?: React.ReactElement
  children?: React.ReactNode
  className?: string
  [key: string]: any
}) {
  const context = React.useContext(PopoverContext)
  if (!context) {
    throw new Error("PopoverTrigger must be used within Popover")
  }

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault()
    context.setOpen((prev) => !prev)
  }

  if (render) {
    return React.cloneElement(render, {
      onClick: (e: React.MouseEvent) => {
        render.props.onClick?.(e)
        toggle(e)
      },
    })
  }

  return (
    <div onClick={toggle} className={cn("cursor-pointer", className)} {...props}>
      {children}
    </div>
  )
}

export function PopoverContent({
  className,
  align = "start",
  children,
  ...props
}: {
  className?: string
  align?: "start" | "center" | "end"
  children: React.ReactNode
  [key: string]: any
}) {
  const context = React.useContext(PopoverContext)
  if (!context || !context.open) return null

  const alignStyles = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  }

  return (
    <div
      className={cn(
        "absolute z-50 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-3 animate-in fade-in-0 zoom-in-95",
        alignStyles[align],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
