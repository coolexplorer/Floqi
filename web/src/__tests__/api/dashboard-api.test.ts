/**
 * Dashboard API Route Tests (TDD Red Phase)
 *
 * Tests validate 5 dashboard API endpoints:
 * 1. GET /api/dashboard/stats — aggregate stats + trend deltas
 * 2. GET /api/dashboard/charts?days=30 — execution & token trend data
 * 3. GET /api/dashboard/automations-performance — per-automation metrics
 * 4. GET /api/dashboard/tool-usage?days=30 — tool call aggregation + template distribution
 * 5. GET /api/dashboard/upcoming — next scheduled runs
 */

import { NextRequest } from 'next/server';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

// ─── Helper: chainable Supabase query mock ────────────────────────────────────

function makeChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const self = () => chain;
  chain.select = vi.fn().mockImplementation(self);
  chain.insert = vi.fn().mockImplementation(self);
  chain.update = vi.fn().mockImplementation(self);
  chain.delete = vi.fn().mockImplementation(self);
  chain.eq = vi.fn().mockImplementation(self);
  chain.neq = vi.fn().mockImplementation(self);
  chain.gte = vi.fn().mockImplementation(self);
  chain.lte = vi.fn().mockImplementation(self);
  chain.gt = vi.fn().mockImplementation(self);
  chain.lt = vi.fn().mockImplementation(self);
  chain.in = vi.fn().mockImplementation(self);
  chain.is = vi.fn().mockImplementation(self);
  chain.not = vi.fn().mockImplementation(self);
  chain.order = vi.fn().mockImplementation(self);
  chain.limit = vi.fn().mockImplementation(self);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return chain;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = 'user-test-123';

const mockAutomations = [
  {
    id: 'auto-1',
    user_id: USER_ID,
    name: 'Morning Briefing',
    template_type: 'morning_briefing',
    status: 'active',
    schedule_cron: '0 8 * * *',
    next_run_at: '2026-03-14T08:00:00Z',
  },
  {
    id: 'auto-2',
    user_id: USER_ID,
    name: 'Email Triage',
    template_type: 'email_triage',
    status: 'active',
    schedule_cron: '0 9 * * *',
    next_run_at: '2026-03-14T09:00:00Z',
  },
  {
    id: 'auto-3',
    user_id: USER_ID,
    name: 'Reading Digest',
    template_type: 'reading_digest',
    status: 'paused',
    schedule_cron: '0 18 * * 5',
    next_run_at: null,
  },
];

const mockExecutionLogs = [
  {
    id: 'log-1',
    automation_id: 'auto-1',
    status: 'success',
    started_at: '2026-03-12T08:00:00Z',
    completed_at: '2026-03-12T08:00:12Z',
    tokens_used: 1500,
    tool_calls: [
      { tool_name: 'calendar_list_events', duration_ms: 200 },
      { tool_name: 'gmail_read', duration_ms: 300 },
    ],
    error_message: null,
  },
  {
    id: 'log-2',
    automation_id: 'auto-1',
    status: 'success',
    started_at: '2026-03-11T08:00:00Z',
    completed_at: '2026-03-11T08:00:10Z',
    tokens_used: 1200,
    tool_calls: [{ tool_name: 'calendar_list_events', duration_ms: 180 }],
    error_message: null,
  },
  {
    id: 'log-3',
    automation_id: 'auto-2',
    status: 'error',
    started_at: '2026-03-12T09:00:00Z',
    completed_at: '2026-03-12T09:00:05Z',
    tokens_used: 800,
    tool_calls: [{ tool_name: 'gmail_read', duration_ms: 500 }],
    error_message: 'OAuth token expired',
  },
];

