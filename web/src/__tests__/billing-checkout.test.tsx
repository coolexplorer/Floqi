/**
 * Billing Checkout Tests — TC-8003, TC-8004, TC-8005 (PM-10: Stripe 결제)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-8003: "Upgrade to Pro" 클릭 → /api/billing/checkout 호출 → Stripe URL로 리다이렉트
 * TC-8004: POST /api/billing/webhook (checkout.session.completed) → 플랜 'pro' 업데이트
 * TC-8005: Stripe 결제 실패 → 플랜 unchanged, 에러 표시
 *
 * FAILURES expected (Red phase):
 * - /api/billing/checkout API 라우트 미구현
 * - /api/billing/webhook API 라우트 미구현
 * - Billing 섹션 UI 미구현
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

function setupFreeUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
    error: null,
  });

  const profile = {
    id: "user-123",
    display_name: "Test User",
    timezone: "UTC",
    preferred_language: "en",
    llm_provider: "managed",
    plan: "free",
  };

  mockSingle.mockResolvedValue({ data: profile, error: null });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockUpsert.mockResolvedValue({ error: null });

  return profile;
}

// ─── TC-8003: Upgrade to Pro → Stripe Checkout ────────────────────────────────

describe("TC-8003: Upgrade to Pro → Stripe Checkout 리다이렉트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFreeUser();
  });

  it("TC-8003: 'Upgrade to Pro' 클릭 → /api/billing/checkout POST 호출", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/session-123" }),
    });
    global.fetch = mockFetch;

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /upgrade to pro/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /upgrade to pro/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/billing/checkout",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("TC-8003: checkout API 성공 → Stripe URL로 리다이렉트", async () => {
    const stripeUrl = "https://checkout.stripe.com/session-123";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ url: stripeUrl }),
    });

    // Mock window.location.href assignment
    const locationAssignMock = vi.fn();
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, assign: locationAssignMock, href: "" },
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /upgrade to pro/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /upgrade to pro/i })
    );

    await waitFor(() => {
      // Either assign or href should be set to the Stripe URL
      const redirected =
        locationAssignMock.mock.calls.some(
          (call: string[]) => call[0] === stripeUrl
        ) || window.location.href === stripeUrl;
      expect(redirected).toBe(true);
    });
  });
});

// ─── TC-8004: Webhook checkout.session.completed ──────────────────────────────

describe("TC-8004: Stripe Webhook → 플랜 업데이트", () => {
  it("TC-8004: POST /api/billing/webhook (checkout.session.completed) → 플랜 'pro' 업데이트", async () => {
    // This test validates the webhook API route handler
    // Import the route handler directly
    let POST: (req: Request) => Promise<Response>;
    try {
      const mod = await import("@/app/api/billing/webhook/route");
      POST = mod.POST;
    } catch {
      // RED: route doesn't exist yet — test fails at import
      throw new Error(
        "RED: /api/billing/webhook/route.ts does not exist yet"
      );
    }

    const webhookPayload = {
      type: "checkout.session.completed",
      data: {
        object: {
          client_reference_id: "user-123",
          subscription: "sub_abc123",
        },
      },
    };

    const request = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookPayload),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});

// ─── TC-8005: Stripe 결제 실패 ────────────────────────────────────────────────

describe("TC-8005: Stripe 결제 실패 → 플랜 unchanged, 에러 표시", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFreeUser();
  });

  it("TC-8005: checkout API 실패 → 에러 메시지 표시", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Payment failed" }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /upgrade to pro/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /upgrade to pro/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/payment failed|결제.*실패|error|오류/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-8005: 결제 실패 후 플랜이 'free'로 유지된다", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Payment failed" }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /upgrade to pro/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /upgrade to pro/i })
    );

    // Plan should still show "Free" after failed payment
    await waitFor(() => {
      expect(
        screen.getByText(/current plan.*free|현재 플랜.*free/i)
      ).toBeInTheDocument();
    });
  });
});
