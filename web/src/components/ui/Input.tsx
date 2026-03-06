import * as React from 'react'
import { cn } from '@/lib/cn'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  errorMessage?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      error = false,
      errorMessage,
      icon,
      iconPosition = 'left',
      disabled,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`

    return (
      <div className="w-full">
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={error}
            aria-describedby={errorMessage ? errorId : undefined}
            className={cn(
              'block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900',
              'placeholder:text-slate-400',
              'transition-colors duration-150',
              'focus:outline-none',
              error
                ? 'border-red-500 focus:border-red-500'
                : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100',
              disabled && 'cursor-not-allowed bg-slate-50 text-slate-400',
              icon && iconPosition === 'left' && 'pl-10',
              icon && iconPosition === 'right' && 'pr-10',
              className
            )}
            {...props}
          />
          {icon && iconPosition === 'right' && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </span>
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

Input.displayName = 'Input'
