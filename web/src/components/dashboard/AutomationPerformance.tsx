'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export interface AutomationPerfData {
  automationId: string
  name: string
  successRate: number
  totalExecutions: number
}

export interface AutomationPerformanceProps {
  data: AutomationPerfData[]
}

function getBarColor(rate: number): string {
  if (rate >= 90) return '#22c55e'
  if (rate >= 70) return '#eab308'
  return '#ef4444'
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: AutomationPerfData }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-slate-800">{item.name}</p>
      <p className="text-xs text-slate-600">Success Rate: {item.successRate.toFixed(1)}%</p>
      <p className="text-xs text-slate-600">Total Executions: {item.totalExecutions}</p>
    </div>
  )
}

export function AutomationPerformance({ data }: AutomationPerformanceProps) {
  if (data.length === 0) {
    return (
      <div data-testid="automation-performance-chart">
        <Card variant="elevated">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Automation Performance</h3>
          <EmptyState
            icon={BarChart3}
            title="No data available"
            description="Performance data will appear here once automations run."
            className="py-10"
          />
        </Card>
      </div>
    )
  }

  return (
    <div data-testid="automation-performance-chart">
      <Card variant="elevated">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Automation Performance</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12, fill: '#64748b' }} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#64748b' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="successRate" radius={[0, 4, 4, 0]}>
              {data.map((entry) => (
                <Cell key={entry.automationId} fill={getBarColor(entry.successRate)} />
              ))}
              <LabelList dataKey="totalExecutions" position="right" style={{ fontSize: 11, fill: '#64748b' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
