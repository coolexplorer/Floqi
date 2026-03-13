'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export interface ExecutionTrendData {
  date: string
  success: number
  error: number
  total: number
}

export interface ExecutionTrendChartProps {
  data: ExecutionTrendData[]
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
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-slate-600">{formatDate(label)}</p>
      {payload.map((entry) => (
        <p
          key={entry.dataKey}
          className="text-xs"
          style={{ color: entry.dataKey === 'success' ? '#22c55e' : '#ef4444' }}
        >
          {entry.dataKey === 'success' ? 'Success' : 'Error'}: {entry.value}
        </p>
      ))}
    </div>
  )
}

export function ExecutionTrendChart({ data }: ExecutionTrendChartProps) {
  if (data.length === 0) {
    return (
      <div data-testid="execution-trend-chart">
        <Card variant="elevated">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Execution Trend</h3>
          <EmptyState
            icon={BarChart3}
            title="No data available"
            description="Execution data will appear here once automations run."
            className="py-10"
          />
        </Card>
      </div>
    )
  }

  return (
    <div data-testid="execution-trend-chart">
      <Card variant="elevated">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Execution Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="success" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.6} />
            <Area type="monotone" dataKey="error" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
