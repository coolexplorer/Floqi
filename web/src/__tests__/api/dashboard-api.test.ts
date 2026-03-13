/**
 * Dashboard API Route Tests
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

function makeChain(result: Record<string, unknown>) {
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
  chain.then = vi.fn().mockImplementation(
    (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
      Promise.resolve(result).then(resolve, reject),
  );
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
    last_run_at: '2026-03-13T08:00:00Z',
  },
  {
    id: 'auto-2',
    user_id: USER_ID,
    name: 'Email Triage',
    template_type: 'email_triage',
    status: 'active',
    schedule_cron: '0 9 * * *',
    next_run_at: '2026-03-14T09:00:00Z',
    last_run_at: '2026-03-13T09:00:00Z',
  },
  {
    id: 'auto-3',
    user_id: USER_ID,
    name: 'Reading Digest',
    template_type: 'reading_digest',
    status: 'paused',
    schedule_cron: '0 18 * * 5',
    next_run_at: null,
    last_run_at: null,
  },
];

const mockExecutionLogs = [
  {
    id: 'log-1',
    automation_id: 'auto-1',
    status: 'success',
    started_at: '2026-03-12T08:00:00Z',
    completed_at: '2026-03-12T08:00:12Z',
    created_at: '2026-03-12T08:00:00Z',
    tokens_used: 1500,
    tool_calls: [
      { toolName: 'calendar_list_events', duration: 200, status: 'success' },
      { toolName: 'gmail_read', duration: 300, status: 'success' },
    ],
    error_message: null,
  },
  {
    id: 'log-2',
    automation_id: 'auto-1',
    status: 'success',
    started_at: '2026-03-11T08:00:00Z',
    completed_at: '2026-03-11T08:00:10Z',
    created_at: '2026-03-11T08:00:00Z',
    tokens_used: 1200,
    tool_calls: [{ toolName: 'calendar_list_events', duration: 180, status: 'success' }],
    error_message: null,
  },
  {
    id: 'log-3',
    automation_id: 'auto-2',
    status: 'error',
    started_at: '2026-03-12T09:00:00Z',
    completed_at: '2026-03-12T09:00:05Z',
    created_at: '2026-03-12T09:00:00Z',
    tokens_used: 800,
    tool_calls: [{ toolName: 'gmail_read', duration: 500, status: 'error' }],
    error_message: 'OAuth token expired',
  },
];

const currentUsageData = {
  executions_count: 45,
  llm_tokens_total: 52000,
  llm_cost_total: 1.56,
};

const prevUsageData = {
  executions_count: 38,
  llm_tokens_total: 44000,
  llm_cost_total: 1.32,
};

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

// ─── Reset helper ─────────────────────────────────────────────────────────────
// Use mockReset (not mockClear) to clear mockReturnValueOnce queues
function resetMocks() {
  mockGetUser.mockReset();
  mockFrom.mockReset();
  mockRpc.mockReset();
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
    resetMocks();
  });

  /**
   * Stats route call order:
   * 1. from('automations') → count query (head: true) → { count }
   * 2. from('usage_tracking') → current month .single() → { data }
   * 3. from('usage_tracking') → prev month .single() → { data }
   * 4. from('automations') → id list → { data }
   * 5. from('execution_logs') → current month logs → { data }
   * 6. from('execution_logs') → prev month logs → { data }
   */
  function setupStatsMocks(opts: {
    activeCount?: number;
    currentUsage?: Record<string, unknown> | null;
    prevUsage?: Record<string, unknown> | null;
    automationIds?: { id: string }[];
    currentLogs?: Record<string, unknown>[];
    prevLogs?: Record<string, unknown>[];
  } = {}) {
    let automationsCall = 0;
    let usageCall = 0;
    let logsCall = 0;

    mockFrom.mockImplementation((table: string) => {
      if (table === 'automations') {
        automationsCall++;
        if (automationsCall === 1) {
          return makeChain({ count: opts.activeCount ?? 0, data: null, error: null });
        }
        return makeChain({ data: opts.automationIds ?? [], error: null });
      }
      if (table === 'usage_tracking') {
        usageCall++;
        if (usageCall === 1) {
          return makeChain({
            data: opts.currentUsage ?? null,
            error: opts.currentUsage ? null : { code: 'PGRST116' },
          });
        }
        return makeChain({
          data: opts.prevUsage ?? null,
          error: opts.prevUsage ? null : { code: 'PGRST116' },
        });
      }
      if (table === 'execution_logs') {
        logsCall++;
        if (logsCall === 1) {
          return makeChain({ data: opts.currentLogs ?? [], error: null });
        }
        return makeChain({ data: opts.prevLogs ?? [], error: null });
      }
      return makeChain({ data: [], error: null });
    });
  }

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
    setupStatsMocks({
      activeCount: 2,
      currentUsage: currentUsageData,
      automationIds: [{ id: 'auto-1' }, { id: 'auto-2' }],
    });

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.activeAutomations).toBe(2);
  });

  it('returns correct totalExecutions from usage_tracking', async () => {
    mockAuthenticated();
    setupStatsMocks({
      activeCount: 2,
      currentUsage: currentUsageData,
      automationIds: [{ id: 'auto-1' }, { id: 'auto-2' }],
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
      { status: 'success', started_at: '2026-03-12T08:00:00Z', completed_at: '2026-03-12T08:00:10Z' },
      { status: 'success', started_at: '2026-03-12T09:00:00Z', completed_at: '2026-03-12T09:00:10Z' },
      { status: 'success', started_at: '2026-03-12T10:00:00Z', completed_at: '2026-03-12T10:00:10Z' },
      { status: 'error', started_at: '2026-03-12T11:00:00Z', completed_at: '2026-03-12T11:00:05Z' },
    ];
    setupStatsMocks({
      activeCount: 2,
      currentUsage: currentUsageData,
      automationIds: [{ id: 'auto-1' }, { id: 'auto-2' }],
      currentLogs: logsThisMonth,
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
    setupStatsMocks({
      currentUsage: currentUsageData,
    });

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.totalTokens).toBe(52000);
  });

  it('returns trend deltas (current vs previous month)', async () => {
    mockAuthenticated();
    setupStatsMocks({
      activeCount: 2,
      currentUsage: currentUsageData,
      prevUsage: prevUsageData,
      automationIds: [{ id: 'auto-1' }, { id: 'auto-2' }],
    });

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.trends).toBeDefined();
    expect(body.trends.executionsDelta).toBe(45 - 38); // 7
    expect(body.trends.tokensDelta).toBe(52000 - 44000); // 8000
    expect(typeof body.trends.successRateDelta).toBe('number');
    expect(typeof body.trends.costDelta).toBe('number');
  });

  it('returns 0s when no data exists', async () => {
    mockAuthenticated();
    setupStatsMocks();

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.activeAutomations).toBe(0);
    expect(body.totalExecutions).toBe(0);
    expect(body.successRate).toBe(0);
    expect(body.totalTokens).toBe(0);
    expect(body.estimatedCost).toBe(0);
    expect(body.avgDurationMs).toBe(0);
  });

  it('returns estimatedCost and avgDurationMs', async () => {
    mockAuthenticated();
    const logsThisMonth = [
      { status: 'success', started_at: '2026-03-12T08:00:00Z', completed_at: '2026-03-12T08:00:10Z' },
      { status: 'success', started_at: '2026-03-12T09:00:00Z', completed_at: '2026-03-12T09:00:06Z' },
    ];
    setupStatsMocks({
      activeCount: 1,
      currentUsage: currentUsageData,
      automationIds: [{ id: 'auto-1' }],
      currentLogs: logsThisMonth,
    });

    const request = new NextRequest('http://localhost/api/dashboard/stats');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    // estimatedCost should be > 0 when tokens exist
    expect(body.estimatedCost).toBeGreaterThan(0);
    // avgDurationMs: (10000 + 6000) / 2 = 8000
    expect(body.avgDurationMs).toBe(8000);
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
    resetMocks();
  });

  /**
   * Charts route call order:
   * 1. from('automations') → user's automation IDs
   * 2. from('execution_logs') → logs within date range
   */
  function setupChartsMocks(opts: {
    automations?: { id: string }[];
    logs?: Record<string, unknown>[];
  } = {}) {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: opts.automations ?? [], error: null });
      }
      return makeChain({ data: opts.logs ?? [], error: null });
    });
  }

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
    setupChartsMocks({
      automations: [{ id: 'auto-1' }, { id: 'auto-2' }],
      logs: [
        { status: 'success', created_at: '2026-03-12T08:00:00Z', tokens_used: 1500 },
        { status: 'success', created_at: '2026-03-12T09:00:00Z', tokens_used: 1200 },
        { status: 'error', created_at: '2026-03-12T10:00:00Z', tokens_used: 800 },
        { status: 'success', created_at: '2026-03-11T08:00:00Z', tokens_used: 1000 },
      ],
    });

    const request = new NextRequest('http://localhost/api/dashboard/charts?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.executionTrend).toBeDefined();
    expect(Array.isArray(body.executionTrend)).toBe(true);

    const march12 = body.executionTrend.find(
      (d: { date: string }) => d.date === '2026-03-12',
    );
    expect(march12).toBeDefined();
    expect(march12.success).toBe(2);
    expect(march12.error).toBe(1);
  });

  it('returns token trend data grouped by model', async () => {
    mockAuthenticated();
    setupChartsMocks({
      automations: [{ id: 'auto-1' }, { id: 'auto-2' }],
      logs: [
        { status: 'success', created_at: '2026-03-12T08:00:00Z', tokens_used: 1500, model: 'claude-sonnet-4-6' },
        { status: 'success', created_at: '2026-03-12T09:00:00Z', tokens_used: 1200, model: 'claude-haiku-4-5' },
        { status: 'success', created_at: '2026-03-11T08:00:00Z', tokens_used: 2000, model: 'claude-sonnet-4-6' },
      ],
    });

    const request = new NextRequest('http://localhost/api/dashboard/charts?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tokenTrend).toBeDefined();
    expect(Array.isArray(body.tokenTrend)).toBe(true);

    // March 12: sonnet 1500, haiku 1200
    const march12 = body.tokenTrend.find((d: { date: string }) => d.date === '2026-03-12');
    expect(march12).toBeDefined();
    expect(march12.sonnetTokens).toBe(1500);
    expect(march12.haikuTokens).toBe(1200);

    // March 11: sonnet 2000, haiku 0
    const march11 = body.tokenTrend.find((d: { date: string }) => d.date === '2026-03-11');
    expect(march11).toBeDefined();
    expect(march11.sonnetTokens).toBe(2000);
    expect(march11.haikuTokens).toBe(0);
  });

  it('respects days query parameter', async () => {
    mockAuthenticated();
    setupChartsMocks({ automations: [{ id: 'auto-1' }], logs: [] });

    const request = new NextRequest('http://localhost/api/dashboard/charts?days=7');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.executionTrend).toBeDefined();
    expect(body.executionTrend.length).toBeLessThanOrEqual(7);
  });

  it('returns empty arrays when no logs exist', async () => {
    mockAuthenticated();
    setupChartsMocks({ automations: [{ id: 'auto-1' }], logs: [] });

    const request = new NextRequest('http://localhost/api/dashboard/charts?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.executionTrend).toEqual([]);
    expect(body.tokenTrend).toEqual([]);
  });

  it('returns empty arrays when no automations exist', async () => {
    mockAuthenticated();
    setupChartsMocks({ automations: [] });

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
    resetMocks();
  });

  /**
   * Automations-performance route call order:
   * 1. from('automations') → user's automations with details
   * 2. from('execution_logs') → logs for those automations
   */
  function setupPerfMocks(opts: {
    automations?: Record<string, unknown>[];
    logs?: Record<string, unknown>[];
  } = {}) {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: opts.automations ?? [], error: null });
      }
      return makeChain({ data: opts.logs ?? [], error: null });
    });
  }

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
    setupPerfMocks({
      automations: mockAutomations.slice(0, 2),
      logs: mockExecutionLogs,
    });

    const request = new NextRequest('http://localhost/api/dashboard/automations-performance');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.automations)).toBe(true);

    const auto1 = body.automations.find(
      (a: { id: string }) => a.id === 'auto-1',
    );
    expect(auto1).toBeDefined();
    // auto-1 has 2 success, 0 error → 100% success rate
    expect(auto1.successRate).toBe(100);
    expect(auto1.name).toBe('Morning Briefing');

    const auto2 = body.automations.find(
      (a: { id: string }) => a.id === 'auto-2',
    );
    expect(auto2).toBeDefined();
    // auto-2 has 0 success, 1 error → 0% success rate
    expect(auto2.successRate).toBe(0);
  });

  it('returns avgDurationMs and avgTokens', async () => {
    mockAuthenticated();
    setupPerfMocks({
      automations: [mockAutomations[0]],
      logs: mockExecutionLogs.filter((l) => l.automation_id === 'auto-1'),
    });

    const request = new NextRequest('http://localhost/api/dashboard/automations-performance');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    const auto1 = body.automations.find(
      (a: { id: string }) => a.id === 'auto-1',
    );
    expect(auto1).toBeDefined();
    // avg duration: (12000 + 10000) / 2 = 11000ms
    expect(auto1.avgDurationMs).toBe(11000);
    // avg tokens: (1500 + 1200) / 2 = 1350
    expect(auto1.avgTokens).toBe(1350);
  });

  it('returns empty array when no automations', async () => {
    mockAuthenticated();
    setupPerfMocks({ automations: [] });

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
    resetMocks();
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
    // Tool-usage route: 1. from('automations'), 2. from('execution_logs')
    // The route uses toolName (camelCase) from JSONB
    const logsWithToolNames = [
      {
        automation_id: 'auto-1',
        tool_calls: [
          { toolName: 'calendar_list_events' },
          { toolName: 'gmail_read' },
        ],
      },
      {
        automation_id: 'auto-1',
        tool_calls: [{ toolName: 'calendar_list_events' }],
      },
      {
        automation_id: 'auto-2',
        tool_calls: [{ toolName: 'gmail_read' }],
      },
    ];
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: mockAutomations, error: null });
      }
      return makeChain({ data: logsWithToolNames, error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/tool-usage?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tools).toBeDefined();
    expect(Array.isArray(body.tools)).toBe(true);

    // calendar_list_events: used in log 1 and log 2 → totalCalls 2
    const calendarTool = body.tools.find(
      (t: { toolName: string }) => t.toolName === 'calendar_list_events',
    );
    expect(calendarTool).toBeDefined();
    expect(calendarTool.totalCalls).toBe(2);

    // gmail_read: used in log 1 and log 3 → totalCalls 2
    const gmailTool = body.tools.find(
      (t: { toolName: string }) => t.toolName === 'gmail_read',
    );
    expect(gmailTool).toBeDefined();
    expect(gmailTool.totalCalls).toBe(2);
  });

  it('returns template distribution percentages', async () => {
    mockAuthenticated();
    const logs = [
      { automation_id: 'auto-1', tool_calls: [] },
      { automation_id: 'auto-1', tool_calls: [] },
      { automation_id: 'auto-2', tool_calls: [] },
    ];
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: mockAutomations, error: null });
      }
      return makeChain({ data: logs, error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/tool-usage?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.templateDistribution).toBeDefined();
    expect(Array.isArray(body.templateDistribution)).toBe(true);

    // morning_briefing: 2/3 executions ≈ 66.7%, email_triage: 1/3 ≈ 33.3%
    const morning = body.templateDistribution.find(
      (t: { templateType: string }) => t.templateType === 'morning_briefing',
    );
    expect(morning).toBeDefined();
    expect(morning.percentage).toBeCloseTo(66.7, 0);
  });

  it('handles empty tool_calls', async () => {
    mockAuthenticated();
    const logsWithEmptyTools = [
      { automation_id: 'auto-1', tool_calls: [] },
    ];
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: mockAutomations, error: null });
      }
      return makeChain({ data: logsWithEmptyTools, error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/tool-usage?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tools).toEqual([]);
  });

  it('handles null tool_calls JSONB', async () => {
    mockAuthenticated();
    const logsWithNullTools = [
      { automation_id: 'auto-1', tool_calls: null },
    ];
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: mockAutomations, error: null });
      }
      return makeChain({ data: logsWithNullTools, error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/tool-usage?days=30');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tools).toEqual([]);
  });

  it('uses default 30 days for invalid days parameter', async () => {
    mockAuthenticated();
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: [], error: null });
      }
      return makeChain({ data: [], error: null });
    });

    // NaN days should default to 30
    const request = new NextRequest('http://localhost/api/dashboard/tool-usage?days=abc');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tools).toEqual([]);
    expect(body.templateDistribution).toEqual([]);
  });

  it('clamps negative days to 1', async () => {
    mockAuthenticated();
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeChain({ data: [{ id: 'auto-1', template_type: 'morning_briefing' }], error: null });
      }
      return makeChain({ data: [], error: null });
    });

    const request = new NextRequest('http://localhost/api/dashboard/tool-usage?days=-5');
    const response = await GET(request);

    expect(response.status).toBe(200);
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
    resetMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockUnauthenticated();

    const request = new NextRequest('http://localhost/api/dashboard/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it('returns next 5 upcoming runs sorted by nextRunAt', async () => {
    mockAuthenticated();
    const upcomingAutomations = [
      { id: 'auto-1', name: 'Morning Briefing', template_type: 'morning_briefing', next_run_at: '2026-03-14T08:00:00Z', schedule_cron: '0 8 * * *' },
      { id: 'auto-2', name: 'Email Triage', template_type: 'email_triage', next_run_at: '2026-03-14T09:00:00Z', schedule_cron: '0 9 * * *' },
      { id: 'auto-4', name: 'Weekly Review', template_type: 'weekly_review', next_run_at: '2026-03-14T10:00:00Z', schedule_cron: '0 10 * * *' },
      { id: 'auto-5', name: 'Smart Save', template_type: 'smart_save', next_run_at: '2026-03-14T11:00:00Z', schedule_cron: '0 11 * * *' },
      { id: 'auto-6', name: 'Reading Digest 2', template_type: 'reading_digest', next_run_at: '2026-03-14T12:00:00Z', schedule_cron: '0 12 * * *' },
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

    // Response uses camelCase: nextRunAt
    for (let i = 1; i < body.upcoming.length; i++) {
      const prev = new Date(body.upcoming[i - 1].nextRunAt).getTime();
      const curr = new Date(body.upcoming[i].nextRunAt).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }

    // Verify response shape
    expect(body.upcoming[0].automationId).toBe('auto-1');
    expect(body.upcoming[0].automationName).toBe('Morning Briefing');
    expect(body.upcoming[0].templateType).toBe('morning_briefing');
  });

  it('only includes active automations', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === 'automations') {
        // The route already filters by status='active' and not-null next_run_at
        return makeChain({
          data: [
            { id: 'auto-1', name: 'Morning Briefing', template_type: 'morning_briefing', next_run_at: '2026-03-14T08:00:00Z', schedule_cron: '0 8 * * *' },
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
    expect(body.upcoming.length).toBe(1);
    expect(body.upcoming[0].automationId).toBe('auto-1');
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

  it('returns 500 when Supabase query fails', async () => {
    mockAuthenticated();
    mockFrom.mockImplementation(() =>
      makeChain({ data: null, error: { message: 'DB connection failed' } }),
    );

    const request = new NextRequest('http://localhost/api/dashboard/upcoming');
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('DB connection failed');
  });
});