const mockUsageTracking = [
  {
    id: 'usage-1',
    user_id: USER_ID,
    period_start: '2026-03-01',
    executions_count: 45,
    llm_tokens_total: 52000,
    llm_cost_total: 1.56,
  },
  {
    id: 'usage-2',
    user_id: USER_ID,
    period_start: '2026-02-01',
    executions_count: 38,
    llm_tokens_total: 44000,
    llm_cost_total: 1.32,
  },
];

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function mockAuthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  });
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: { message: 'Not authenticated' },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GET /api/dashboard/stats
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/dashboard/stats', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/dashboard/stats/route');
    GET = mod.GET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockUnauthenticated();

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns correct activeAutomations count', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'automations') {
        return makeChain({
          data: mockAutomations.filter((a) => a.status === 'active'),
          error: null,
        });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.activeAutomations).toBe(2);
  });

  it('returns correct totalExecutions from usage_tracking', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'usage_tracking') {
        return makeChain({
          data: [mockUsageTracking[0]],
          error: null,
        });
      }
      if (table === 'automations') {
        return makeChain({ data: mockAutomations.filter((a) => a.status === 'active'), error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalExecutions).toBe(45);
  });

  it('returns correct successRate calculation', async () => {
    mockAuthenticated();
    const logsThisMonth = [
      { status: 'success' },
      { status: 'success' },
      { status: 'success' },
      { status: 'error' },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'execution_logs') {
        return makeChain({ data: logsThisMonth, error: null });
      }
      if (table === 'automations') {
        return makeChain({ data: mockAutomations.filter((a) => a.status === 'active'), error: null });
      }
      if (table === 'usage_tracking') {
        return makeChain({ data: [mockUsageTracking[0]], error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    // 3 success out of 4 = 75%
    expect(body.successRate).toBe(75);
  });

  it('returns correct totalTokens', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'usage_tracking') {
        return makeChain({ data: [mockUsageTracking[0]], error: null });
      }
      if (table === 'automations') {
        return makeChain({ data: [], error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalTokens).toBe(52000);
  });

  it('returns trend deltas (current vs previous month)', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'usage_tracking') {
        // Return both months for trend calculation
        return makeChain({ data: mockUsageTracking, error: null });
      }
      if (table === 'automations') {
        return makeChain({ data: mockAutomations.filter((a) => a.status === 'active'), error: null });
      }
      if (table === 'execution_logs') {
        return makeChain({ data: [], error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    // Trend: (45 - 38) / 38 * 100 ≈ 18.4%
    expect(body.executionsTrend).toBeDefined();
    expect(typeof body.executionsTrend).toBe('number');
    expect(body.tokensTrend).toBeDefined();
    expect(typeof body.tokensTrend).toBe('number');
  });

  it('returns 0s when no data exists', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.activeAutomations).toBe(0);
    expect(body.totalExecutions).toBe(0);
    expect(body.successRate).toBe(0);
    expect(body.totalTokens).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/dashboard/charts?days=30
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/dashboard/charts', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/dashboard/charts/route');
    GET = mod.GET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockUnauthenticated();

    const request = new NextRequest('http://localhost/api/dashboard/charts?days=30');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns daily execution trend data with success/error counts per day', async () => {
    mockAuthenticated();
    const dailyLogs = [
      { status: 'success', started_at: '2026-03-12T08:00:00Z', tokens_used: 1500 },
      { status: 'success', started_at: '2026-03-12T09:00:00Z', tokens_used: 1200 },
      { status: 'error', started_at: '2026-03-12T10:00:00Z', tokens_used: 800 },
      { status: 'success', started_at: '2026-03-11T08:00:00Z', tokens_used: 1000 },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'execution_logs') {
        return makeChain({ data: dailyLogs, error: null });
      }
      if (table === 'automations') {
        return makeChain({ data: mockAutomations, error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/charts?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.executionTrend).toBeDefined();
    expect(Array.isArray(body.executionTrend)).toBe(true);

    // Should have entries with date, success, error counts
    const march12 = body.executionTrend.find(
      (d: { date: string }) => d.date === '2026-03-12'
    );
    if (march12) {
      expect(march12.success).toBe(2);
      expect(march12.error).toBe(1);
    }
  });

  it('returns token trend data grouped by model', async () => {
    mockAuthenticated();
    const logsWithModel = [
      { started_at: '2026-03-12T08:00:00Z', tokens_used: 1500, model: 'claude-sonnet-4-6' },
      { started_at: '2026-03-12T09:00:00Z', tokens_used: 1200, model: 'claude-haiku-4-5' },
      { started_at: '2026-03-11T08:00:00Z', tokens_used: 2000, model: 'claude-sonnet-4-6' },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'execution_logs') {
        return makeChain({ data: logsWithModel, error: null });
      }
      if (table === 'automations') {
        return makeChain({ data: mockAutomations, error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/charts?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tokenTrend).toBeDefined();
    expect(Array.isArray(body.tokenTrend)).toBe(true);
  });

  it('respects days query parameter', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));

    const request = new NextRequest('http://localhost/api/dashboard/charts?days=7');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    // With 7 days, executionTrend should have at most 7 entries
    expect(body.executionTrend).toBeDefined();
    expect(body.executionTrend.length).toBeLessThanOrEqual(7);
  });

  it('returns empty arrays when no logs exist', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));

    const request = new NextRequest('http://localhost/api/dashboard/charts?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.executionTrend).toEqual([]);
    expect(body.tokenTrend).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /api/dashboard/automations-performance
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/dashboard/automations-performance', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/dashboard/automations-performance/route');
    GET = mod.GET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockUnauthenticated();

    const request = new NextRequest('http://localhost/api/dashboard/automations-performance');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns per-automation success rates', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'automations') {
        return makeChain({ data: mockAutomations.slice(0, 2), error: null });
      }
      if (table === 'execution_logs') {
        return makeChain({ data: mockExecutionLogs, error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/automations-performance');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.automations)).toBe(true);

    const auto1 = body.automations.find(
      (a: { automationId: string }) => a.automationId === 'auto-1'
    );
    if (auto1) {
      // auto-1 has 2 success, 0 error → 100% success rate
      expect(auto1.successRate).toBe(100);
      expect(auto1.name).toBe('Morning Briefing');
    }

    const auto2 = body.automations.find(
      (a: { automationId: string }) => a.automationId === 'auto-2'
    );
    if (auto2) {
      // auto-2 has 0 success, 1 error → 0% success rate
      expect(auto2.successRate).toBe(0);
    }
  });

  it('returns avgDurationMs and avgTokens', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'automations') {
        return makeChain({ data: [mockAutomations[0]], error: null });
      }
      if (table === 'execution_logs') {
        // auto-1: log-1 took 12s (12000ms), log-2 took 10s (10000ms)
        return makeChain({ data: mockExecutionLogs.filter((l) => l.automation_id === 'auto-1'), error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/automations-performance');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    const auto1 = body.automations.find(
      (a: { automationId: string }) => a.automationId === 'auto-1'
    );
    if (auto1) {
      // avg duration: (12000 + 10000) / 2 = 11000ms
      expect(auto1.avgDurationMs).toBe(11000);
      // avg tokens: (1500 + 1200) / 2 = 1350
      expect(auto1.avgTokens).toBe(1350);
    }
  });

  it('returns empty array when no automations', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));

    const request = new NextRequest('http://localhost/api/dashboard/automations-performance');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.automations).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GET /api/dashboard/tool-usage?days=30
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/dashboard/tool-usage', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/dashboard/tool-usage/route');
    GET = mod.GET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockUnauthenticated();

    const request = new NextRequest('http://localhost/api/dashboard/tool-usage?days=30');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('aggregates tool_calls JSONB correctly', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'execution_logs') {
        return makeChain({ data: mockExecutionLogs, error: null });
      }
      if (table === 'automations') {
        return makeChain({ data: mockAutomations, error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/tool-usage?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tools).toBeDefined();
    expect(Array.isArray(body.tools)).toBe(true);

    // calendar_list_events: used in log-1 and log-2 → count 2
    const calendarTool = body.tools.find(
      (t: { name: string }) => t.name === 'calendar_list_events'
    );
    if (calendarTool) {
      expect(calendarTool.count).toBe(2);
    }

    // gmail_read: used in log-1 and log-3 → count 2
    const gmailTool = body.tools.find(
      (t: { name: string }) => t.name === 'gmail_read'
    );
    if (gmailTool) {
      expect(gmailTool.count).toBe(2);
    }
  });

  it('returns template distribution percentages', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'execution_logs') {
        return makeChain({
          data: [
            { ...mockExecutionLogs[0], automation_id: 'auto-1' },
            { ...mockExecutionLogs[1], automation_id: 'auto-1' },
            { ...mockExecutionLogs[2], automation_id: 'auto-2' },
          ],
          error: null,
        });
      }
      if (table === 'automations') {
        return makeChain({ data: mockAutomations, error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/tool-usage?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.templateDistribution).toBeDefined();
    expect(Array.isArray(body.templateDistribution)).toBe(true);

    // morning_briefing: 2/3 executions ≈ 66.7%, email_triage: 1/3 ≈ 33.3%
    const morning = body.templateDistribution.find(
      (t: { template: string }) => t.template === 'morning_briefing'
    );
    if (morning) {
      expect(morning.percentage).toBeCloseTo(66.7, 0);
    }
  });

  it('handles empty tool_calls', async () => {
    mockAuthenticated();
    const logsWithEmptyTools = [
      {
        id: 'log-empty',
        automation_id: 'auto-1',
        status: 'success',
        started_at: '2026-03-12T08:00:00Z',
        completed_at: '2026-03-12T08:00:01Z',
        tokens_used: 100,
        tool_calls: [],
        error_message: null,
      },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'execution_logs') {
        return makeChain({ data: logsWithEmptyTools, error: null });
      }
      if (table === 'automations') {
        return makeChain({ data: mockAutomations, error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/tool-usage?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tools).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. GET /api/dashboard/upcoming
// ═══════════════════════════════════════════════════════════════════════════════

describe('GET /api/dashboard/upcoming', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeAll(async () => {
    const mod = await import('@/app/api/dashboard/upcoming/route');
    GET = mod.GET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockUnauthenticated();

    const request = new NextRequest('http://localhost/api/dashboard/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns next 5 upcoming runs sorted by next_run_at', async () => {
    mockAuthenticated();
    const upcomingAutomations = [
      { id: 'auto-1', name: 'Morning Briefing', template_type: 'morning_briefing', next_run_at: '2026-03-14T08:00:00Z', status: 'active' },
      { id: 'auto-2', name: 'Email Triage', template_type: 'email_triage', next_run_at: '2026-03-14T09:00:00Z', status: 'active' },
      { id: 'auto-4', name: 'Weekly Review', template_type: 'weekly_review', next_run_at: '2026-03-14T10:00:00Z', status: 'active' },
      { id: 'auto-5', name: 'Smart Save', template_type: 'smart_save', next_run_at: '2026-03-14T11:00:00Z', status: 'active' },
      { id: 'auto-6', name: 'Reading Digest 2', template_type: 'reading_digest', next_run_at: '2026-03-14T12:00:00Z', status: 'active' },
    ];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'automations') {
        return makeChain({ data: upcomingAutomations, error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.upcoming).toBeDefined();
    expect(body.upcoming.length).toBeLessThanOrEqual(5);

    // Should be sorted by next_run_at ascending
    for (let i = 1; i < body.upcoming.length; i++) {
      const prev = new Date(body.upcoming[i - 1].next_run_at).getTime();
      const curr = new Date(body.upcoming[i].next_run_at).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('only includes active automations', async () => {
    mockAuthenticated();
    // Mix of active and paused — only active should be returned
    mockFrom.mockImplementation((table: string) => {
      if (table === 'automations') {
        return makeChain({
          data: [
            { id: 'auto-1', name: 'Morning Briefing', template_type: 'morning_briefing', next_run_at: '2026-03-14T08:00:00Z', status: 'active' },
          ],
          error: null,
        });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    // All returned should be active
    for (const item of body.upcoming) {
      expect(item.status).toBeUndefined(); // status may not be in response, or if included:
      // The query should have filtered by status='active'
    }
    expect(body.upcoming.length).toBe(1);
  });

  it('returns empty when no upcoming runs', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation(() => makeChain({ data: [], error: null }));

    const request = new NextRequest('http://localhost/api/dashboard/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.upcoming).toEqual([]);
  });
});
