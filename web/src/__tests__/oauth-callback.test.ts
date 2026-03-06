/**
 * Google OAuth Callback API Route Tests — TC-2002
 * TDD Red Phase: These tests FAIL until the callback route is implemented.
 *
 * Tests validate:
 * - TC-2002: Valid code → exchange for tokens → encrypt → store in connected_services
 * - Edge case: invalid/expired code → 400 error response
 * - Edge case: missing state parameter → 400 CSRF error
 * - Edge case: state mismatch → 400 CSRF error
 */

import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/connect/google/callback/route";

// Mock crypto module (AES-256-GCM encryption)
const mockEncrypt = vi.fn();
vi.mock("@/lib/crypto", () => ({
  encrypt: mockEncrypt,
}));

// Mock Supabase server client
const mockUpsert = vi.fn();
const mockEq = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// Mock Google OAuth token exchange
const mockGetToken = vi.fn();
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({
    getToken: mockGetToken,
    setCredentials: vi.fn(),
  })),
}));

// Helper: build a NextRequest with query params
function buildRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost/api/auth/connect/google/callback");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url.toString());
}

describe("GET /api/auth/connect/google/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockEncrypt.mockImplementation((v: string) =>
      Promise.resolve(`encrypted:${v}`)
    );
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  it("TC-2002: valid code + state → exchanges token → encrypts → stores in connected_services", async () => {
    // Arrange
    const validState = "csrf-token-abc";
    const mockTokens = {
      access_token: "access-token-xyz",
      refresh_token: "refresh-token-xyz",
      expiry_date: Date.now() + 3600000,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
    };

    mockGetToken.mockResolvedValueOnce({ tokens: mockTokens });

    // State stored in cookie/session
    const request = buildRequest({ code: "valid-auth-code", state: validState });
    // Attach state cookie to simulate CSRF check
    Object.defineProperty(request, "cookies", {
      value: {
        get: (name: string) =>
          name === "oauth_state" ? { value: validState } : undefined,
      },
    });

    // Act
    const response = await GET(request);

    // Assert — token was exchanged
    expect(mockGetToken).toHaveBeenCalledWith("valid-auth-code");

    // Assert — tokens were encrypted
    expect(mockEncrypt).toHaveBeenCalledWith(mockTokens.access_token);
    expect(mockEncrypt).toHaveBeenCalledWith(mockTokens.refresh_token);

    // Assert — stored in connected_services
    expect(mockFrom).toHaveBeenCalledWith("connected_services");

    // Assert — redirect to /connections on success
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(/\/connections/);
  });

  it("TC-2002 (invalid code): Google rejects code → returns 400 error", async () => {
    // Arrange
    mockGetToken.mockRejectedValueOnce(new Error("invalid_grant"));

    const request = buildRequest({ code: "invalid-code", state: "csrf-token" });
    Object.defineProperty(request, "cookies", {
      value: {
        get: (name: string) =>
          name === "oauth_state" ? { value: "csrf-token" } : undefined,
      },
    });

    // Act
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/invalid.*code|oauth.*failed|token.*exchange/i);
  });

  it("Edge case: missing code parameter → 400 bad request", async () => {
    // Arrange
    const request = buildRequest({ state: "csrf-token" }); // no code
    Object.defineProperty(request, "cookies", {
      value: {
        get: (name: string) =>
          name === "oauth_state" ? { value: "csrf-token" } : undefined,
      },
    });

    // Act
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/missing.*code|code.*required/i);
  });

  it("Edge case: missing state parameter → 400 CSRF error", async () => {
    // Arrange
    const request = buildRequest({ code: "some-code" }); // no state
    Object.defineProperty(request, "cookies", {
      value: {
        get: (name: string) =>
          name === "oauth_state" ? { value: "csrf-token" } : undefined,
      },
    });

    // Act
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/missing.*state|csrf|state.*required/i);
  });

  it("Edge case: state mismatch → 400 CSRF validation failure", async () => {
    // Arrange
    const request = buildRequest({
      code: "some-code",
      state: "tampered-state",
    });
    Object.defineProperty(request, "cookies", {
      value: {
        get: (name: string) =>
          name === "oauth_state" ? { value: "original-state" } : undefined,
      },
    });

    // Act
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/csrf|state.*mismatch|invalid.*state/i);
  });

  it("Edge case: unauthenticated user → 401 unauthorized", async () => {
    // Arrange
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });
    mockGetToken.mockResolvedValueOnce({
      tokens: { access_token: "token", refresh_token: "refresh" },
    });

    const request = buildRequest({ code: "valid-code", state: "csrf-token" });
    Object.defineProperty(request, "cookies", {
      value: {
        get: (name: string) =>
          name === "oauth_state" ? { value: "csrf-token" } : undefined,
      },
    });

    // Act
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(401);
  });
});
