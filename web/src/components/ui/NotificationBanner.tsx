import * as React from 'react'
import { cn } from '@/lib/cn'

export type NotificationBannerVariant = 'info' | 'success' | 'warning' | 'error'

export interface NotificationBannerProps {
  variant?: NotificationBannerVariant
  icon?: React.ReactNode
  message: React.ReactNode
  actionLabel?: string
  onAction?: () => void
  onClose?: () => void
  className?: string
}

const variantStyles: Record<
  NotificationBannerVariant,
  { container: string; icon: string; action: string }
> = {
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'text-blue-500',
    action: 'text-blue-700 hover:text-blue-900 underline',
  },
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: 'text-green-500',
    action: 'text-green-700 hover:text-green-900 underline',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: 'text-amber-500',
    action: 'text-amber-700 hover:text-amber-900 underline',
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: 'text-red-500',
    action: 'text-red-700 hover:text-red-900 underline',
  },
}

const DefaultIcons: Record<NotificationBannerVariant, React.ReactNode> = {
  info: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  ),
  success: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  ),
}

export function NotificationBanner({
  variant = 'info',
  icon,
  message,
  actionLabel,
  onAction,
  onClose,
  className,
}: NotificationBannerProps) {
  const styles = variantStyles[variant]
  const displayIcon = icon ?? DefaultIcons[variant]

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 border px-4 py-3 text-sm',
        styles.container,
        className
      )}
    >
      {/* Icon */}
      <span className={cn('mt-0.5 shrink-0', styles.icon)}>{displayIcon}</span>

      {/* Message */}
      <div className="flex-1">{message}</div>

      {/* Action button */}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className={cn('shrink-0 font-medium', styles.action)}
        >
          {actionLabel}
        </button>
      )}

      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}
    </div>
  )
}
