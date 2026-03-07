/**
 * Landing Page Pricing Section Test — TC-9006 (PM-13: 랜딩 페이지 가격표)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-9006: 랜딩 페이지에 Pricing 섹션이 있고, Free/Pro/BYOK 3개 플랜 비교 테이블 표시
 *
 * FAILURES expected (Red phase):
 * - 랜딩 페이지에 Pricing 섹션 미구현 → 요소 찾기 실패
 */

import { render, screen } from "@testing-library/react";
import LandingPage from "@/app/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  redirect: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
    },
  }),
}));

// ─── TC-9006: Pricing 섹션 ────────────────────────────────────────────────────

describe("TC-9006: 랜딩 페이지 Pricing 섹션", () => {
  it("TC-9006: 랜딩 페이지에 'Pricing' 섹션 제목이 있다", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", { name: /pricing|가격|요금/i })
    ).toBeInTheDocument();
  });

  it("TC-9006: Free 플랜 카드가 표시된다", () => {
    render(<LandingPage />);

    // Free plan with $0 price
    expect(screen.getByText(/free/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0|무료/i)).toBeInTheDocument();
  });

  it("TC-9006: Pro 플랜 카드가 표시된다", () => {
    render(<LandingPage />);

    expect(screen.getByText(/^pro$/i)).toBeInTheDocument();
  });

  it("TC-9006: BYOK 플랜 카드가 표시된다", () => {
    render(<LandingPage />);

    expect(screen.getByText(/byok|bring your own key/i)).toBeInTheDocument();
  });

  it("TC-9006: 3개 플랜 카드가 모두 표시된다", () => {
    render(<LandingPage />);

    // PricingTable uses role="list" with aria-label="Pricing plans"
    const pricingList = screen.getByRole("list", { name: /pricing plans/i });
    expect(pricingList).toBeInTheDocument();

    const planCards = screen.getAllByRole("listitem");
    // Filter to pricing plan cards (at least 3)
    expect(
      planCards.filter((card) =>
        card.closest("[aria-label='Pricing plans']")
      ).length
    ).toBeGreaterThanOrEqual(3);
  });

  it("TC-9006: Pricing 섹션에 data-testid='pricing-section'이 있다", () => {
    render(<LandingPage />);

    expect(screen.getByTestId("pricing-section")).toBeInTheDocument();
  });

  it("TC-9006: Free 플랜에 30 executions/month 제한이 표시된다", () => {
    render(<LandingPage />);

    expect(screen.getByText(/30.*executions|30.*실행/i)).toBeInTheDocument();
  });

  it("TC-9006: Pro 플랜에 500 executions/month 제한이 표시된다", () => {
    render(<LandingPage />);

    expect(screen.getByText(/500.*executions|500.*실행/i)).toBeInTheDocument();
  });
});
