/**
 * Middleware Onboarding Redirect Tests (PM-01: 온보딩 플로우)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * - 인증된 사용자 + onboarding_completed=false → /dashboard 접근 시 /onboarding으로 리다이렉트
 * - 인증된 사용자 + onboarding_completed=true → /dashboard 정상 접근
 * - 미인증 사용자 → /login으로 리다이렉트 (기존 동작 유지)
 *
 * FAILURES expected (Red phase):
 * - middleware에 onboarding 리다이렉트 로직 미구현 → 리다이렉트 안 됨
 */

import { NextRequest, NextResponse } from "next/server";
import { middleware } from "@/middleware";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 60,
    remaining: 59,
    reset: Date.now() + 60000,
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createRequest(pathname: string): NextRequest {
  const url = new URL(pathname, "http://localhost:3000");
  return new NextRequest(url, {
    headers: new Headers({ "x-forwarded-for": "127.0.0.1" }),
  });
}

function setupAuthenticatedUser(onboarding_completed: boolean) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
    error: null,
  });

  // Chain: from('profiles').select('onboarding_completed').eq('id', userId).single()
  mockSingle.mockResolvedValue({
    data: { onboarding_completed },
    error: null,
  });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
}

function setupUnauthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Middleware: 온보딩 리다이렉트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("인증된 사용자 + onboarding_completed=false → /dashboard 접근 시 /onboarding으로 리다이렉트", async () => {
    setupAuthenticatedUser(false);

    const request = createRequest("/dashboard");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/onboarding");
  });

  it("인증된 사용자 + onboarding_completed=false → /dashboard/settings 접근 시도 /onboarding으로 리다이렉트", async () => {
    setupAuthenticatedUser(false);

    const request = createRequest("/dashboard/settings");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/onboarding");
  });

  it("인증된 사용자 + onboarding_completed=true → /dashboard 정상 접근 (리다이렉트 없음)", async () => {
    setupAuthenticatedUser(true);

    const request = createRequest("/dashboard");
    const response = await middleware(request);

    // Should NOT redirect — status is 200 (NextResponse.next())
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it("미인증 사용자 → /dashboard 접근 시 /login으로 리다이렉트 (기존 동작 유지)", async () => {
    setupUnauthenticatedUser();

    const request = createRequest("/dashboard");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("인증된 사용자 + onboarding_completed=true → /onboarding 접근 시 /dashboard로 리다이렉트", async () => {
    setupAuthenticatedUser(true);

    const request = createRequest("/onboarding");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });
});
