'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export interface ToolUsageData {
  toolName: string
  totalCalls: number
  successCalls: number
  errorCalls: number
}

export interface ToolUsageChartProps {
  data: ToolUsageData[]
}

function truncateLabel(label: string, maxLen = 12): string {
  return label.length > maxLen ? label.slice(0, maxLen) + '\u2026' : label
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
  if (!active || !payload?.length) return null
  const success = payload.find((p) => p.dataKey === 'successCalls')
  const error = payload.find((p) => p.dataKey === 'errorCalls')
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-slate-800">{label}</p>
      {success && <p className="text-xs" style={{ color: '#22c55e' }}>Success: {success.value}</p>}
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>Error: {error.value}</p>}
    </div>
  )
}

export function ToolUsageChart({ data }: ToolUsageChartProps) {
  if (data.length === 0) {
    return (
      <div data-testid="tool-usage-chart">
        <Card variant="elevated">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Tool Usage</h3>
          <EmptyState
            icon={BarChart3}
            title="No data available"
            description="Tool usage data will appear here once automations run."
            className="py-10"
          />
        </Card>
      </div>
    )
  }

  return (
    <div data-testid="tool-usage-chart">
      <Card variant="elevated">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Tool Usage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="toolName" tickFormatter={truncateLabel} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="successCalls" stackId="stack" fill="#22c55e" radius={[0, 0, 0, 0]} />
            <Bar dataKey="errorCalls" stackId="stack" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
