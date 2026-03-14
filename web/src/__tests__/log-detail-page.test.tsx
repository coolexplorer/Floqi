/**
 * Log Detail Page Tests — RSC pattern
 * Tests:
 * - LogDetailPage renders log data via direct data layer call
 * - LogDetailPage calls notFound() when log not found
 * - BackButton renders as Link
 */

import { render, screen } from '@testing-library/react'
import LogDetailPage from '@/app/(dashboard)/logs/[id]/page'
import { BackButton } from '@/components/ui/BackButton'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNotFound = vi.fn()
vi.mock('next/navigation', () => ({
  notFound: () => {
    mockNotFound()
    throw new Error('NEXT_NOT_FOUND')
  },
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

const mockGetLogById = vi.fn()
vi.mock('@/lib/data/logs', () => ({
  getLogById: (...args: unknown[]) => mockGetLogById(...args),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const logFixture = {
  id: 'log-abc',
  automation_id: 'auto-1',
  automation_name: 'Morning Briefing',
  status: 'success',
  created_at: '2026-03-04T08:00:00Z',
  duration_ms: 3200,
  error_message: undefined,
  tokens_used: 1500,
  tool_calls: [
    {
      id: 'tc-1',
      toolName: 'calendar_list_events_today',
      input: { date: '2026-03-04' },
      output: { events: [] },
      duration: 800,
      status: 'success',
    },
  ],
}

const errorLogFixture = {
  ...logFixture,
  id: 'log-err',
  status: 'error',
  error_message: 'Token expired',
  tokens_used: 0,
  tool_calls: [],
}

// ─── LogDetailPage RSC tests ───────────────────────────────────────────────────

describe('LogDetailPage (Server Component)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders automation name and status badge', async () => {
    mockGetLogById.mockResolvedValue(logFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-abc' }) }))

    expect(screen.getByText('Morning Briefing')).toBeInTheDocument()
    expect(screen.getByText('success')).toBeInTheDocument()
  })

  it('renders duration and tokens', async () => {
    mockGetLogById.mockResolvedValue(logFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-abc' }) }))

    expect(screen.getByText('3.2s')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
  })

  it('renders tool calls timeline', async () => {
    mockGetLogById.mockResolvedValue(logFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-abc' }) }))

    expect(screen.getByText('Tool Calls')).toBeInTheDocument()
    expect(screen.getByText('calendar_list_events_today')).toBeInTheDocument()
  })

  it('renders error message for error status', async () => {
    mockGetLogById.mockResolvedValue(errorLogFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-err' }) }))

    expect(screen.getByText('Token expired')).toBeInTheDocument()
  })

  it('renders "No tool calls recorded" when tool_calls is empty', async () => {
    mockGetLogById.mockResolvedValue(errorLogFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-err' }) }))

    expect(screen.getByText(/no tool calls recorded/i)).toBeInTheDocument()
  })

  it('calls notFound() when getLogById returns null', async () => {
    mockGetLogById.mockResolvedValue(null)

    await expect(
      LogDetailPage({ params: Promise.resolve({ id: 'missing' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockNotFound).toHaveBeenCalledOnce()
  })

  it('passes correct id to getLogById', async () => {
    mockGetLogById.mockResolvedValue(logFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-abc' }) }))

    expect(mockGetLogById).toHaveBeenCalledWith('log-abc')
  })

  it('renders BackButton linking to /logs', async () => {
    mockGetLogById.mockResolvedValue(logFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-abc' }) }))

    const backLink = screen.getByRole('link', { name: /back to logs/i })
    expect(backLink).toBeInTheDocument()
    expect(backLink).toHaveAttribute('href', '/logs')
  })
})

// ─── BackButton tests ─────────────────────────────────────────────────────────

describe('BackButton', () => {
  it('renders as a link with correct href and label', () => {
    render(<BackButton href="/logs" label="Back to Logs" />)
    const link = screen.getByRole('link', { name: /back to logs/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/logs')
  })

  it('renders with custom href and label', () => {
    render(<BackButton href="/dashboard" label="Back to Dashboard" />)
    const link = screen.getByRole('link', { name: /back to dashboard/i })
    expect(link).toHaveAttribute('href', '/dashboard')
  })
})
