/**
 * Notion OAuth Connect Route Tests — PM-02
 * TDD Red Phase: These tests FAIL until the connect route is implemented.
 *
 * Tests validate:
 * - GET → 307 redirect to Notion OAuth authorization URL
 * - oauth_state cookie is set with correct security attributes
 * - owner=user parameter included (Notion OAuth requirement)
 * - state parameter in redirect URL is a 64-char hex string
 */

import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/connect/notion/route";

describe("GET /api/auth/connect/notion", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NOTION_CLIENT_ID: "test-notion-client-id",
      NOTION_CLIENT_SECRET: "test-notion-secret",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  // TC: CSRF state cookie set and redirect to Notion OAuth URL
  it("GET → 307 redirect to Notion OAuth consent URL", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/connect/notion"
    );
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("api.notion.com/v1/oauth/authorize");
  });

  // TC: owner=user parameter included (Notion OAuth requirement)
  it("redirect URL includes owner=user parameter", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/connect/notion"
    );
    const response = await GET(request);

    const location = response.headers.get("location")!;
    const url = new URL(location);
    expect(url.searchParams.get("owner")).toBe("user");
  });

  // TC: state parameter in redirect URL is a 64-char hex string
  it("state parameter in redirect URL is a 64-char hex string", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/connect/notion"
    );
    const response = await GET(request);

    const location = response.headers.get("location")!;
    const state = new URL(location).searchParams.get("state");
    expect(state).toMatch(/^[a-f0-9]{64}$/);
  });

  // TC: oauth_state cookie is set with HttpOnly, SameSite=Lax, Max-Age=600
  it("oauth_state cookie is set with HttpOnly, SameSite=Lax, Max-Age=600", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/connect/notion"
    );
    const response = await GET(request);

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("oauth_state=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toContain("Max-Age=600");
  });

  // TC: state in redirect URL matches oauth_state cookie value
  it("state in redirect URL matches oauth_state cookie value", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/connect/notion"
    );
    const response = await GET(request);

    const location = response.headers.get("location")!;
    const urlState = new URL(location).searchParams.get("state");

    const setCookie = response.headers.get("set-cookie")!;
    const cookieValue = setCookie.match(/oauth_state=([^;]+)/)?.[1];

    expect(urlState).toBe(cookieValue);
  });
});
