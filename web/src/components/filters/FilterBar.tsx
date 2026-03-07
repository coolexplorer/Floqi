'use client'

import * as React from 'react'
import { Search, Calendar, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

export type AutomationStatus = 'all' | 'active' | 'paused' | 'failed'

export interface FilterBarProps {
  onSearch?: (query: string) => void
  onStatusChange?: (status: AutomationStatus) => void
  onDateChange?: (range: { from: string; to: string } | null) => void
  initialQuery?: string
  initialStatus?: AutomationStatus
  className?: string
}

const statusOptions: { value: AutomationStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'failed', label: 'Failed' },
]

const statusStyles: Record<AutomationStatus, string> = {
  all: 'bg-slate-900 text-white border-slate-900',
  active: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  paused: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  failed: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
}

const inactiveStatusStyles: Record<AutomationStatus, string> = {
  all: 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
  active: 'bg-white text-slate-600 border-slate-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200',
  paused: 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200',
  failed: 'bg-white text-slate-600 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200',
}

export function FilterBar({
  onSearch,
  onStatusChange,
  onDateChange,
  initialQuery = '',
  initialStatus = 'all',
  className,
}: FilterBarProps) {
  const [query, setQuery] = React.useState(initialQuery)
  const [activeStatus, setActiveStatus] = React.useState<AutomationStatus>(initialStatus)
  const [dateFrom, setDateFrom] = React.useState('')
  const [dateTo, setDateTo] = React.useState('')
  const [showDatePicker, setShowDatePicker] = React.useState(false)

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onSearch?.(value)
    }, 300)
  }

  function handleClearSearch() {
    setQuery('')
    onSearch?.('')
  }

  function handleStatusChange(status: AutomationStatus) {
    setActiveStatus(status)
    onStatusChange?.(status)
  }

  function handleDateApply() {
    if (dateFrom || dateTo) {
      onDateChange?.({ from: dateFrom, to: dateTo })
    }
    setShowDatePicker(false)
  }

  function handleDateClear() {
    setDateFrom('')
    setDateTo('')
    onDateChange?.(null)
    setShowDatePicker(false)
  }

  const hasDateFilter = dateFrom || dateTo

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4',
        className
      )}
      role="search"
      aria-label="Filter automations"
    >
      {/* Search input */}
      <div className="relative min-w-0 flex-1 sm:max-w-xs">
        <Input
          type="search"
          placeholder="Search automations..."
          value={query}
          onChange={handleSearchChange}
          icon={<Search className="h-4 w-4" />}
          iconPosition="left"
          aria-label="Search automations"
        />
        {query && (
          <button
            type="button"
            onClick={handleClearSearch}
            aria-label="Clear search"
            className={cn(
              'absolute right-2.5 top-1/2 -translate-y-1/2',
              'flex h-5 w-5 items-center justify-center rounded-full',
              'text-slate-400 hover:text-slate-600 hover:bg-slate-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
            )}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Status filters */}
      <div
        className="flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filter by status"
      >
        {statusOptions.map((option) => {
          const isActive = activeStatus === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleStatusChange(option.value)}
              className={cn(
                'inline-flex h-8 items-center rounded-full border px-3 text-sm font-medium',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                isActive ? statusStyles[option.value] : inactiveStatusStyles[option.value]
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>

      {/* Date range picker (optional) */}
      <div className="relative ml-auto">
        <Button
          type="button"
          variant={hasDateFilter ? 'outline' : 'secondary'}
          size="sm"
          icon={<Calendar className="h-3.5 w-3.5" />}
          onClick={() => setShowDatePicker((v) => !v)}
          aria-expanded={showDatePicker}
          aria-label={hasDateFilter ? 'Date filter active — click to change' : 'Filter by date'}
        >
          {hasDateFilter ? `${dateFrom || '…'} → ${dateTo || '…'}` : 'Date range'}
        </Button>

        {showDatePicker && (
          <div
            className={cn(
              'absolute right-0 top-full z-[100] mt-1.5',
              'w-72 rounded-xl border border-slate-200 bg-white p-4',
              'shadow-lg'
            )}
            role="dialog"
            aria-label="Date range picker"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
              Date range
            </p>
            <div className="space-y-2.5">
              <div>
                <label htmlFor="date-from" className="mb-1 block text-xs text-slate-600">
                  From
                </label>
                <input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={cn(
                    'block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900',
                    'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
                  )}
                />
              </div>
              <div>
                <label htmlFor="date-to" className="mb-1 block text-xs text-slate-600">
                  To
                </label>
                <input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={cn(
                    'block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900',
                    'focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200'
                  )}
                />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDateClear}
                className="flex-1 text-slate-500"
              >
                Clear
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDateApply}
                className="flex-1"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
