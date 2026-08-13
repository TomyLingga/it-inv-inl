// src/app/components/ui/spinner.tsx

import * as React from 'react'
import { Loader2 } from 'lucide-react'

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'primary' | 'emerald' | 'white'
  label?: string
}

export const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      size = 'md',
      variant = 'primary',
      label = 'Memuat data...',
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12',
    }

    const variantClasses = {
      default: 'text-slate-400 dark:text-slate-500',
      primary: 'text-blue-600 dark:text-blue-400',
      emerald: 'text-emerald-600 dark:text-emerald-400',
      white: 'text-white',
    }

    return (
      <div
        ref={ref}
        role="status"
        className={`inline-flex items-center gap-3 ${className}`}
        {...props}
      >
        <div className="relative flex items-center justify-center">
          <Loader2
            className={`animate-spin shrink-0 ${sizeClasses[size]} ${variantClasses[variant]}`}
          />
        </div>
        {label && (
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </span>
        )}
      </div>
    )
  }
)
Spinner.displayName = 'Spinner'
