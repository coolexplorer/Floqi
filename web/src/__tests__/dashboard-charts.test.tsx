/**
 * Dashboard Charts Tests — TC-6010, TC-6011 (PM-16: Dashboard Advanced Stats)
 *
 * Updated for RSC: async Server Component pattern
 */

import { render, screen } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn(() => null),
    })
  ),
}));

// Mock recharts to avoid canvas issues in test
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  AreaChart: () => <div data-testid="mock-area-chart" />,
  Area: () => null,
  LineChart: () => <div data-testid="mock-line-chart" />,
  Line: () => null,
  BarChart: () => <div data-testid="mock-bar-chart" />,
  Bar: () => null,
  PieChart: () => <div data-testid="mock-pie-chart" />,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  Label: () => null,
  LabelList: () => null,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_URL = "http://localhost:3000";

const statsResponse = {
  activeAutomations: 2,
  totalExecutions: 5,
  successRate: 80.0,
  totalTokens: 4000,
  estimatedCost: 0.80,
  avgDurationMs: 4500,
  trends: {
    executionsDelta: 3,
    successRateDelta: 5,
    tokensDelta: 200,
    costDelta: 15,
  },
};

const chartsResponse = {
  executionTrend: [
    { date: "2026-03-03", success: 1, error: 0, total: 1 },
    { date: "2026-03-04", success: 1, error: 0, total: 1 },
    { date: "2026-03-05", success: 0, error: 1, total: 1 },
    { date: "2026-03-06", success: 1, error: 0, total: 1 },
    { date: "2026-03-07", success: 1, error: 0, total: 1 },
  ],
  tokenTrend: [
    { date: "2026-03-03", haikuTokens: 400, sonnetTokens: 400, estimatedCost: 0.16 },
    { date: "2026-03-04", haikuTokens: 550, sonnetTokens: 550, estimatedCost: 0.22 },
    { date: "2026-03-05", haikuTokens: 100, sonnetTokens: 100, estimatedCost: 0.04 },
    { date: "2026-03-06", haikuTokens: 500, sonnetTokens: 500, estimatedCost: 0.20 },
    { date: "2026-03-07", haikuTokens: 450, sonnetTokens: 450, estimatedCost: 0.18 },
  ],
};

const perfResponse = {
  automations: [
    {
      id: "auto-1",
      name: "Morning Briefing",
      templateType: "morning_briefing",
      successRate: 75.0,
      totalExecutions: 3,
      avgDurationMs: 5000,
      avgTokens: 1000,
      lastRunAt: "2026-03-07T08:00:00Z",
      nextRunAt: "2026-03-08T08:00:00Z",
    },
    {
      id: "auto-2",
      name: "Email Triage",
      templateType: "email_triage",
      successRate: 100,
      totalExecutions: 2,
      avgDurationMs: 4000,
      avgTokens: 800,
      lastRunAt: "2026-03-05T09:00:00Z",
      nextRunAt: "2026-03-06T09:00:00Z",
    },
  ],
};

const toolsResponse = {
  tools: [
    { toolName: "gmail_read", totalCalls: 5, successCalls: 4, errorCalls: 1 },
  ],
  templateDistribution: [
    { templateType: "morning_briefing", count: 3, percentage: 60.0 },
    { templateType: "email_triage", count: 2, percentage: 40.0 },
  ],
};

const upcomingResponse = {
  upcoming: [
    {
      automationId: "auto-1",
      automationName: "Morning Briefing",
      templateType: "morning_briefing",
      nextRunAt: "2026-03-08T08:00:00Z",
      scheduleCron: "0 8 * * *",
    },
  ],
};

// ─── Setup helper ─────────────────────────────────────────────────────────────

function setupDashboard() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const routes: Record<string, unknown> = {
        [`${BASE_URL}/api/dashboard/stats`]: statsResponse,
        [`${BASE_URL}/api/dashboard/charts?days=30`]: chartsResponse,
        [`${BASE_URL}/api/dashboard/automations-performance`]: perfResponse,
        [`${BASE_URL}/api/dashboard/tool-usage?days=30`]: toolsResponse,
        [`${BASE_URL}/api/dashboard/upcoming`]: upcomingResponse,
      };
      const body = routes[url];
      if (body) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    })
  );
}

// ─── TC-6010: Dashboard 차트 표시 ─────────────────────────────────────────────

describe("TC-6010: Dashboard 차트 표시", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDashboard();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("실행 추이 차트 영역이 렌더링된다", async () => {
    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByTestId("execution-trend-chart")).toBeInTheDocument();
  });

  it("토큰 사용량 차트 영역이 렌더링된다", async () => {
    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByTestId("token-usage-chart")).toBeInTheDocument();
  });

  it("실행 추이 차트에 'Execution Trend' 제목이 표시된다", async () => {
    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByText(/execution trend/i)).toBeInTheDocument();
  });

  it("토큰 사용량 차트에 'Token Usage' 제목이 표시된다", async () => {
    const jsx = await DashboardPage();
    render(jsx);

    const chartArea = screen.getByTestId("token-usage-chart");
    expect(chartArea).toHaveTextContent(/token usage/i);
  });
});

// ─── TC-6011: Chart data accuracy ─────────────────────────────────────────────

describe("TC-6011: 차트 데이터 정확성 (API 응답 ↔ 차트 데이터)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDashboard();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("실행 추이 차트 컴포넌트가 렌더링된다", async () => {
    const jsx = await DashboardPage();
    render(jsx);

    const chartArea = screen.getByTestId("execution-trend-chart");
    expect(chartArea).toBeInTheDocument();
  });

  it("성공률이 KPI 카드에 정확하게 표시된다", async () => {
    const jsx = await DashboardPage();
    render(jsx);

    const rateEl = screen.getByTestId("stat-success-rate");
    expect(rateEl).toHaveTextContent(/80/);
  });

  it("자동화 퍼포먼스 차트가 렌더링된다", async () => {
    const jsx = await DashboardPage();
    render(jsx);

    expect(screen.getByTestId("automation-performance-chart")).toBeInTheDocument();
  });
});
