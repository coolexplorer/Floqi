import * as React from 'react'
import { cn } from '@/lib/cn'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  variant?: ToastVariant
  message: React.ReactNode
  duration?: number
  onClose: (id: string) => void
}

const variantStyles: Record<
  ToastVariant,
  { container: string; icon: string; iconBg: string }
> = {
  success: {
    container: 'border-green-200 bg-white',
    icon: 'text-green-600',
    iconBg: 'bg-green-50',
  },
  error: {
    container: 'border-red-200 bg-white',
    icon: 'text-red-600',
    iconBg: 'bg-red-50',
  },
  warning: {
    container: 'border-amber-200 bg-white',
    icon: 'text-amber-600',
    iconBg: 'bg-amber-50',
  },
  info: {
    container: 'border-blue-200 bg-white',
    icon: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
}

const ToastIcons: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  ),
}

export function Toast({
  id,
  variant = 'info',
  message,
  duration = 5000,
  onClose,
}: ToastProps) {
  const [visible, setVisible] = React.useState(false)
  const styles = variantStyles[variant]

  // Slide in on mount
  React.useEffect(() => {
    const showTimer = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(showTimer)
  }, [])

  // Auto-dismiss
  React.useEffect(() => {
    const dismissTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onClose(id), 300)
    }, duration)
    return () => clearTimeout(dismissTimer)
  }, [id, duration, onClose])

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => onClose(id), 300)
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 shadow-md',
        'w-80 max-w-full',
        'transition-all duration-300 ease-out',
        visible
          ? 'translate-x-0 opacity-100'
          : 'translate-x-4 opacity-0',
        styles.container
      )}
    >
      {/* Icon */}
      <div className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full', styles.iconBg)}>
        <span className={styles.icon}>{ToastIcons[variant]}</span>
      </div>

      {/* Message */}
      <div className="flex-1 pt-1 text-sm text-slate-800">{message}</div>

      {/* Close button */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close notification"
        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  )
}
