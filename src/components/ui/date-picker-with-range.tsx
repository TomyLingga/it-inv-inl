"use client"

import * as React from "react"
import { addDays, format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { type DateRange as DayPickerDateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerWithRangeProps {
  className?: string
  label?: string
  dateRange?: { start: string; end: string }
  onDateChange?: (field: 'start' | 'end', value: string) => void
  onRangeChange?: (range: { start: string; end: string }) => void
  selected?: DayPickerDateRange
  onSelectRange?: (range: DayPickerDateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  label = "Date Picker Range",
  dateRange,
  onDateChange,
  onRangeChange,
  selected,
  onSelectRange,
}: DatePickerWithRangeProps = {}) {
  const [internalDate, setInternalDate] = React.useState<DayPickerDateRange | undefined>(() => {
    if (dateRange?.start && dateRange?.end) {
      const [sY, sM, sD] = dateRange.start.split('-').map(Number)
      const [eY, eM, eD] = dateRange.end.split('-').map(Number)
      if (!isNaN(sY) && !isNaN(sM) && !isNaN(sD) && !isNaN(eY) && !isNaN(eM) && !isNaN(eD)) {
        return {
          from: new Date(sY, sM - 1, sD),
          to: new Date(eY, eM - 1, eD),
        }
      }
    }
    return {
      from: new Date(new Date().getFullYear(), 0, 20),
      to: addDays(new Date(new Date().getFullYear(), 0, 20), 20),
    }
  })

  React.useEffect(() => {
    if (dateRange?.start && dateRange?.end) {
      const [sY, sM, sD] = dateRange.start.split('-').map(Number)
      const [eY, eM, eD] = dateRange.end.split('-').map(Number)
      if (!isNaN(sY) && !isNaN(sM) && !isNaN(sD) && !isNaN(eY) && !isNaN(eM) && !isNaN(eD)) {
        setInternalDate({
          from: new Date(sY, sM - 1, sD),
          to: new Date(eY, eM - 1, eD),
        })
      }
    }
  }, [dateRange?.start, dateRange?.end])

  const date = selected !== undefined ? selected : internalDate

  const handleSelect = (newRange: DayPickerDateRange | undefined) => {
    if (selected === undefined) {
      setInternalDate(newRange)
    }
    onSelectRange?.(newRange)

    if (newRange?.from && newRange?.to) {
      const startStr = format(newRange.from, "yyyy-MM-dd")
      const endStr = format(newRange.to, "yyyy-MM-dd")

      onRangeChange?.({ start: startStr, end: endStr })
      onDateChange?.('start', startStr)
      onDateChange?.('end', endStr)
    } else if (newRange?.from) {
      const startStr = format(newRange.from, "yyyy-MM-dd")
      onDateChange?.('start', startStr)
    }
  }

  return (
    <Field className={className || "w-full"}>
      {label && <FieldLabel htmlFor="date-picker-range">{label}</FieldLabel>}
      <Popover>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              id="date-picker-range"
              className="w-full justify-start px-3 font-normal bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl h-10 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700/70 transition-all text-xs sm:text-sm"
            >
              <CalendarIcon data-icon="inline-start" className="mr-2 h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0" />
              {date?.from ? (
                date.to ? (
                  <span className="truncate">
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </span>
                ) : (
                  <span>{format(date.from, "LLL dd, y")}</span>
                )
              ) : (
                <span className="text-slate-400 dark:text-slate-500">Pick a date</span>
              )}
            </Button>
          }
        />
        <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}
