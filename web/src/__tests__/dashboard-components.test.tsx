/**
 * Dashboard Chart Components Tests — TDD Red Phase
 *
 * Tests for 6 dashboard chart components:
 * 1. KPICard — KPI 카드 (value, label, trend, icon color)
 * 2. ExecutionTrendChart — 실행 추이 AreaChart
 * 3. TokenUsageChart — 토큰 사용량 LineChart
 * 4. AutomationPerformance — 자동화 성과 BarChart
 * 5. TemplateDistribution — 템플릿 분포 PieChart
 * 6. ToolUsageChart — 도구 사용량 stacked BarChart
 *
 * FAILURES expected (Red phase): stub components don't render charts
 */

import { render, screen } from '@testing-library/react'
import { KPICard } from '@/components/dashboard/KPICard'
import { ExecutionTrendChart } from '@/components/dashboard/ExecutionTrendChart'
import { TokenUsageChart } from '@/components/dashboard/TokenUsageChart'
import { AutomationPerformance } from '@/components/dashboard/AutomationPerformance'
import { TemplateDistribution } from '@/components/dashboard/TemplateDistribution'
import { ToolUsageChart } from '@/components/dashboard/ToolUsageChart'
import { Activity } from 'lucide-react'

// ─── Mock recharts (SVG doesn't work in jsdom) ──────────────────────────────

vi.mock('recharts', () => {
  const React = require('react')
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    AreaChart: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'area-chart', ...props }, children),
    Area: (props: any) =>
      React.createElement('div', { 'data-testid': `area-${props.dataKey}` }),
    LineChart: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'line-chart', ...props }, children),
    Line: (props: any) =>
      React.createElement('div', { 'data-testid': `line-${props.dataKey}` }),
    BarChart: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'bar-chart', ...props }, children),
    Bar: (props: any) =>
      React.createElement('div', { 'data-testid': `bar-${props.dataKey}` }),
    PieChart: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'pie-chart' }, children),
    Pie: ({ children, ...props }: any) =>
      React.createElement('div', { 'data-testid': 'pie' }, children),
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
    Label: () => null,
    LabelList: () => null,
  }
})

// ─── Fixture Data ────────────────────────────────────────────────────────────

const executionTrendData = [
  { date: '2026-03-01', success: 5, error: 1, total: 6 },
  { date: '2026-03-02', success: 8, error: 0, total: 8 },
  { date: '2026-03-03', success: 3, error: 2, total: 5 },
]

const tokenTrendData = [
  { date: '2026-03-01', haikuTokens: 5000, sonnetTokens: 2000, estimatedCost: 0.05 },
  { date: '2026-03-02', haikuTokens: 8000, sonnetTokens: 3000, estimatedCost: 0.08 },
]

const automationPerfData = [
  { automationId: 'a1', name: 'Morning Briefing', successRate: 95, totalExecutions: 20 },
  { automationId: 'a2', name: 'Email Triage', successRate: 60, totalExecutions: 10 },
]

const templateDistData = [
  { templateType: 'morning_briefing', count: 20, percentage: 50 },
  { templateType: 'email_triage', count: 10, percentage: 25 },
  { templateType: 'reading_digest', count: 10, percentage: 25 },
]

const toolUsageData = [
  { toolName: 'gmail_read', totalCalls: 30, successCalls: 28, errorCalls: 2 },
  { toolName: 'calendar_list_events', totalCalls: 20, successCalls: 20, errorCalls: 0 },
]

// ─── KPICard Tests ───────────────────────────────────────────────────────────

describe('KPICard', () => {
  it('renders value and label', () => {
    render(<KPICard value={42} label="Total Runs" icon={Activity} />)

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Total Runs')).toBeInTheDocument()
  })

  it('shows trend indicator when trend prop provided', () => {
    render(
      <KPICard
        value={85}
        label="Success Rate"
        icon={Activity}
        trend="up"
        trendValue="+12%"
      />
    )

    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByText('(상승)')).toBeInTheDocument()
  })

  it('uses correct icon color', () => {
    const { container } = render(
      <KPICard value={10} label="Errors" icon={Activity} iconColor="text-red-600" />
    )

    const iconEl = container.querySelector('.text-red-600')
    expect(iconEl).toBeInTheDocument()
  })
})

