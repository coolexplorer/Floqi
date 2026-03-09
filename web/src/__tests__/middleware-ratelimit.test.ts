/**
 * Rate Limiting Middleware Tests — PM-14
 * TDD Red Phase: These tests FAIL until rate limiting is implemented in middleware.
 *
 * Tests validate:
 * - Normal request includes X-RateLimit-Limit and X-RateLimit-Remaining headers
 * - General API limit exceeded → 429 + Retry-After header
 * - Webhook endpoints have stricter (10 req/min) separate limits
 * - /api/auth/* endpoints are excluded from rate limiting
 * - X-Forwarded-For header used for IP extraction
 *
 * Rate Limiting Requirements:
 * - /api/webhooks/*: 10 req/min per IP
 * - /api/*: 60 req/min per IP
 * - /api/auth/*: excluded from rate limiting
 * - Uses Upstash Redis sliding window
 */

import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

// Mock Supabase SSR to avoid auth issues in middleware tests
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      }),
    },
  })),
}));

// Mock Redis / rate limiter
const mockRatelimit = vi.fn();
vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: mockRatelimit,
}));

// Helper: build a NextRequest for a given path
function buildRequest(
  path: string,
  options: { ip?: string; forwardedFor?: string } = {}
): NextRequest {
  const url = new URL(path, "http://localhost");
  const headers = new Headers();
  if (options.forwardedFor) {
    headers.set("x-forwarded-for", options.forwardedFor);
  }
  const request = new NextRequest(url.toString(), { headers });
  if (options.ip) {
    Object.defineProperty(request, "ip", { value: options.ip });
  }
  return request;
}

describe("Rate Limiting Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: within rate limit
    mockRatelimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 59,
      reset: Date.now() + 60000,
    });
  });

  // TC: Normal request includes rate limit headers
  it("normal API request includes X-RateLimit-Limit and X-RateLimit-Remaining headers", async () => {
    mockRatelimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 55,
      reset: Date.now() + 60000,
    });

    const request = buildRequest("/api/automations", { ip: "1.2.3.4" });
    const response = await middleware(request);

    expect(response.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("55");
  });

  // TC: General API limit exceeded → 429 + Retry-After
  it("general API limit exceeded → 429 status + Retry-After header", async () => {
    const resetTime = Date.now() + 30000;
    mockRatelimit.mockResolvedValue({
      success: false,
      limit: 60,
      remaining: 0,
      reset: resetTime,
    });

    const request = buildRequest("/api/automations", { ip: "1.2.3.4" });
    const response = await middleware(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });

  // TC: Webhook endpoints have stricter limits (10 req/min)
  it("webhook endpoint uses stricter rate limit (10 req/min)", async () => {
    const request = buildRequest("/api/webhooks/automation-run", {
      ip: "1.2.3.4",
    });
    await middleware(request);

    // checkRateLimit should be called with webhook-specific limit
    expect(mockRatelimit).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
      })
    );
  });

  // TC: /api/auth/callback/* excluded from rate limiting (OAuth provider callbacks)
  it("/api/auth/callback/* endpoints are excluded from rate limiting", async () => {
    const request = buildRequest("/api/auth/callback/google", {
      ip: "1.2.3.4",
    });
    const response = await middleware(request);

    // Rate limiter should NOT be called for auth callback endpoints
    expect(mockRatelimit).not.toHaveBeenCalled();

    // Response should proceed normally (not 429)
    expect(response.status).not.toBe(429);
  });

  // TC: /api/auth/connect/* endpoints ARE rate limited (10 req/min)
  it("/api/auth/connect/* endpoints are rate limited at 10 req/min", async () => {
    const request = buildRequest("/api/auth/connect/google", {
      ip: "1.2.3.4",
    });
    await middleware(request);

    // Rate limiter should be called with auth-specific limit
    expect(mockRatelimit).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 10,
      })
    );
  });

  // TC: X-Forwarded-For used for IP extraction
  it("extracts real IP from X-Forwarded-For header", async () => {
    const request = buildRequest("/api/automations", {
      forwardedFor: "203.0.113.50, 70.41.3.18",
    });
    await middleware(request);

    // checkRateLimit should use the first IP from X-Forwarded-For
    expect(mockRatelimit).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: "203.0.113.50",
      })
    );
  });

  // TC: Webhook limit exceeded → 429
  it("webhook endpoint limit exceeded → 429 status", async () => {
    mockRatelimit.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const request = buildRequest("/api/webhooks/automation-run", {
      ip: "1.2.3.4",
    });
    const response = await middleware(request);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBeTruthy();
  });

  // Boundary: exactly at limit (count === limit, remaining = 0, success = true)
  it("request at exact rate limit boundary → succeeds with remaining=0", async () => {
    mockRatelimit.mockResolvedValue({
      success: true,
      limit: 60,
      remaining: 0,
      reset: Date.now() + 60000,
    });

    const request = buildRequest("/api/automations", { ip: "1.2.3.4" });
    const response = await middleware(request);

    expect(response.status).not.toBe(429);
    expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  // IP fallback when x-forwarded-for is absent
  it("missing x-forwarded-for → falls back to 127.0.0.1", async () => {
    const request = buildRequest("/api/automations");
    await middleware(request);

    expect(mockRatelimit).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: "127.0.0.1",
      })
    );
  });
});
