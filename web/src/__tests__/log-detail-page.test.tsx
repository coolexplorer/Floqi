/**
 * Log Detail Page Tests — RSC pattern
 * Tests:
 * - LogDetailPage renders log data fetched server-side
 * - LogDetailPage calls notFound() on non-ok response
 * - BackButton renders and triggers router.push
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LogDetailPage from '@/app/(dashboard)/logs/[id]/page'
import { BackButton } from '@/components/ui/BackButton'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNotFound = vi.fn()
vi.mock('next/navigation', () => ({
  notFound: () => {
    mockNotFound()
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => null),
    })
  ),
}))

const mockPush = vi.fn()

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(log: typeof logFixture | typeof errorLogFixture) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ log }),
  } as Response)
}

function mockFetch404() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => ({ error: 'Not found' }),
  } as Response)
}

// ─── LogDetailPage RSC tests ───────────────────────────────────────────────────

describe('LogDetailPage (Server Component)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders automation name and status badge', async () => {
    mockFetch(logFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-abc' }) }))

    expect(screen.getByText('Morning Briefing')).toBeInTheDocument()
    expect(screen.getByText('success')).toBeInTheDocument()
  })

  it('renders duration and tokens', async () => {
    mockFetch(logFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-abc' }) }))

    expect(screen.getByText('3.2s')).toBeInTheDocument()
    expect(screen.getByText('1,500')).toBeInTheDocument()
  })

  it('renders tool calls timeline', async () => {
    mockFetch(logFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-abc' }) }))

    expect(screen.getByText('Tool Calls')).toBeInTheDocument()
    expect(screen.getByText('calendar_list_events_today')).toBeInTheDocument()
  })

  it('renders error message for error status', async () => {
    mockFetch(errorLogFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-err' }) }))

    expect(screen.getByText('Token expired')).toBeInTheDocument()
  })

  it('renders "No tool calls recorded" when tool_calls is empty', async () => {
    mockFetch(errorLogFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-err' }) }))

    expect(screen.getByText(/no tool calls recorded/i)).toBeInTheDocument()
  })

  it('calls notFound() when fetch returns non-ok', async () => {
    mockFetch404()

    await expect(
      LogDetailPage({ params: Promise.resolve({ id: 'missing' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mockNotFound).toHaveBeenCalledOnce()
  })

  it('renders BackButton linking to /logs', async () => {
    mockFetch(logFixture)
    render(await LogDetailPage({ params: Promise.resolve({ id: 'log-abc' }) }))

    expect(screen.getByRole('button', { name: /back to logs/i })).toBeInTheDocument()
  })
})

// ─── BackButton tests ─────────────────────────────────────────────────────────

describe('BackButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with label', () => {
    render(<BackButton href="/logs" label="Back to Logs" />)
    expect(screen.getByRole('button', { name: /back to logs/i })).toBeInTheDocument()
  })

  it('calls router.push with href on click', async () => {
    render(<BackButton href="/logs" label="Back to Logs" />)
    await userEvent.click(screen.getByRole('button', { name: /back to logs/i }))
    expect(mockPush).toHaveBeenCalledWith('/logs')
  })
})
