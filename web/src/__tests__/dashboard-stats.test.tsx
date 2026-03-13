/**
 * Dashboard Statistics Tests — TC-6010, TC-6011
 * US-604: 대시보드 통계
 *
 * Updated for Phase 3: fetch-based API route data fetching
 */

import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
  }),
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

const statsResponse = {
  activeAutomations: 3,
  totalExecutions: 3,
  successRate: 66.7,
  totalTokens: 2200,
  estimatedCost: 0.44,
  avgDurationMs: 5000,
  trends: {
    executionsDelta: 2,
    successRateDelta: -5,
    tokensDelta: 100,
    costDelta: 10,
  },
};

const chartsResponse = {
  executionTrend: [
    { date: "2026-03-04", success: 0, error: 1, total: 1 },
    { date: "2026-03-05", success: 1, error: 0, total: 1 },
    { date: "2026-03-06", success: 1, error: 0, total: 1 },
  ],
  tokenTrend: [
    { date: "2026-03-04", haikuTokens: 100, sonnetTokens: 100, estimatedCost: 0.04 },
    { date: "2026-03-05", haikuTokens: 400, sonnetTokens: 400, estimatedCost: 0.16 },
    { date: "2026-03-06", haikuTokens: 600, sonnetTokens: 600, estimatedCost: 0.24 },
  ],
};

const perfResponse = {
  automations: [
    {
      id: "auto-1",
      name: "Morning Briefing",
      templateType: "morning_briefing",
      successRate: 66.7,
      totalExecutions: 2,
      avgDurationMs: 5000,
      avgTokens: 700,
      lastRunAt: "2026-03-06T08:00:00Z",
      nextRunAt: "2026-03-07T08:00:00Z",
    },
    {
      id: "auto-2",
      name: "Email Triage",
      templateType: "email_triage",
      successRate: 100,
      totalExecutions: 1,
      avgDurationMs: 4000,
      avgTokens: 800,
      lastRunAt: "2026-03-05T09:00:00Z",
      nextRunAt: "2026-03-06T09:00:00Z",
    },
    {
      id: "auto-3",
      name: "Reading Digest",
      templateType: "reading_digest",
      successRate: 100,
      totalExecutions: 0,
      avgDurationMs: 0,
      avgTokens: 0,
      lastRunAt: null,
      nextRunAt: null,
    },
  ],
};

const toolsResponse = {
  tools: [
    { toolName: "gmail_read", totalCalls: 5, successCalls: 4, errorCalls: 1 },
  ],
  templateDistribution: [
    { templateType: "morning_briefing", count: 2, percentage: 66.7 },
    { templateType: "email_triage", count: 1, percentage: 33.3 },
  ],
};

const upcomingResponse = {
  upcoming: [
    {
      automationId: "auto-1",
      automationName: "Morning Briefing",
      templateType: "morning_briefing",
      nextRunAt: "2026-03-07T08:00:00Z",
      scheduleCron: "0 8 * * *",
    },
  ],
};

// ─── Setup helper ─────────────────────────────────────────────────────────────

function setupDashboard() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-abc" } },
    error: null,
  });

  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const routes: Record<string, unknown> = {
        "/api/dashboard/stats": statsResponse,
        "/api/dashboard/charts?days=30": chartsResponse,
        "/api/dashboard/automations-performance": perfResponse,
        "/api/dashboard/tool-usage?days=30": toolsResponse,
        "/api/dashboard/upcoming": upcomingResponse,
      };
      const body = routes[url];
      if (body) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(body),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({}),
      });
    })
  );
}

// ─── TC-6010: 대시보드 통계 카드 표시 (E2E) ───────────────────────────────────

describe("TC-6010: 대시보드 통계 카드 표시", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDashboard();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("활성 자동화 수 카드를 표시한다", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/active automations/i)).toBeInTheDocument();
    });
  });

  it("이번 달 실행 횟수 카드를 표시한다", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/executions this month/i)
      ).toBeInTheDocument();
    });
  });

  it("총 토큰 사용량 카드를 표시한다", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/total tokens/i)).toBeInTheDocument();
    });
  });

  it("성공률 카드를 표시한다", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("stat-success-rate")).toBeInTheDocument();
      expect(screen.getByTestId("stat-success-rate")).toHaveTextContent(/success rate/i);
    });
  });

  it("최근 실행 위젯을 표시한다", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/recent executions/i)).toBeInTheDocument();
    });
  });

  it("예정된 실행 위젯을 표시한다", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/upcoming runs/i)).toBeInTheDocument();
    });
  });
});

// ─── TC-6011: 통계 데이터 정확성 (Integration) ────────────────────────────────

describe("TC-6011: 통계 데이터 정확성 (API 응답 ↔ UI 수치 일치)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDashboard();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("활성 자동화 수가 API 응답 값과 일치한다", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const countEl = screen.getByTestId("stat-active-automations");
      expect(countEl).toHaveTextContent("3");
    });
  });

  it("총 토큰 사용량이 API 응답 값과 일치한다", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const tokensEl = screen.getByTestId("stat-tokens-used");
      expect(tokensEl).toHaveTextContent(/2[,.]?200/);
    });
  });

  it("성공률이 API 응답 값과 일치한다", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const rateEl = screen.getByTestId("stat-success-rate");
      expect(rateEl).toHaveTextContent(/66\.7/);
    });
  });

  it("실행 횟수가 API 응답 값과 일치한다", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      const countEl = screen.getByTestId("stat-execution-count");
      expect(countEl).toHaveTextContent("3");
    });
  });

  it("인증되지 않은 사용자는 대시보드에 접근할 수 없다", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
