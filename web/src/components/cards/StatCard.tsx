import * as React from 'react'
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'

export interface StatCardProps {
  value: number | string
  label: string
  icon: LucideIcon
  iconColor?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  className?: string
}

const trendConfig = {
  up: { Icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  down: { Icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
  neutral: { Icon: Minus, color: 'text-slate-500', bg: 'bg-slate-50' },
}

export function StatCard({
  value,
  label,
  icon: Icon,
  iconColor = 'text-blue-600',
  trend,
  trendValue,
  className,
}: StatCardProps) {
  const trendMeta = trend ? trendConfig[trend] : null

  return (
    <Card variant="elevated" padding="p-5" className={className}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 truncate">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{value}</p>
          {trendMeta && trendValue && (
            <div
              className={cn(
                'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                trendMeta.color,
                trendMeta.bg
              )}
            >
              <trendMeta.Icon className="h-3 w-3" aria-hidden="true" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50',
          )}
          aria-hidden="true"
        >
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
      </div>
    </Card>
  )
}
