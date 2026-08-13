"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, defaultChecked, checked: controlledChecked, onChange, onCheckedChange, ...props }, ref) => {
    const [checked, setChecked] = React.useState<boolean>(
      controlledChecked !== undefined ? controlledChecked : !!defaultChecked
    )

    React.useEffect(() => {
      if (controlledChecked !== undefined) {
        setChecked(controlledChecked)
      }
    }, [controlledChecked])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = e.target.checked
      if (controlledChecked === undefined) {
        setChecked(isChecked)
      }
      onChange?.(e)
      onCheckedChange?.(isChecked)
    }

    return (
      <label className="relative inline-flex items-center cursor-pointer select-none">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          className="sr-only peer"
          {...props}
        />
        <div
          className={cn(
            "h-4 w-4 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 transition-all flex items-center justify-center peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-checked:bg-blue-600 peer-checked:border-blue-600 dark:peer-checked:bg-blue-600 dark:peer-checked:border-blue-600 text-white shadow-2xs",
            className
          )}
        >
          {checked && <Check className="h-3 w-3 stroke-[3] text-white" />}
        </div>
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"
