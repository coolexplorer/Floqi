/**
 * Settings Billing Section Tests — TC-8001, TC-8002 (PM-09: 결제/플랜 설정)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-8001: Free 사용자 → "Current Plan: Free" + 30 executions/month 제한 + "Upgrade to Pro" 버튼
 * TC-8002: Pro 사용자 → "Current Plan: Pro" + 500 executions/month 제한 + "Manage Plan" 버튼
 *
 * FAILURES expected (Red phase):
 * - Settings 페이지에 Billing 섹션 미구현 → 요소 찾기 실패
 * - plan 관련 데이터 미로드 → 플랜 이름/제한 표시 없음
 */

import { render, screen, waitFor } from "@testing-library/react";
import SettingsPage from "@/app/(dashboard)/settings/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      upsert: mockUpsert,
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockSingle,
    }),
  }),
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn().mockResolvedValue("encrypted:value"),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  display_name: string;
  timezone: string;
  preferred_language: string;
  llm_provider: string;
  plan: string;
}

function setupUser(overrides: Partial<Profile> = {}) {
  const profile: Profile = {
    id: "user-123",
    display_name: "Test User",
    timezone: "UTC",
    preferred_language: "en",
    llm_provider: "managed",
    plan: "free",
    ...overrides,
  };

  mockGetUser.mockResolvedValue({
    data: { user: { id: profile.id } },
    error: null,
  });

  mockSingle.mockResolvedValue({ data: profile, error: null });
  mockEq.mockReturnValue({ single: mockSingle, maybeSingle: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockUpsert.mockResolvedValue({ error: null });

  return profile;
}

// ─── TC-8001: Free 사용자 Billing 섹션 ────────────────────────────────────────

describe("TC-8001: Free 사용자 Billing 섹션", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ plan: "free" });
  });

  it("TC-8001: Settings 페이지에 Billing 섹션이 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /billing|결제|플랜/i })
      ).toBeInTheDocument();
    });
  });

  it("TC-8001: Free 사용자에게 'Current Plan: Free' 텍스트가 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/current plan.*free|현재 플랜.*free/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-8001: Free 플랜 제한이 30 executions/month로 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/30.*executions|30.*실행/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-8001: 'Upgrade to Pro' 버튼이 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /upgrade to pro|프로.*업그레이드/i })
      ).toBeInTheDocument();
    });
  });
});

// ─── TC-8002: Pro 사용자 Billing 섹션 ─────────────────────────────────────────

describe("TC-8002: Pro 사용자 Billing 섹션", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ plan: "pro" });
  });

  it("TC-8002: Pro 사용자에게 'Current Plan: Pro' 텍스트가 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/current plan.*pro|현재 플랜.*pro/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-8002: Pro 플랜 제한이 500 executions/month로 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/500.*executions|500.*실행/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-8002: 'Manage Plan' 버튼이 표시된다 (Upgrade 대신)", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /manage plan|플랜 관리/i })
      ).toBeInTheDocument();
    });

    // Upgrade 버튼은 표시되지 않아야 함
    expect(
      screen.queryByRole("button", { name: /upgrade to pro/i })
    ).not.toBeInTheDocument();
  });
});
