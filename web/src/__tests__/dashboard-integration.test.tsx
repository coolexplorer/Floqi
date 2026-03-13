/**
 * Dashboard Integration Tests — TDD Red Phase
 *
 * Tests for Phase 3 dashboard integration:
 * 1. RecentExecutions — 최근 실행 테이블 (필터링 포함)
 * 2. UpcomingRuns — 예정된 실행 목록
 * 3. AIInsightCard — AI 인사이트 카드
 * 4. Dashboard Page — 통합 페이지 (모든 섹션 렌더링)
 *
 * FAILURES expected (Red phase): stub components don't render full UI
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RecentExecutions } from '@/components/dashboard/RecentExecutions'
import { UpcomingRuns } from '@/components/dashboard/UpcomingRuns'
import { AIInsightCard } from '@/components/dashboard/AIInsightCard'

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

    // Status badges
    const successBadges = screen.getAllByText(/success/i)
    expect(successBadges.length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText(/error/i)).toBeInTheDocument()

    // Duration (12s, 5s, 8s)
    expect(screen.getByText(/12\.0s/)).toBeInTheDocument()
    expect(screen.getByText(/5\.0s/)).toBeInTheDocument()

    // Tokens
    expect(screen.getByText(/1,500/)).toBeInTheDocument()
    expect(screen.getByText(/800/)).toBeInTheDocument()
  })

  it('shows empty state when no data', () => {
    render(<RecentExecutions data={[]} />)

    expect(screen.getByText(/no recent executions/i)).toBeInTheDocument()
  })

  it('has status filter tabs (All, Success, Error)', () => {
    render(<RecentExecutions data={mockExecutions} />)

    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /success/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /error/i })).toBeInTheDocument()
  })

  it('clicking "Error" filter shows only error entries', async () => {
    const user = userEvent.setup()
    render(<RecentExecutions data={mockExecutions} />)

    const errorTab = screen.getByRole('tab', { name: /error/i })
    await user.click(errorTab)

    expect(screen.getByText('Email Triage')).toBeInTheDocument()
    expect(screen.queryByText('Morning Briefing')).not.toBeInTheDocument()
    expect(screen.queryByText('Reading Digest')).not.toBeInTheDocument()
  })
})

// ─── UpcomingRuns Tests ──────────────────────────────────────────────────────

describe('UpcomingRuns', () => {
  it('renders with correct testid', () => {
    render(<UpcomingRuns upcoming={mockUpcoming} />)

    expect(screen.getByTestId('upcoming-runs')).toBeInTheDocument()
  })

  it('shows "Upcoming Runs" title', () => {
    render(<UpcomingRuns upcoming={mockUpcoming} />)

    expect(screen.getByText(/Upcoming Runs/i)).toBeInTheDocument()
  })

  it('renders automation names', () => {
    render(<UpcomingRuns upcoming={mockUpcoming} />)

    expect(screen.getByText('Morning Briefing')).toBeInTheDocument()
    expect(screen.getByText('Email Triage')).toBeInTheDocument()
  })

  it('shows template type for each run', () => {
    render(<UpcomingRuns upcoming={mockUpcoming} />)

    expect(screen.getByText(/morning_briefing/i)).toBeInTheDocument()
    expect(screen.getByText(/email_triage/i)).toBeInTheDocument()
  })

  it('shows empty state when no upcoming runs', () => {
    render(<UpcomingRuns upcoming={[]} />)

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
    expect(screen.getByText(/92%/)).toBeInTheDocument()
  })

  it('generates insight about cost', () => {
    render(<AIInsightCard stats={mockStats} />)

    // Should mention estimated cost ($1.56)
    expect(screen.getByText(/\$1\.56/)).toBeInTheDocument()
  })

  it('shows empty/minimal state when stats are all zeros', () => {
    const zeroStats = {
      totalExecutions: 0,
      successRate: 0,
      totalTokens: 0,
      estimatedCost: 0,
      topAutomation: '',
      mostFailedAutomation: '',
    }
    render(<AIInsightCard stats={zeroStats} />)

    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})

// ─── Dashboard Page Integration Tests ────────────────────────────────────────

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

const mockGetUser = vi.fn()
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({ data: [], error: null }),
}))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

describe('DashboardPage (Integration)', () => {
  const mockFetchResponses: Record<string, unknown> = {
    '/api/dashboard/stats': {
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
    '/api/dashboard/charts': {
      executionTrend: [
        { date: '2026-03-12', success: 5, error: 1, total: 6 },
        { date: '2026-03-13', success: 8, error: 0, total: 8 },
      ],
      tokenTrend: [
        { date: '2026-03-12', haikuTokens: 5000, sonnetTokens: 2000, estimatedCost: 0.05 },
        { date: '2026-03-13', haikuTokens: 8000, sonnetTokens: 3000, estimatedCost: 0.08 },
      ],
    },
    '/api/dashboard/automations-performance': {
      automations: [
        { automationId: 'a1', name: 'Morning Briefing', successRate: 95, totalExecutions: 20 },
        { automationId: 'a2', name: 'Email Triage', successRate: 60, totalExecutions: 10 },
      ],
    },
    '/api/dashboard/tool-usage': {
      tools: [
        { toolName: 'gmail_read', totalCalls: 30, successCalls: 28, errorCalls: 2 },
        { toolName: 'calendar_list_events', totalCalls: 20, successCalls: 20, errorCalls: 0 },
      ],
      templateDistribution: [
        { templateType: 'morning_briefing', count: 20, percentage: 50 },
        { templateType: 'email_triage', count: 10, percentage: 25 },
      ],
    },
    '/api/dashboard/upcoming': {
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

  beforeEach(() => {
    mockPush.mockClear()
    mockGetUser.mockClear()

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        const path = new URL(url, 'http://localhost').pathname
        const data = mockFetchResponses[path] ?? {}
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(data),
        })
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Lazy import to avoid module resolution before mocks
  async function importDashboardPage() {
    const mod = await import('@/app/(dashboard)/dashboard/page')
    return mod.default
  }

  it('redirects to /login when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const DashboardPage = await importDashboardPage()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('renders all 6 KPI cards', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const DashboardPage = await importDashboardPage()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('kpi-active-automations')).toBeInTheDocument()
      expect(screen.getByTestId('kpi-total-executions')).toBeInTheDocument()
      expect(screen.getByTestId('kpi-success-rate')).toBeInTheDocument()
      expect(screen.getByTestId('kpi-total-tokens')).toBeInTheDocument()
      expect(screen.getByTestId('kpi-estimated-cost')).toBeInTheDocument()
      expect(screen.getByTestId('kpi-avg-duration')).toBeInTheDocument()
    })
  })

  it('renders chart sections', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const DashboardPage = await importDashboardPage()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('execution-trend-chart')).toBeInTheDocument()
      expect(screen.getByTestId('token-usage-chart')).toBeInTheDocument()
      expect(screen.getByTestId('automation-performance-chart')).toBeInTheDocument()
      expect(screen.getByTestId('template-distribution-chart')).toBeInTheDocument()
      expect(screen.getByTestId('tool-usage-chart')).toBeInTheDocument()
    })
  })

  it('renders recent executions section', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const DashboardPage = await importDashboardPage()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('recent-executions')).toBeInTheDocument()
    })
  })

  it('renders upcoming runs section', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const DashboardPage = await importDashboardPage()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('upcoming-runs')).toBeInTheDocument()
    })
  })

  it('renders AI insight section', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const DashboardPage = await importDashboardPage()
    render(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByTestId('ai-insight-card')).toBeInTheDocument()
    })
  })

  it('shows loading state initially', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const DashboardPage = await importDashboardPage()
    render(<DashboardPage />)

    // Loading state should be visible before data resolves
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument()
  })
})
