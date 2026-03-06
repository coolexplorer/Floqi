/**
 * Google OAuth Connect Route Tests
 *
 * Tests validate:
 * - GET → 302 redirect to Google OAuth consent URL
 * - oauth_state cookie is set with correct security attributes
 * - State parameter in redirect URL is a 64-char hex string
 * - State in URL matches oauth_state cookie value
 */

import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/connect/google/route";

const mockGenerateAuthUrl = vi.fn();
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
  })),
}));

describe("GET /api/auth/connect/google", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-secret",
    };
    mockGenerateAuthUrl.mockImplementation(
      (opts: { state: string; [key: string]: unknown }) =>
        `https://accounts.google.com/o/oauth2/auth?state=${opts.state}&client_id=test-client-id`
    );
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("GET → 302 redirect to Google OAuth consent", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/connect/google"
    );
    const response = await GET(request);

    // NextResponse.redirect() defaults to 307 (temporary redirect)
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("accounts.google.com");
  });

  it("oauth_state cookie is set with HttpOnly, SameSite=Lax, Max-Age=600", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/connect/google"
    );
    const response = await GET(request);

    const setCookie = response.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("oauth_state=");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).toContain("Max-Age=600");
  });

  it("state parameter in redirect URL is a 64-char hex string", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/connect/google"
    );
    const response = await GET(request);

    const location = response.headers.get("location")!;
    const state = new URL(location).searchParams.get("state");
    expect(state).toMatch(/^[a-f0-9]{64}$/);
  });

  it("state in redirect URL matches oauth_state cookie value", async () => {
    const request = new NextRequest(
      "http://localhost/api/auth/connect/google"
    );
    const response = await GET(request);

    const location = response.headers.get("location")!;
    const urlState = new URL(location).searchParams.get("state");

    const setCookie = response.headers.get("set-cookie")!;
    const cookieValue = setCookie.match(/oauth_state=([^;]+)/)?.[1];

    expect(urlState).toBe(cookieValue);
  });
});
