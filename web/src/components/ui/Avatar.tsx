import * as React from 'react'
import { cn } from '@/lib/cn'

export type AvatarSize = 'sm' | 'md' | 'lg'
export type AvatarStatus = 'online' | 'offline' | 'away' | 'busy'

export interface AvatarProps {
  src?: string
  alt?: string
  initials?: string
  size?: AvatarSize
  status?: AvatarStatus
  className?: string
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

const statusDotSize: Record<AvatarSize, string> = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

const statusColors: Record<AvatarStatus, string> = {
  online: 'bg-green-500',
  offline: 'bg-slate-400',
  away: 'bg-amber-400',
  busy: 'bg-red-500',
}

export function Avatar({
  src,
  alt = '',
  initials,
  size = 'md',
  status,
  className,
}: AvatarProps) {
  const [imgError, setImgError] = React.useState(false)

  const showImage = src && !imgError

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full overflow-hidden',
          'font-medium select-none',
          showImage ? '' : 'bg-blue-100 text-blue-700',
          sizeStyles[size]
        )}
      >
        {showImage ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={src}
            alt={alt}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <span aria-label={alt || initials}>
            {initials ? initials.slice(0, 2).toUpperCase() : '?'}
          </span>
        )}
      </div>

      {status && (
        <span
          aria-label={`Status: ${status}`}
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
            statusDotSize[size],
            statusColors[status]
          )}
        />
      )}
    </div>
  )
}
