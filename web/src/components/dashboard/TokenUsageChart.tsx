'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export interface TokenTrendData {
  date: string
  haikuTokens: number
  sonnetTokens: number
  estimatedCost: number
}

export interface TokenUsageChartProps {
  data: TokenTrendData[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length || !label) return null
  const haiku = payload.find((p) => p.dataKey === 'haikuTokens')
  const sonnet = payload.find((p) => p.dataKey === 'sonnetTokens')
  const cost = payload.find((p) => p.dataKey === 'estimatedCost')
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-slate-600">{formatDate(label)}</p>
      {haiku && <p className="text-xs" style={{ color: '#3b82f6' }}>Haiku: {haiku.value.toLocaleString()} tokens</p>}
      {sonnet && <p className="text-xs" style={{ color: '#8b5cf6' }}>Sonnet: {sonnet.value.toLocaleString()} tokens</p>}
      {cost && <p className="text-xs text-slate-600">Cost: ${cost.value.toFixed(4)}</p>}
    </div>
  )
}

export function TokenUsageChart({ data }: TokenUsageChartProps) {
  if (data.length === 0) {
    return (
      <div data-testid="token-usage-chart">
        <Card variant="elevated">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Token Usage</h3>
          <EmptyState
            icon={BarChart3}
            title="No data available"
            description="Token usage data will appear here once automations run."
            className="py-10"
          />
        </Card>
      </div>
    )
  }

  return (
    <div data-testid="token-usage-chart">
      <Card variant="elevated">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Token Usage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis yAxisId="tokens" tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis yAxisId="cost" orientation="right" tickFormatter={(v: number) => `$${v.toFixed(2)}`} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Line yAxisId="tokens" type="monotone" dataKey="haikuTokens" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line yAxisId="tokens" type="monotone" dataKey="sonnetTokens" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            <Line yAxisId="cost" type="monotone" dataKey="estimatedCost" stroke="#64748b" strokeWidth={1} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
