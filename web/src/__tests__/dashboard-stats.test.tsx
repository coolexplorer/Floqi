/**
 * Dashboard Statistics Tests — TC-6010, TC-6011
 * US-604: 대시보드 통계
 *
 * TC-6010 (E2E): 대시보드 통계 카드 표시
 *   - 활성 자동화 수 카드
 *   - 이번 주 실행 횟수 카드
 *   - 총 토큰 사용량 카드
 *   - 성공률 카드
 *   - 최근 자동화 위젯
 *   - 최근 실행 로그 위젯
 *
 * TC-6011 (Integration): 통계 데이터 정확성
 *   - DB 집계 결과와 UI 수치 일치
 *
 * FAILURES expected (Red phase):
 *   - DashboardPage는 스텁 텍스트만 렌더링 → 통계 카드 없음
 *   - stat-active-automations, stat-tokens-used, stat-success-rate, stat-execution-count
 *     data-testid가 없음
 *   - "Active Automations", "Tokens Used", "Success Rate" 등 텍스트 없음
 */

import { render, screen, waitFor } from "@testing-library/react";
import DashboardPage from "@/app/(dashboard)/dashboard/page";

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
  { id: "auto-3", name: "Reading Digest", status: "active" },
];

// 이번 주 실행 로그: 2 success + 1 error = 총 3개, 토큰 합계 2200
const recentExecutionLogs = [
  {
    id: "log-1",
    automation_id: "auto-1",
    automation_name: "Morning Briefing",
    status: "success",
    tokens_used: 1200,
    created_at: "2026-03-06T08:00:00Z",
  },
  {
    id: "log-2",
    automation_id: "auto-2",
    automation_name: "Email Triage",
    status: "success",
    tokens_used: 800,
    created_at: "2026-03-05T09:00:00Z",
  },
  {
    id: "log-3",
    automation_id: "auto-1",
    automation_name: "Morning Briefing",
    status: "error",
    tokens_used: 200,
    created_at: "2026-03-04T08:00:00Z",
  },
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
          count: 3,
        }),
      };
    }
    if (table === "execution_logs") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: recentExecutionLogs,
          error: null,
          count: 3,
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

// ─── TC-6010: 대시보드 통계 카드 표시 (E2E) ───────────────────────────────────

describe("TC-6010: 대시보드 통계 카드 표시", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDashboard();
  });

  it("활성 자동화 수 카드를 표시한다 — RED: 스텁 페이지에 통계 카드 없음", async () => {
    render(<DashboardPage />);

    // EXPECT: "Active Automations" 레이블이 있는 통계 카드
    // ACTUAL: 스텁 텍스트만 렌더링 → FAIL
    await waitFor(() => {
      expect(screen.getByText(/active automations/i)).toBeInTheDocument();
    });
  });

  it("이번 주 실행 횟수 카드를 표시한다 — RED: 실행 통계 없음", async () => {
    render(<DashboardPage />);

    // EXPECT: "Executions This Week" 또는 "Runs This Week" 레이블
    // ACTUAL: 없음 → FAIL
    await waitFor(() => {
      expect(
        screen.getByText(/executions this week|runs this week/i)
      ).toBeInTheDocument();
    });
  });

  it("총 토큰 사용량 카드를 표시한다 — RED: 토큰 통계 없음", async () => {
    render(<DashboardPage />);

    // EXPECT: "Tokens Used" 레이블이 있는 통계 카드
    // ACTUAL: 없음 → FAIL
    await waitFor(() => {
      expect(screen.getByText(/tokens used/i)).toBeInTheDocument();
    });
  });

  it("성공률 카드를 표시한다 — RED: 성공률 없음", async () => {
    render(<DashboardPage />);

    // EXPECT: "Success Rate" 레이블이 있는 통계 카드
    // ACTUAL: 없음 → FAIL
    await waitFor(() => {
      expect(screen.getByText(/success rate/i)).toBeInTheDocument();
    });
  });

  it("최근 자동화 위젯을 표시한다 — RED: 최근 자동화 목록 없음", async () => {
    render(<DashboardPage />);

    // EXPECT: "Recent Automations" 섹션 + 자동화 이름 목록
    // ACTUAL: 없음 → FAIL
    await waitFor(() => {
      expect(screen.getByText(/recent automations/i)).toBeInTheDocument();
    });

    // 자동화 이름들이 목록에 표시되어야 함
    expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    expect(screen.getByText("Email Triage")).toBeInTheDocument();
    expect(screen.getByText("Reading Digest")).toBeInTheDocument();
  });

  it("최근 실행 로그 위젯을 표시한다 — RED: 최근 로그 목록 없음", async () => {
    render(<DashboardPage />);

    // EXPECT: "Recent Executions" 또는 "Recent Logs" 섹션
    // ACTUAL: 없음 → FAIL
    await waitFor(() => {
      expect(
        screen.getByText(/recent executions|recent logs/i)
      ).toBeInTheDocument();
    });
  });
});

// ─── TC-6011: 통계 데이터 정확성 (Integration) ────────────────────────────────

describe("TC-6011: 통계 데이터 정확성 (DB 집계 결과 ↔ UI 수치 일치)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDashboard();
  });

  it("활성 자동화 수가 DB status=active 레코드 수와 일치한다 — RED: data-testid 없음", async () => {
    render(<DashboardPage />);

    // activeAutomations fixture: 3개
    // EXPECT: data-testid="stat-active-automations"인 요소가 "3" 표시
    // ACTUAL: 해당 요소 없음 → FAIL
    await waitFor(() => {
      const countEl = screen.getByTestId("stat-active-automations");
      expect(countEl).toHaveTextContent("3");
    });
  });

  it("총 토큰 사용량이 execution_logs.tokens_used 합계와 일치한다 — RED: data-testid 없음", async () => {
    render(<DashboardPage />);

    // 총 토큰: 1200 + 800 + 200 = 2200 → "2,200" 또는 "2200" 표시
    // EXPECT: data-testid="stat-tokens-used"인 요소가 "2,200" 표시
    // ACTUAL: 해당 요소 없음 → FAIL
    await waitFor(() => {
      const tokensEl = screen.getByTestId("stat-tokens-used");
      expect(tokensEl).toHaveTextContent(/2[,.]?200/);
    });
  });

  it("성공률이 (성공 횟수 / 전체 횟수)로 정확히 계산된다 — RED: data-testid 없음", async () => {
    render(<DashboardPage />);

    // 2 success / 3 total = 66.7%
    // EXPECT: data-testid="stat-success-rate"인 요소가 "66" 또는 "67" 포함
    // ACTUAL: 해당 요소 없음 → FAIL
    await waitFor(() => {
      const rateEl = screen.getByTestId("stat-success-rate");
      expect(rateEl).toHaveTextContent(/6[67]/);
    });
  });

  it("실행 횟수가 이번 주 execution_logs 레코드 수와 일치한다 — RED: data-testid 없음", async () => {
    render(<DashboardPage />);

    // recentExecutionLogs fixture: 3개
    // EXPECT: data-testid="stat-execution-count"인 요소가 "3" 표시
    // ACTUAL: 해당 요소 없음 → FAIL
    await waitFor(() => {
      const countEl = screen.getByTestId("stat-execution-count");
      expect(countEl).toHaveTextContent("3");
    });
  });

  it("인증되지 않은 사용자는 대시보드에 접근할 수 없다 — RED: 리다이렉트 미구현", async () => {
    // 인증 실패 시뮬레이션
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    render(<DashboardPage />);

    // EXPECT: /login으로 리다이렉트
    // ACTUAL: 스텁 페이지가 그대로 렌더링 → FAIL
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});
