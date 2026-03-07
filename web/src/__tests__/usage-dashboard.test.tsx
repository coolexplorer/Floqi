/**
 * Usage Dashboard Tests — TC-8006, TC-8007 (PM-11: 사용량 대시보드)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-8006: 사용량 섹션에 실행 횟수 progress bar, 토큰 수, % of limit 표시
 * TC-8007: 표시 데이터가 usage_tracking 테이블 값과 일치
 *
 * FAILURES expected (Red phase):
 * - UsageDashboard 컴포넌트 미구현 → import 에러
 * - usage_tracking 테이블 쿼리 미구현
 */

import { render, screen, waitFor } from "@testing-library/react";
import { UsageDashboard } from "@/components/billing/UsageDashboard";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

// ─── Test data ────────────────────────────────────────────────────────────────

const freeUsageData = {
  userId: "user-123",
  plan: "free" as const,
  monthlyExecutions: 12,
  monthlyExecutionLimit: 30,
  monthlyTokens: 15000,
  monthlyTokenLimit: 100000,
};

const proUsageData = {
  userId: "user-456",
  plan: "pro" as const,
  monthlyExecutions: 150,
  monthlyExecutionLimit: 500,
  monthlyTokens: 450000,
  monthlyTokenLimit: 2000000,
};

// ─── TC-8006: 사용량 섹션 UI 요소 ─────────────────────────────────────────────

describe("TC-8006: 사용량 섹션 UI 요소", () => {
  it("TC-8006: 월간 실행 횟수와 progress bar가 표시된다", () => {
    render(<UsageDashboard usage={freeUsageData} />);

    // 실행 횟수 표시: "12 / 30" 또는 "12 of 30"
    expect(
      screen.getByText(/12\s*\/\s*30|12\s*of\s*30/i)
    ).toBeInTheDocument();

    // Progress bar가 존재
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
  });

  it("TC-8006: 토큰 사용량이 표시된다", () => {
    render(<UsageDashboard usage={freeUsageData} />);

    // 토큰 수 표시: "15,000" 또는 "15000"
    expect(
      screen.getByText(/15[,.]?000/i)
    ).toBeInTheDocument();
  });

  it("TC-8006: 사용 비율(%)이 표시된다", () => {
    render(<UsageDashboard usage={freeUsageData} />);

    // 12 / 30 = 40%
    expect(
      screen.getByText(/40%/i)
    ).toBeInTheDocument();
  });

  it("TC-8006: progress bar의 값이 사용 비율과 일치한다", () => {
    render(<UsageDashboard usage={freeUsageData} />);

    const progressBar = screen.getByRole("progressbar");
    // aria-valuenow should be 40 (12/30 * 100)
    expect(progressBar).toHaveAttribute("aria-valuenow", "40");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });

  it("TC-8006: 사용량 섹션에 'Usage' 또는 '사용량' 제목이 있다", () => {
    render(<UsageDashboard usage={freeUsageData} />);

    expect(
      screen.getByText(/usage|사용량/i)
    ).toBeInTheDocument();
  });
});

// ─── TC-8007: 데이터가 usage_tracking 테이블 값과 일치 ────────────────────────

describe("TC-8007: 사용량 데이터 정확성", () => {
  it("TC-8007: Free 플랜 — 실행 횟수와 제한이 정확히 표시된다", () => {
    render(<UsageDashboard usage={freeUsageData} />);

    // 12 / 30 executions
    expect(screen.getByText(/12\s*\/\s*30|12\s*of\s*30/i)).toBeInTheDocument();
  });

  it("TC-8007: Pro 플랜 — 실행 횟수와 제한이 정확히 표시된다", () => {
    render(<UsageDashboard usage={proUsageData} />);

    // 150 / 500 executions
    expect(screen.getByText(/150\s*\/\s*500|150\s*of\s*500/i)).toBeInTheDocument();
  });

  it("TC-8007: Pro 플랜 — 사용 비율이 정확히 계산된다", () => {
    render(<UsageDashboard usage={proUsageData} />);

    // 150 / 500 = 30%
    expect(screen.getByText(/30%/i)).toBeInTheDocument();
  });

  it("TC-8007: Pro 플랜 — 토큰 사용량이 정확히 표시된다", () => {
    render(<UsageDashboard usage={proUsageData} />);

    // 450,000 tokens
    expect(screen.getByText(/450[,.]?000/i)).toBeInTheDocument();
  });

  it("TC-8007: data-testid='usage-executions'로 실행 횟수 영역을 식별할 수 있다", () => {
    render(<UsageDashboard usage={freeUsageData} />);

    const execSection = screen.getByTestId("usage-executions");
    expect(execSection).toBeInTheDocument();
    expect(execSection).toHaveTextContent(/12/);
  });

  it("TC-8007: data-testid='usage-tokens'로 토큰 사용량 영역을 식별할 수 있다", () => {
    render(<UsageDashboard usage={freeUsageData} />);

    const tokenSection = screen.getByTestId("usage-tokens");
    expect(tokenSection).toBeInTheDocument();
    expect(tokenSection).toHaveTextContent(/15[,.]?000/);
  });
});
