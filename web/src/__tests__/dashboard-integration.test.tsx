/**
 * Dashboard Integration Tests
 *
 * Tests for Phase 3 dashboard integration:
 * 1. RecentExecutions — 최근 실행 테이블 (필터링 포함)
 * 2. UpcomingRuns — 예정된 실행 목록
 * 3. AIInsightCard — AI 인사이트 카드
 * 4. Dashboard Page — 통합 페이지 (Server Component pattern)
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecentExecutions } from '@/components/dashboard/RecentExecutions'
import { UpcomingRuns } from '@/components/dashboard/UpcomingRuns'
import { AIInsightCard } from '@/components/dashboard/AIInsightCard'
import DashboardPage from '@/app/(dashboard)/dashboard/page'

// ─── Mock recharts (SVG doesn't work in jsdom) ──────────────────────────────

vi.mock('recharts', () => {
  const React = require('react')
  return {
    ResponsiveContainer: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    AreaChart: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'area-chart' }, children),
    Area: (props: any) =>
      React.createElement('div', { 'data-testid': `area-${props.dataKey}` }),
    LineChart: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'line-chart' }, children),
    Line: (props: any) =>
      React.createElement('div', { 'data-testid': `line-${props.dataKey}` }),
    BarChart: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'bar-chart' }, children),
    Bar: (props: any) =>
      React.createElement('div', { 'data-testid': `bar-${props.dataKey}` }),
    PieChart: ({ children }: any) =>
      React.createElement('div', { 'data-testid': 'pie-chart' }, children),
    Pie: ({ children }: any) =>
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

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => null),
    })
  ),
}))

// ─── Fixture Data ────────────────────────────────────────────────────────────

const mockExecutions = [
  {
    id: 'log-1',
    automationName: 'Morning Briefing',
    status: 'success' as const,
    durationMs: 12000,
    tokensUsed: 1500,
    toolCallCount: 4,
    createdAt: '2026-03-13T08:00:00Z',
  },
  {
    id: 'log-2',
    automationName: 'Email Triage',
    status: 'error' as const,
    durationMs: 5000,
    tokensUsed: 800,
    toolCallCount: 1,
    createdAt: '2026-03-13T09:00:00Z',
  },
  {
    id: 'log-3',
    automationName: 'Reading Digest',
    status: 'success' as const,
    durationMs: 8000,
    tokensUsed: 1200,
    toolCallCount: 3,
    createdAt: '2026-03-12T18:00:00Z',
  },
]

const mockUpcoming = [
  {
    automationId: 'a1',
    automationName: 'Morning Briefing',
    templateType: 'morning_briefing',
    nextRunAt: '2026-03-14T08:00:00Z',
    scheduleCron: '0 8 * * *',
  },
  {
    automationId: 'a2',
    automationName: 'Email Triage',
    templateType: 'email_triage',
    nextRunAt: '2026-03-14T09:00:00Z',
    scheduleCron: '0 9 * * *',
  },
]

const mockStats = {
  totalExecutions: 45,
  successRate: 92,
  totalTokens: 52000,
  estimatedCost: 1.56,
  topAutomation: 'Morning Briefing',
  mostFailedAutomation: 'Email Triage',
}

// ─── RecentExecutions Tests ──────────────────────────────────────────────────

describe('RecentExecutions', () => {
  it('renders table with correct testid', () => {
    render(<RecentExecutions data={mockExecutions} />)

    expect(screen.getByTestId('recent-executions')).toBeInTheDocument()
  })

  it('shows "Recent Executions" title', () => {
    render(<RecentExecutions data={mockExecutions} />)

    expect(screen.getByText(/Recent Executions/i)).toBeInTheDocument()
  })

  it('renders execution rows with automation name, status badge, duration, tokens', () => {
    render(<RecentExecutions data={mockExecutions} />)

    expect(screen.getByText('Morning Briefing')).toBeInTheDocument()
    expect(screen.getByText('Email Triage')).toBeInTheDocument()
    expect(screen.getByText('Reading Digest')).toBeInTheDocument()

    // Status badges (filter buttons + actual badges)
    const successBadges = screen.getAllByText(/success/i)
    expect(successBadges.length).toBeGreaterThanOrEqual(2)
    const errorElements = screen.getAllByText(/error/i)
    expect(errorElements.length).toBeGreaterThanOrEqual(2) // filter button + badge

    // Duration (12s, 5s, 8s)
    expect(screen.getByText(/12\.0s/)).toBeInTheDocument()
    expect(screen.getByText(/5\.0s/)).toBeInTheDocument()

    // Tokens
    expect(screen.getByText(/1,500/)).toBeInTheDocument()
    expect(screen.getByText(/800/)).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<RecentExecutions data={[]} />)

    expect(screen.getByText(/no executions found/i)).toBeInTheDocument()
  })

  it('has status filter tabs (All, Success, Error)', () => {
    render(<RecentExecutions data={mockExecutions} />)

    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /success/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /error/i })).toBeInTheDocument()
  })

  it('clicking "Error" filter shows only error entries', async () => {
    const user = userEvent.setup()
    render(<RecentExecutions data={mockExecutions} />)

    const errorBtn = screen.getByRole('button', { name: /^error$/i })
    await user.click(errorBtn)

    expect(screen.getByText('Email Triage')).toBeInTheDocument()
    expect(screen.queryByText('Morning Briefing')).not.toBeInTheDocument()
    expect(screen.queryByText('Reading Digest')).not.toBeInTheDocument()
  })
})

// ─── UpcomingRuns Tests ──────────────────────────────────────────────────────

describe('UpcomingRuns', () => {
  it('renders with correct testid', () => {
    render(<UpcomingRuns data={mockUpcoming} />)

    expect(screen.getByTestId('upcoming-runs')).toBeInTheDocument()
  })

  it('shows "Upcoming Runs" title', () => {
    render(<UpcomingRuns data={mockUpcoming} />)

    expect(screen.getByText(/Upcoming Runs/i)).toBeInTheDocument()
  })

  it('renders automation names', () => {
    render(<UpcomingRuns data={mockUpcoming} />)

    expect(screen.getByText('Morning Briefing')).toBeInTheDocument()
    expect(screen.getByText('Email Triage')).toBeInTheDocument()
  })

  it('shows template type for each run', () => {
    render(<UpcomingRuns data={mockUpcoming} />)

    // Template type badges contain emoji + formatted name
    expect(screen.getByText(/☀️/)).toBeInTheDocument()
    expect(screen.getByText(/📧/)).toBeInTheDocument()
  })

  it('shows empty state when no upcoming runs', () => {
    render(<UpcomingRuns data={[]} />)

    expect(screen.getByText(/no upcoming runs/i)).toBeInTheDocument()
  })
})

// ─── AIInsightCard Tests ─────────────────────────────────────────────────────

describe('AIInsightCard', () => {
  it('renders with correct testid', () => {
    render(<AIInsightCard stats={mockStats} />)

    expect(screen.getByTestId('ai-insight-card')).toBeInTheDocument()
  })

  it('shows "AI Insights" title', () => {
    render(<AIInsightCard stats={mockStats} />)

    expect(screen.getByText(/AI Insights/i)).toBeInTheDocument()
  })

  it('generates insight about success rate', () => {
    render(<AIInsightCard stats={mockStats} />)

    // Should mention success rate (92%) in some form
    expect(screen.getByText(/92\.0%/)).toBeInTheDocument()
  })

  it('generates insight about cost', () => {
    render(<AIInsightCard stats={mockStats} />)

    // Should mention estimated cost ($1.56)
    expect(screen.getByText(/\$1\.56/)).toBeInTheDocument()
  })

  it('shows insight even when stats are zeros', () => {
    const zeroStats = {
      totalExecutions: 0,
      successRate: 0,
      totalTokens: 0,
      estimatedCost: 0,
      topAutomation: '',
      mostFailedAutomation: '',
    }
    render(<AIInsightCard stats={zeroStats} />)

    // Should still show at least the success rate insight
    expect(screen.getByText(/needs attention/i)).toBeInTheDocument()
  })
})

// ─── Dashboard Page Integration Tests ────────────────────────────────────────

const BASE_URL = 'http://localhost:3000'

const mockFetchResponses: Record<string, unknown> = {
  [`${BASE_URL}/api/dashboard/stats`]: {
    activeAutomations: 3,
    totalExecutions: 45,
    successRate: 92,
    totalTokens: 52000,
    estimatedCost: 1.56,
    avgDurationMs: 11000,
    trends: {
      executionsDelta: 7,
      successRateDelta: 2.1,
      tokensDelta: 8000,
      costDelta: 0.24,
    },
  },
  [`${BASE_URL}/api/dashboard/charts?days=30`]: {
    executionTrend: [
      { date: '2026-03-12', success: 5, error: 1, total: 6 },
      { date: '2026-03-13', success: 8, error: 0, total: 8 },
    ],
    tokenTrend: [
      { date: '2026-03-12', haikuTokens: 5000, sonnetTokens: 2000, estimatedCost: 0.05 },
      { date: '2026-03-13', haikuTokens: 8000, sonnetTokens: 3000, estimatedCost: 0.08 },
    ],
  },
  [`${BASE_URL}/api/dashboard/automations-performance`]: {
    automations: [
      {
        id: 'a1',
        name: 'Morning Briefing',
        templateType: 'morning_briefing',
        successRate: 95,
        totalExecutions: 20,
        avgDurationMs: 5000,
        avgTokens: 1000,
        lastRunAt: '2026-03-13T08:00:00Z',
        nextRunAt: '2026-03-14T08:00:00Z',
      },
      {
        id: 'a2',
        name: 'Email Triage',
        templateType: 'email_triage',
        successRate: 60,
        totalExecutions: 10,
        avgDurationMs: 4000,
        avgTokens: 800,
        lastRunAt: '2026-03-13T09:00:00Z',
        nextRunAt: '2026-03-14T09:00:00Z',
      },
    ],
  },
  [`${BASE_URL}/api/dashboard/tool-usage?days=30`]: {
    tools: [
      { toolName: 'gmail_read', totalCalls: 30, successCalls: 28, errorCalls: 2 },
      { toolName: 'calendar_list_events', totalCalls: 20, successCalls: 20, errorCalls: 0 },
    ],
    templateDistribution: [
      { templateType: 'morning_briefing', count: 20, percentage: 50 },
      { templateType: 'email_triage', count: 10, percentage: 25 },
    ],
  },
  [`${BASE_URL}/api/dashboard/upcoming`]: {
    upcoming: [
      {
        automationId: 'a1',
        automationName: 'Morning Briefing',
        templateType: 'morning_briefing',
        nextRunAt: '2026-03-14T08:00:00Z',
        scheduleCron: '0 8 * * *',
      },
    ],
  },
}

describe('DashboardPage (Integration)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const body = mockFetchResponses[url] ?? {}
        return Promise.resolve({
          ok: !!mockFetchResponses[url],
          json: () => Promise.resolve(body),
        })
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders all 6 KPI cards', async () => {
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByTestId('stat-active-automations')).toBeInTheDocument()
    expect(screen.getByTestId('stat-execution-count')).toBeInTheDocument()
    expect(screen.getByTestId('stat-success-rate')).toBeInTheDocument()
    expect(screen.getByTestId('stat-tokens-used')).toBeInTheDocument()
    expect(screen.getByTestId('stat-estimated-cost')).toBeInTheDocument()
    expect(screen.getByTestId('stat-avg-duration')).toBeInTheDocument()
  })

  it('renders chart sections', async () => {
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByTestId('execution-trend-chart')).toBeInTheDocument()
    expect(screen.getByTestId('token-usage-chart')).toBeInTheDocument()
    expect(screen.getByTestId('automation-performance-chart')).toBeInTheDocument()
    expect(screen.getByTestId('template-distribution-chart')).toBeInTheDocument()
    expect(screen.getByTestId('tool-usage-chart')).toBeInTheDocument()
  })

  it('renders recent executions section', async () => {
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByTestId('recent-executions')).toBeInTheDocument()
  })

  it('renders upcoming runs section', async () => {
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByTestId('upcoming-runs')).toBeInTheDocument()
  })

  it('renders AI insight section', async () => {
    const jsx = await DashboardPage()
    render(jsx)

    expect(screen.getByTestId('ai-insight-card')).toBeInTheDocument()
  })

  it('shows zero-state KPI values when API returns null', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false, json: () => Promise.resolve({}) })))

    const jsx = await DashboardPage()
    render(jsx)

    // KPI cards render with fallback zero values
    expect(screen.getByTestId('stat-active-automations')).toBeInTheDocument()
    expect(screen.getByTestId('stat-estimated-cost')).toBeInTheDocument()
  })
})

// ─── Dashboard Page — Partial API Failure Tests ───────────────────────────────

describe('DashboardPage — Partial API Failure', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should render KPI cards as zero when only stats API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/dashboard/stats')) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
        }
        const body = mockFetchResponses[url] ?? {}
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
      })
    )

    const jsx = await DashboardPage()
    render(jsx)

    // KPI cards present with zero/fallback values
    expect(screen.getByTestId('stat-active-automations')).toBeInTheDocument()
    expect(screen.getByTestId('stat-estimated-cost')).toBeInTheDocument()
    // AI insights section hidden when stats is null
    expect(screen.queryByTestId('ai-insight-card')).not.toBeInTheDocument()
    // Charts still render (charts API succeeded)
    expect(screen.getByTestId('execution-trend-chart')).toBeInTheDocument()
  })

  it('should render empty charts when only charts API fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/dashboard/charts')) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
        }
        const body = mockFetchResponses[url] ?? {}
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
      })
    )

    const jsx = await DashboardPage()
    render(jsx)

    // Stats KPI cards render with data
    expect(screen.getByTestId('stat-active-automations')).toBeInTheDocument()
    expect(screen.getByTestId('stat-estimated-cost')).toBeInTheDocument()
    // Chart components still render (with empty data fallback)
    expect(screen.getByTestId('execution-trend-chart')).toBeInTheDocument()
    expect(screen.getByTestId('token-usage-chart')).toBeInTheDocument()
  })

  it('should render when perf API fails but stats succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/dashboard/automations-performance')) {
          return Promise.resolve({ ok: false, json: () => Promise.resolve({}) })
        }
        const body = mockFetchResponses[url] ?? {}
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) })
      })
    )

    const jsx = await DashboardPage()
    render(jsx)

    // Page renders without crashing
    expect(screen.getByTestId('stat-active-automations')).toBeInTheDocument()
    // AutomationPerformance renders with empty data
    expect(screen.getByTestId('automation-performance-chart')).toBeInTheDocument()
    // RecentExecutions renders with empty state (built from perf data)
    expect(screen.getByTestId('recent-executions')).toBeInTheDocument()
  })
})
