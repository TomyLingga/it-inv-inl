import * as React from "react"
import { cn } from "@/lib/utils"

export function Field({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      {children}
    </div>
  )
}

export function FieldLabel({ className, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-semibold text-slate-700 dark:text-slate-300", className)}
      {...props}
    >
      {children}
    </label>
  )
}
