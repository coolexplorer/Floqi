import * as React from 'react'
import { cn } from '@/lib/cn'

export type SpinnerSize = 'sm' | 'md' | 'lg'

export interface SpinnerProps {
  size?: SpinnerSize
  color?: string
  label?: string
  className?: string
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
}

export function Spinner({
  size = 'md',
  color = 'currentColor',
  label = 'Loading',
  className,
}: SpinnerProps) {
  const px = sizeMap[size]

  return (
    <svg
      role="status"
      aria-label={label}
      xmlns="http://www.w3.org/2000/svg"
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      className={cn('animate-spin', className)}
    >
      <circle
        cx={12}
        cy={12}
        r={10}
        strokeOpacity={0.25}
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        strokeOpacity={1}
      />
    </svg>
  )
}
