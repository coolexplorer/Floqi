/**
 * Billing Portal Tests — PM-19: Stripe Customer Portal (Billing History)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * Test: Pro user clicking "Manage Plan" → POST /api/billing/portal → redirect to Stripe portal URL
 *
 * FAILURES expected (Red phase):
 * - "Manage Plan" 버튼 클릭 시 /api/billing/portal 호출 미구현
 * - Stripe Customer Portal URL로 리다이렉트 미구현
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    }),
  }),
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn().mockResolvedValue("encrypted:value"),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupProUser() {
  const profile = {
    id: "user-123",
    display_name: "Pro User",
    timezone: "UTC",
    preferred_language: "en",
    llm_provider: "managed",
    plan: "pro",
  };

  mockGetUser.mockResolvedValue({
    data: { user: { id: profile.id } },
    error: null,
  });

  mockSingle.mockResolvedValue({ data: profile, error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockUpsert.mockResolvedValue({ error: null });

  return profile;
}

// ─── PM-19: Manage Plan → Stripe Customer Portal ────────────────────────────

describe("PM-19: Pro 사용자 Manage Plan → Stripe Customer Portal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupProUser();
  });

  it("Pro 사용자에게 'Manage Plan' 버튼이 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /manage plan|플랜 관리/i })
      ).toBeInTheDocument();
    });
  });

  it("Manage Plan 클릭 시 POST /api/billing/portal 호출 — RED: portal API 미구현", async () => {
    const portalUrl = "https://billing.stripe.com/p/session_test123";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: portalUrl }),
    });
    global.fetch = mockFetch;

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /manage plan|플랜 관리/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /manage plan|플랜 관리/i })
    );

    // EXPECT: POST /api/billing/portal 호출
    // ACTUAL: Manage Plan 버튼에 onClick 핸들러 없음 → FAIL
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/billing/portal",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("Portal API 성공 → Stripe Portal URL로 리다이렉트 — RED: 리다이렉트 미구현", async () => {
    const portalUrl = "https://billing.stripe.com/p/session_test123";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: portalUrl }),
    });

    // Mock window.location.href
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "" },
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /manage plan|플랜 관리/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /manage plan|플랜 관리/i })
    );

    // EXPECT: window.location.href가 Stripe portal URL로 설정
    await waitFor(() => {
      expect(window.location.href).toBe(portalUrl);
    });

    // Restore
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("Portal API 실패 시 에러 메시지 표시 — RED: 에러 처리 미구현", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to create portal session" }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /manage plan|플랜 관리/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /manage plan|플랜 관리/i })
    );

    // EXPECT: 에러 메시지 표시
    await waitFor(() => {
      expect(
        screen.getByText(/failed|실패|error|오류/i)
      ).toBeInTheDocument();
    });
  });
});
