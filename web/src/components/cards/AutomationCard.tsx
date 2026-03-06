import * as React from 'react'
import { LucideIcon, Pencil, Pause, Play, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'
import { Badge, BadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export type AutomationStatus = 'active' | 'paused' | 'error'

export interface Automation {
  id: string
  name: string
  templateIcon: LucideIcon
  status: AutomationStatus
  lastRun?: string
  nextRun?: string
  schedule?: string
}

export interface AutomationCardProps {
  automation: Automation
  onEdit?: (id: string) => void
  onToggle?: (id: string, newStatus: 'active' | 'paused') => void
  onDelete?: (id: string) => void
  className?: string
}

const statusConfig: Record<AutomationStatus, { variant: BadgeVariant; label: string }> = {
  active: { variant: 'success', label: '활성' },
  paused: { variant: 'neutral', label: '일시정지' },
  error: { variant: 'error', label: '오류' },
}

function formatRunTime(iso?: string): string {
  if (!iso) return '없음'
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AutomationCard({
  automation,
  onEdit,
  onToggle,
  onDelete,
  className,
}: AutomationCardProps) {
  const { id, name, templateIcon: Icon, status, lastRun, nextRun, schedule } = automation
  const statusMeta = statusConfig[status]

  const handleToggle = () => {
    onToggle?.(id, status === 'active' ? 'paused' : 'active')
  }

  return (
    <Card variant="elevated" padding="p-5" className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
          {schedule && (
            <p className="text-xs text-slate-500 mt-0.5">{schedule}</p>
          )}
        </div>
        <Badge variant={statusMeta.variant} size="sm">
          {statusMeta.label}
        </Badge>
      </div>

      {/* Meta */}
      <div className="flex gap-4 text-xs text-slate-500">
        <div>
          <span className="block text-slate-400">마지막 실행</span>
          <span>{formatRunTime(lastRun)}</span>
        </div>
        <div>
          <span className="block text-slate-400">다음 실행</span>
          <span>{formatRunTime(nextRun)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
        <Button
          variant="ghost"
          size="sm"
          icon={<Pencil className="h-3.5 w-3.5" />}
          onClick={() => onEdit?.(id)}
          aria-label={`${name} 편집`}
        >
          편집
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={
            status === 'active' ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )
          }
          onClick={handleToggle}
          aria-label={status === 'active' ? `${name} 일시정지` : `${name} 재개`}
          disabled={status === 'error'}
        />
        <Button
          variant="ghost"
          size="sm"
          icon={<Trash2 className="h-3.5 w-3.5 text-red-500" />}
          onClick={() => onDelete?.(id)}
          aria-label={`${name} 삭제`}
          className="ml-auto text-red-600 hover:bg-red-50"
        >
          삭제
        </Button>
      </div>
    </Card>
  )
}
