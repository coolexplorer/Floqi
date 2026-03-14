/**
 * Middleware Onboarding Redirect Tests (P0-1: DB 쿼리 제거 → 쿠키 기반 전환)
 * TDD Red Phase — 쿠키 기반 구현 전 실패하는 테스트
 *
 * - 인증된 사용자 + onboarding_completed 쿠키 없음 → /dashboard 접근 시 /onboarding으로 리다이렉트
 * - 인증된 사용자 + onboarding_completed=true 쿠키 → /dashboard 정상 접근
 * - 미인증 사용자 → /login으로 리다이렉트 (기존 동작 유지)
 * - 인증된 사용자 + onboarding_completed=true 쿠키 → /onboarding 접근 시 /dashboard로 리다이렉트
 * - middleware에서 supabase.from() 호출 없음 (DB 쿼리 완전 제거 검증)
 *
 * FAILURES expected (Red phase):
 * - middleware가 쿠키 대신 DB 쿼리로 onboarding_completed를 확인 → 쿠키 기반 동작 불일치
 */

import { NextRequest, NextResponse } from "next/server";
import { middleware } from "@/middleware";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockFrom = vi.fn(); // spy: 호출 여부 확인용 (새 구현에서는 호출되면 안 됨)

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

function createRequest(
  pathname: string,
  cookies: Record<string, string> = {}
): NextRequest {
  const url = new URL(pathname, "http://localhost:3000");
  const cookieEntries = Object.entries(cookies);
  const cookieHeader = cookieEntries
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const headers = new Headers({ "x-forwarded-for": "127.0.0.1" });
  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  return new NextRequest(url, { headers });
}

function setupAuthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-123" } },
    error: null,
  });
}

function setupUnauthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Middleware: 온보딩 리다이렉트 (쿠키 기반)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to /onboarding when authenticated and onboarding_completed cookie is absent", async () => {
    setupAuthenticatedUser();

    // 쿠키 없음 = 온보딩 미완료로 간주
    const request = createRequest("/dashboard");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/onboarding");
  });

  it("should redirect to /onboarding when authenticated and onboarding_completed cookie is absent for nested dashboard path", async () => {
    setupAuthenticatedUser();

    const request = createRequest("/dashboard/settings");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/onboarding");
  });

  it("should allow /dashboard access when authenticated and onboarding_completed cookie is true", async () => {
    setupAuthenticatedUser();

    // 쿠키 onboarding_completed=true → 온보딩 완료 상태
    const request = createRequest("/dashboard", {
      onboarding_completed: "true",
    });
    const response = await middleware(request);

    // 리다이렉트 없음 — NextResponse.next() 반환
    expect(response.status).not.toBe(307);
    expect(response.headers.get("location")).toBeNull();
  });

  it("should redirect to /login when unauthenticated and accessing /dashboard", async () => {
    setupUnauthenticatedUser();

    const request = createRequest("/dashboard");
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("should redirect to /dashboard when authenticated and onboarding_completed cookie is true on /onboarding", async () => {
    setupAuthenticatedUser();

    // 온보딩 완료 후 /onboarding 직접 접근 → /dashboard로 리다이렉트
    const request = createRequest("/onboarding", {
      onboarding_completed: "true",
    });
    const response = await middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("should not call supabase.from() to verify DB query is completely removed", async () => {
    setupAuthenticatedUser();

    // cookie=true인 경우에도 DB 쿼리 없어야 함
    const request = createRequest("/dashboard", {
      onboarding_completed: "true",
    });
    await middleware(request);

    // 새 구현에서는 DB 쿼리 미사용 — from()이 호출되면 안 됨
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
