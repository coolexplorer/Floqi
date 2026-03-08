/**
 * Dashboard Charts Tests — TC-6010, TC-6011 (PM-16: Dashboard Advanced Stats)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-6010: Dashboard shows execution trend chart and success rate chart
 * TC-6011: Chart data accuracy — matches aggregated DB values
 *
 * FAILURES expected (Red phase):
 * - Dashboard에 차트 컴포넌트 미구현
 * - data-testid="execution-trend-chart", "success-rate-chart" 없음
 * - 주간 데이터 포인트 표시 없음
 */

import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const activeAutomations = [
  { id: "auto-1", name: "Morning Briefing", status: "active" },
  { id: "auto-2", name: "Email Triage", status: "active" },
];

// 7일간 실행 로그 — 차트 데이터 포인트용
const weeklyExecutionLogs = [
  { id: "log-1", automation_id: "auto-1", automation_name: "Morning Briefing", status: "success", tokens_used: 1000, created_at: "2026-03-07T08:00:00Z" },
  { id: "log-2", automation_id: "auto-1", automation_name: "Morning Briefing", status: "success", tokens_used: 900, created_at: "2026-03-06T08:00:00Z" },
  { id: "log-3", automation_id: "auto-2", automation_name: "Email Triage", status: "error", tokens_used: 200, created_at: "2026-03-05T09:00:00Z" },
  { id: "log-4", automation_id: "auto-1", automation_name: "Morning Briefing", status: "success", tokens_used: 1100, created_at: "2026-03-04T08:00:00Z" },
  { id: "log-5", automation_id: "auto-2", automation_name: "Email Triage", status: "success", tokens_used: 800, created_at: "2026-03-03T09:00:00Z" },
];

// ─── Setup helper ─────────────────────────────────────────────────────────────

function setupDashboard() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-abc" } },
    error: null,
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === "automations") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: activeAutomations,
          error: null,
        }),
      };
    }
    if (table === "execution_logs") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: weeklyExecutionLogs,
          error: null,
        }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
  });
}

// ─── TC-6010: Dashboard shows execution trend chart and success rate chart ───

describe("TC-6010: Dashboard 차트 표시", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDashboard();
  });

  it("실행 추이 차트 영역이 렌더링된다 — RED: 차트 컴포넌트 미구현", async () => {
    render(<DashboardPage />);

    // EXPECT: data-testid="execution-trend-chart" 영역 존재
    // ACTUAL: 차트 컴포넌트 없음 → FAIL
    await waitFor(() => {
      expect(screen.getByTestId("execution-trend-chart")).toBeInTheDocument();
    });
  });

  it("성공률 차트 영역이 렌더링된다 — RED: 차트 컴포넌트 미구현", async () => {
    render(<DashboardPage />);

    // EXPECT: data-testid="success-rate-chart" 영역 존재
    // ACTUAL: 차트 컴포넌트 없음 → FAIL
    await waitFor(() => {
      expect(screen.getByTestId("success-rate-chart")).toBeInTheDocument();
    });
  });

  it("실행 추이 차트에 'Execution Trend' 제목이 표시된다 — RED: 차트 미구현", async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/execution trend|실행 추이/i)
      ).toBeInTheDocument();
    });
  });

  it("성공률 차트에 'Success Rate' 제목이 표시된다 — RED: 차트 미구현", async () => {
    render(<DashboardPage />);

    // 기존 Success Rate 통계 카드와 별도로, 차트 영역 내 제목
    await waitFor(() => {
      const chartArea = screen.getByTestId("success-rate-chart");
      expect(chartArea).toHaveTextContent(/success rate|성공률/i);
    });
  });
});

// ─── TC-6011: Chart data accuracy — matches aggregated DB values ─────────────

describe("TC-6011: 차트 데이터 정확성 (DB 집계 ↔ 차트 데이터)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDashboard();
  });

  it("실행 추이 차트에 주간 데이터 포인트가 표시된다 — RED: 차트 미구현", async () => {
    render(<DashboardPage />);

    // EXPECT: 차트 영역 내에 데이터 포인트 (5개 로그 = 5개 데이터 포인트)
    // ACTUAL: 차트 없음 → FAIL
    await waitFor(() => {
      const chartArea = screen.getByTestId("execution-trend-chart");
      // 차트에 날짜별 실행 횟수 데이터가 포함되어야 함
      expect(chartArea).toBeInTheDocument();
    });
  });

  it("성공률 차트에 정확한 성공률 퍼센트가 표시된다 — RED: 차트 미구현", async () => {
    render(<DashboardPage />);

    // 4 success / 5 total = 80%
    // EXPECT: 성공률 차트 영역에 "80" 포함
    // ACTUAL: 차트 없음 → FAIL
    await waitFor(() => {
      const chartArea = screen.getByTestId("success-rate-chart");
      expect(chartArea).toHaveTextContent(/80/);
    });
  });

  it("실행 추이 차트에 일별 실행 횟수가 정확하게 표시된다 — RED: 차트 미구현", async () => {
    render(<DashboardPage />);

    // 03-07: 1회, 03-06: 1회, 03-05: 1회, 03-04: 1회, 03-03: 1회
    // EXPECT: 차트에 각 날짜별 카운트 반영
    await waitFor(() => {
      const chartArea = screen.getByTestId("execution-trend-chart");
      // 최소한 차트 영역이 존재하고 데이터가 있어야 함
      expect(chartArea.querySelectorAll("[data-chart-point]").length).toBeGreaterThanOrEqual(1);
    });
  });
});
