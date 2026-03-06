import * as React from 'react'
import { cn } from '@/lib/cn'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  label?: string
  className?: string
}

const trackStyles = {
  sm: 'h-5 w-9',
  md: 'h-6 w-11',
}

const thumbStyles = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4.5 w-4.5',
}

const thumbTranslate = {
  sm: 'translate-x-4',
  md: 'translate-x-5',
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-blue-600' : 'bg-slate-200',
        trackStyles[size],
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-in-out',
          'translate-x-0.5',
          checked ? thumbTranslate[size] : 'translate-x-0.5',
          size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]'
        )}
      />
    </button>
  )
}
