import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/cn'
import { FormField, FormFieldProps } from './FormField'

type PasswordStrength = 'weak' | 'medium' | 'strong'

function calcStrength(value: string): PasswordStrength | null {
  if (!value) return null
  const hasLower = /[a-z]/.test(value)
  const hasUpper = /[A-Z]/.test(value)
  const hasDigit = /\d/.test(value)
  const hasSpecial = /[^a-zA-Z0-9]/.test(value)
  const score = [hasLower, hasUpper, hasDigit, hasSpecial].filter(Boolean).length
  if (value.length < 8 || score < 2) return 'weak'
  if (value.length < 12 || score < 3) return 'medium'
  return 'strong'
}

const strengthConfig: Record<PasswordStrength, { label: string; color: string; bars: number }> = {
  weak: { label: '약함', color: 'bg-red-500', bars: 1 },
  medium: { label: '보통', color: 'bg-amber-500', bars: 2 },
  strong: { label: '강함', color: 'bg-green-500', bars: 3 },
}

export interface FormFieldPasswordProps extends Omit<FormFieldProps, 'type'> {
  showStrength?: boolean
}

export const FormFieldPassword = React.forwardRef<HTMLInputElement, FormFieldPasswordProps>(
  ({ showStrength = true, value, onChange, className, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)
    const [internalValue, setInternalValue] = React.useState('')

    const currentValue = value !== undefined ? String(value) : internalValue
    const strength = showStrength ? calcStrength(currentValue) : null

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInternalValue(e.target.value)
      onChange?.(e)
    }

    return (
      <div className={cn('flex flex-col gap-1.5', className)}>
        <div className="relative">
          <FormField
            ref={ref}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={handleChange}
            className="mb-0"
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? '비밀번호 숨기기' : '비밀번호 표시'}
            className={cn(
              'absolute right-3 text-slate-400 hover:text-slate-600',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded',
              props.errorMessage ? 'top-[2.15rem]' : 'top-[2.15rem]'
            )}
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>

        {showStrength && strength && (
          <div className="mt-1 space-y-1">
            <div className="flex gap-1" aria-hidden="true">
              {([1, 2, 3] as const).map((bar) => (
                <div
                  key={bar}
                  className={cn(
                    'h-1 flex-1 rounded-full transition-colors duration-200',
                    bar <= strengthConfig[strength].bars
                      ? strengthConfig[strength].color
                      : 'bg-slate-200'
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-slate-500">
              비밀번호 강도:{' '}
              <span
                className={cn(
                  'font-medium',
                  strength === 'weak' && 'text-red-600',
                  strength === 'medium' && 'text-amber-600',
                  strength === 'strong' && 'text-green-600'
                )}
              >
                {strengthConfig[strength].label}
              </span>
            </p>
          </div>
        )}
      </div>
    )
  }
)

FormFieldPassword.displayName = 'FormFieldPassword'
