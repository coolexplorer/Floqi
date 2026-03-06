import * as React from 'react'
import { cn } from '@/lib/cn'

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean
  maxLength?: number
  error?: boolean
  errorMessage?: string
}

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      autoResize = false,
      maxLength,
      error = false,
      errorMessage,
      disabled,
      className,
      id,
      value,
      defaultValue,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`

    const [charCount, setCharCount] = React.useState(() => {
      if (value !== undefined) return String(value).length
      if (defaultValue !== undefined) return String(defaultValue).length
      return 0
    })

    const internalRef = React.useRef<HTMLTextAreaElement>(null)
    const mergedRef = (node: HTMLTextAreaElement | null) => {
      internalRef.current = node
      if (typeof ref === 'function') {
        ref(node)
      } else if (ref) {
        ref.current = node
      }
    }

    const resize = React.useCallback(() => {
      const el = internalRef.current
      if (!el || !autoResize) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }, [autoResize])

    React.useEffect(() => {
      resize()
    }, [value, resize])

    function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
      setCharCount(e.target.value.length)
      if (autoResize) resize()
      onChange?.(e)
    }

    return (
      <div className="w-full">
        <textarea
          ref={mergedRef}
          id={inputId}
          disabled={disabled}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          aria-invalid={error}
          aria-describedby={errorMessage ? errorId : undefined}
          onChange={handleChange}
          className={cn(
            'block w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900',
            'placeholder:text-slate-400',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            'resize-none',
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
              : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200',
            disabled && 'cursor-not-allowed bg-slate-50 text-slate-400',
            !autoResize && 'resize-y',
            className
          )}
          {...props}
        />
        <div className="mt-1 flex items-start justify-between gap-2">
          {errorMessage && (
            <p id={errorId} className="text-xs text-red-600" role="alert">
              {errorMessage}
            </p>
          )}
          {maxLength !== undefined && (
            <p
              className={cn(
                'ml-auto text-xs',
                charCount >= maxLength ? 'text-red-500' : 'text-slate-400'
              )}
              aria-live="polite"
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  }
)

TextArea.displayName = 'TextArea'
