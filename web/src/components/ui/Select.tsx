'use client'

import * as React from 'react'
import { ChevronDown, Check, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  searchable?: boolean
  disabled?: boolean
  error?: boolean
  errorMessage?: string
  className?: string
  id?: string
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value,
      onChange,
      placeholder = 'Select an option',
      searchable = false,
      disabled = false,
      error = false,
      errorMessage,
      className,
      id,
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    const listboxId = `${inputId}-listbox`

    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState('')
    const [focusedIndex, setFocusedIndex] = React.useState(-1)

    const containerRef = React.useRef<HTMLDivElement>(null)
    const searchRef = React.useRef<HTMLInputElement>(null)
    const optionRefs = React.useRef<(HTMLLIElement | null)[]>([])

    const selectedOption = options.find((o) => o.value === value)

    const filtered = searchable
      ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
      : options

    function openDropdown() {
      if (disabled) return
      setOpen(true)
      setQuery('')
      setFocusedIndex(value ? filtered.findIndex((o) => o.value === value) : -1)
    }

    function closeDropdown() {
      setOpen(false)
      setQuery('')
      setFocusedIndex(-1)
    }

    function selectOption(opt: SelectOption) {
      if (opt.disabled) return
      onChange?.(opt.value)
      closeDropdown()
    }

    // Close on outside click
    React.useEffect(() => {
      if (!open) return
      function handleClick(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          closeDropdown()
        }
      }
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    // Focus search input when opened
    React.useEffect(() => {
      if (open && searchable) {
        setTimeout(() => searchRef.current?.focus(), 0)
      }
    }, [open, searchable])

    // Scroll focused item into view
    React.useEffect(() => {
      if (focusedIndex >= 0) {
        optionRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' })
      }
    }, [focusedIndex])

    function handleKeyDown(e: React.KeyboardEvent) {
      if (disabled) return

      if (!open) {
        if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
          e.preventDefault()
          openDropdown()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((i) => {
            const next = i + 1
            return next < filtered.length ? next : 0
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((i) => {
            const prev = i - 1
            return prev >= 0 ? prev : filtered.length - 1
          })
          break
        case 'Enter':
          e.preventDefault()
          if (focusedIndex >= 0 && filtered[focusedIndex]) {
            selectOption(filtered[focusedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          closeDropdown()
          break
        case 'Tab':
          closeDropdown()
          break
      }
    }

    return (
      <div ref={ref} className={cn('relative w-full', className)}>
        <div ref={containerRef}>
          {/* Trigger */}
          <button
            type="button"
            id={inputId}
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={open && focusedIndex >= 0 ? `${listboxId}-opt-${focusedIndex}` : undefined}
            aria-invalid={error}
            aria-describedby={errorMessage ? errorId : undefined}
            disabled={disabled}
            onClick={() => (open ? closeDropdown() : openDropdown())}
            onKeyDown={handleKeyDown}
            className={cn(
              'flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200',
              disabled && 'cursor-not-allowed bg-slate-50 text-slate-400',
              !disabled && 'hover:border-slate-400'
            )}
          >
            <span className={cn('truncate', !selectedOption && 'text-slate-400')}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
            <ChevronDown
              className={cn(
                'ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150',
                open && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
              {searchable && (
                <div className="flex items-center border-b border-slate-100 px-3 py-2">
                  <Search className="mr-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setFocusedIndex(-1)
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search..."
                    className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    aria-label="Search options"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                      className="ml-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              <ul
                id={listboxId}
                role="listbox"
                aria-label="Options"
                className="max-h-60 overflow-auto py-1"
              >
                {filtered.length === 0 ? (
                  <li role="option" aria-disabled="true" aria-selected="false" className="px-3 py-2 text-sm text-slate-400">No options found</li>
                ) : (
                  filtered.map((opt, idx) => (
                    <li
                      key={opt.value}
                      id={`${listboxId}-opt-${idx}`}
                      ref={(el) => {
                        optionRefs.current[idx] = el
                      }}
                      role="option"
                      aria-selected={opt.value === value}
                      aria-disabled={opt.disabled}
                      onClick={() => selectOption(opt)}
                      onMouseEnter={() => setFocusedIndex(idx)}
                      className={cn(
                        'flex cursor-pointer items-center justify-between px-3 py-2 text-sm',
                        opt.value === value
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-700',
                        focusedIndex === idx && opt.value !== value && 'bg-slate-100',
                        opt.disabled && 'cursor-not-allowed text-slate-300'
                      )}
                    >
                      <span>{opt.label}</span>
                      {opt.value === value && (
                        <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {errorMessage && (
          <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'
