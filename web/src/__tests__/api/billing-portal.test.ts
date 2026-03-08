/**
 * API Route Tests — POST /api/billing/portal
 *
 * Tests validate:
 * - Unauthenticated request → 401
 * - No stripe_customer_id → 400
 * - Successful portal session → 200 with { url: ... }
 * - Stripe error → 500
 */

import { POST } from "@/app/api/billing/portal/route";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockSingle,
  mockEq,
  mockSelect,
  mockFrom,
  mockStripePortalCreate,
} = vi.hoisted(() => {
  const mockStripePortalCreate = vi.fn();
  const mockSingle = vi.fn();
  const mockEq = vi.fn(() => ({ single: mockSingle }));
  const mockSelect = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  const mockGetUser = vi.fn();

  return {
    mockGetUser,
    mockSingle,
    mockEq,
    mockSelect,
    mockFrom,
    mockStripePortalCreate,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: () => ({
    billingPortal: {
      sessions: {
        create: mockStripePortalCreate,
      },
    },
  }),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/billing/portal", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_APP_URL: "https://app.floqi.io",
    };
    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    // Default: profile has stripe_customer_id
    mockSingle.mockResolvedValue({
      data: { stripe_customer_id: "cus_test123" },
      error: null,
    });
    // Default: Stripe portal session created successfully
    mockStripePortalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/p/session_test123",
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // TC: Unauthenticated request → 401
  it("unauthenticated request → 401 Unauthorized", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const response = await POST();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  // TC: No stripe_customer_id → 400
  it("profile missing stripe_customer_id → 400 Bad Request", async () => {
    mockSingle.mockResolvedValueOnce({
      data: { stripe_customer_id: null },
      error: null,
    });

    const response = await POST();

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  // TC: Profile not found → 400
  it("profile not found → 400 Bad Request", async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const response = await POST();

    expect(response.status).toBe(400);
  });

  // TC: Successful portal session → 200 with { url: ... }
  it("authenticated user with stripe_customer_id → 200 with portal URL", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("url");
    expect(body.url).toBe("https://billing.stripe.com/p/session_test123");
  });

  // TC: Stripe portal create called with correct params
  it("creates Stripe portal session with correct customer id", async () => {
    await POST();

    expect(mockStripePortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: "cus_test123",
      })
    );
  });

  // TC: Stripe error → 500
  it("Stripe sessions.create throws error → 500 Internal Server Error", async () => {
    mockStripePortalCreate.mockRejectedValueOnce(new Error("Stripe API error"));

    const response = await POST();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});
