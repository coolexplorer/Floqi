import * as React from 'react'
import { cn } from '@/lib/cn'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Toggle } from '@/components/ui/Toggle'

const GoogleLogo = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)

export interface Service {
  name: string
  logo: React.ReactNode
  connected: boolean
  connectedAt?: string
  scopes?: string[]
}

export interface ServiceCardProps {
  service: Service
  onConnect?: () => void
  onDisconnect?: () => void
  className?: string
}

const SCOPE_LABELS: Record<string, string> = {
  'https://www.googleapis.com/auth/gmail.readonly': 'Gmail 읽기',
  'https://www.googleapis.com/auth/gmail.send': 'Gmail 전송',
  'https://www.googleapis.com/auth/calendar.readonly': 'Calendar 읽기',
  'https://www.googleapis.com/auth/calendar': 'Calendar 관리',
}

function formatScope(scope: string): string {
  return SCOPE_LABELS[scope] ?? scope
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ServiceCard({ service, onConnect, onDisconnect, className }: ServiceCardProps) {
  const { name, logo, connected, connectedAt, scopes } = service

  return (
    <Card variant="elevated" padding="p-5" className={className}>
      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white"
          aria-hidden="true"
        >
          {name === 'Google' ? <GoogleLogo /> : logo}
        </div>

        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">{name}</span>
            <Badge variant={connected ? 'success' : 'neutral'} size="sm">
              {connected ? '연결됨' : '미연결'}
            </Badge>
          </div>

          {connected && connectedAt && (
            <p className="text-xs text-slate-500">연결일: {formatDate(connectedAt)}</p>
          )}

          {connected && scopes && scopes.length > 0 && (
            <p className="text-xs text-slate-400 truncate" title={scopes.map(formatScope).join(', ')}>
              권한: {scopes.map(formatScope).join(', ')}
            </p>
          )}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          {!connected && (
            <button
              type="button"
              onClick={onConnect}
              aria-label={`Connect ${name}`}
              className="sr-only"
            />
          )}
          <Toggle
            checked={connected}
            onChange={(newChecked) => {
              if (newChecked) {
                onConnect?.()
              } else {
                onDisconnect?.()
              }
            }}
            label={connected ? `${name} 연결 해제` : `${name} 연결`}
          />
        </div>
      </div>
    </Card>
  )
}
