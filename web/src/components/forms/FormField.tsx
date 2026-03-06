import * as React from 'react'
import { cn } from '@/lib/cn'
import { Input } from '@/components/ui/Input'

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  name: string
  error?: boolean
  errorMessage?: string
  required?: boolean
  helper?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      name,
      error = false,
      errorMessage,
      required = false,
      helper,
      id,
      className,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId()
    const fieldId = id ?? generatedId
    const helperId = `${fieldId}-helper`

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label
          htmlFor={fieldId}
          className="text-sm font-medium text-slate-700"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
        <Input
          ref={ref}
          id={fieldId}
          name={name}
          error={error}
          errorMessage={errorMessage}
          required={required}
          aria-describedby={helper && !errorMessage ? helperId : undefined}
          {...props}
        />
        {helper && !errorMessage && (
          <p id={helperId} className="text-xs text-slate-500">
            {helper}
          </p>
        )}
      </div>
    )
  }
)

FormField.displayName = 'FormField'
