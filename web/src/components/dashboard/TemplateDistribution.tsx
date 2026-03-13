'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'

export interface TemplateDistData {
  templateType: string
  count: number
  percentage: number
}

export interface TemplateDistributionProps {
  data: TemplateDistData[]
  totalExecutions: number
}

const TEMPLATE_COLORS: Record<string, string> = {
  morning_briefing: '#f59e0b',
  email_triage: '#3b82f6',
  reading_digest: '#22c55e',
  weekly_review: '#8b5cf6',
  smart_save: '#ef4444',
}

const FALLBACK_COLORS = ['#f59e0b', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444']

function formatTemplateName(type: string): string {
  return type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: TemplateDistData }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-slate-800">{formatTemplateName(item.templateType)}</p>
      <p className="text-xs text-slate-600">Count: {item.count}</p>
      <p className="text-xs text-slate-600">{item.percentage.toFixed(1)}%</p>
    </div>
  )
}

function CenterLabel({ viewBox, totalExecutions }: { viewBox?: { cx?: number; cy?: number }; totalExecutions: number }) {
  const cx = viewBox?.cx ?? 0
  const cy = viewBox?.cy ?? 0
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.5em" className="text-2xl font-bold" fill="#1e293b">{totalExecutions}</tspan>
      <tspan x={cx} dy="1.5em" className="text-xs" fill="#64748b">Total</tspan>
    </text>
  )
}

export function TemplateDistribution({ data, totalExecutions }: TemplateDistributionProps) {
  if (data.length === 0) {
    return (
      <div data-testid="template-distribution-chart">
        <Card variant="elevated">
          <h3 className="mb-4 text-base font-semibold text-slate-800">Template Distribution</h3>
          <EmptyState
            icon={PieChartIcon}
            title="No data available"
            description="Distribution data will appear here once automations run."
            className="py-10"
          />
        </Card>
      </div>
    )
  }

  return (
    <div data-testid="template-distribution-chart">
      <Card variant="elevated">
        <h3 className="mb-4 text-base font-semibold text-slate-800">Template Distribution</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="templateType"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              label={(props) => formatTemplateName(String((props as unknown as TemplateDistData).templateType ?? ''))}
            >
              {data.map((entry, index) => (
                <Cell key={entry.templateType} fill={TEMPLATE_COLORS[entry.templateType] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]} />
              ))}
              <CenterLabel totalExecutions={totalExecutions} />
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="bottom" formatter={(value: string) => formatTemplateName(value)} />
          </PieChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}