// ─── ExecutionTrendChart Tests ───────────────────────────────────────────────

describe('ExecutionTrendChart', () => {
  it('renders chart container with correct testid', () => {
    render(<ExecutionTrendChart data={executionTrendData} />)

    expect(screen.getByTestId('execution-trend-chart')).toBeInTheDocument()
  })

  it('shows "Execution Trend" title', () => {
    render(<ExecutionTrendChart data={executionTrendData} />)

    expect(screen.getByText(/Execution Trend/i)).toBeInTheDocument()
  })

  it('renders AreaChart with data', () => {
    render(<ExecutionTrendChart data={executionTrendData} />)

    expect(screen.getByTestId('area-chart')).toBeInTheDocument()
    expect(screen.getByTestId('area-success')).toBeInTheDocument()
    expect(screen.getByTestId('area-error')).toBeInTheDocument()
  })

  it('shows empty state when data is empty array', () => {
    render(<ExecutionTrendChart data={[]} />)

    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})

// ─── TokenUsageChart Tests ───────────────────────────────────────────────────

describe('TokenUsageChart', () => {
  it('renders chart container', () => {
    render(<TokenUsageChart data={tokenTrendData} />)

    expect(screen.getByTestId('token-usage-chart')).toBeInTheDocument()
  })

  it('shows "Token Usage" title', () => {
    render(<TokenUsageChart data={tokenTrendData} />)

    expect(screen.getByText(/Token Usage/i)).toBeInTheDocument()
  })

  it('renders LineChart with data', () => {
    render(<TokenUsageChart data={tokenTrendData} />)

    expect(screen.getByTestId('line-chart')).toBeInTheDocument()
    expect(screen.getByTestId('line-haikuTokens')).toBeInTheDocument()
    expect(screen.getByTestId('line-sonnetTokens')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<TokenUsageChart data={[]} />)

    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})

// ─── AutomationPerformance Tests ─────────────────────────────────────────────

describe('AutomationPerformance', () => {
  it('renders chart with correct testid', () => {
    render(<AutomationPerformance data={automationPerfData} />)

    expect(screen.getByTestId('automation-performance-chart')).toBeInTheDocument()
  })

  it('shows "Automation Performance" title', () => {
    render(<AutomationPerformance data={automationPerfData} />)

    expect(screen.getByText(/Automation Performance/i)).toBeInTheDocument()
  })

  it('renders BarChart with data', () => {
    render(<AutomationPerformance data={automationPerfData} />)

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar-successRate')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<AutomationPerformance data={[]} />)

    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})

// ─── TemplateDistribution Tests ──────────────────────────────────────────────

describe('TemplateDistribution', () => {
  it('renders PieChart with correct testid', () => {
    render(<TemplateDistribution data={templateDistData} totalExecutions={40} />)

    expect(screen.getByTestId('template-distribution-chart')).toBeInTheDocument()
  })

  it('shows "Template Distribution" title', () => {
    render(<TemplateDistribution data={templateDistData} totalExecutions={40} />)

    expect(screen.getByText(/Template Distribution/i)).toBeInTheDocument()
  })

  it('shows total executions count', () => {
    // total = 20 + 10 + 10 = 40
    render(<TemplateDistribution data={templateDistData} totalExecutions={40} />)

    expect(screen.getByText('40')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<TemplateDistribution data={[]} totalExecutions={0} />)

    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})

// ─── ToolUsageChart Tests ────────────────────────────────────────────────────

describe('ToolUsageChart', () => {
  it('renders chart with correct testid', () => {
    render(<ToolUsageChart data={toolUsageData} />)

    expect(screen.getByTestId('tool-usage-chart')).toBeInTheDocument()
  })

  it('shows "Tool Usage" title', () => {
    render(<ToolUsageChart data={toolUsageData} />)

    expect(screen.getByText(/Tool Usage/i)).toBeInTheDocument()
  })

  it('renders stacked BarChart', () => {
    render(<ToolUsageChart data={toolUsageData} />)

    expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    expect(screen.getByTestId('bar-successCalls')).toBeInTheDocument()
    expect(screen.getByTestId('bar-errorCalls')).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<ToolUsageChart data={[]} />)

    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})
