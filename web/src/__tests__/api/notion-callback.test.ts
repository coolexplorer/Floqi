/**
 * Notion OAuth Callback Route Tests — PM-02
 * TDD Red Phase: These tests FAIL until the callback route is implemented.
 *
 * Tests validate:
 * - Success: code + valid state → Notion token exchange → encrypt → store → redirect /connections
 * - Missing code → 400
 * - State mismatch → 400 (CSRF)
 * - Unauthenticated user → 401
 * - Notion token exchange failure → 400
 * - DB upsert failure → 500
 * - connected_services upsert includes service_name: 'notion', encrypted_access_token
 *
 * Notion OAuth specifics:
 * - Token URL: https://api.notion.com/v1/oauth/token (HTTP Basic Auth)
 * - No refresh_token (access_token never expires)
 * - Response: { access_token, bot_id, workspace_id, workspace_name }
 */

import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/connect/notion/callback/route";

// Mock crypto module (AES-256-GCM encryption)
const mockEncrypt = vi.fn();
vi.mock("@/lib/crypto", () => ({
  encrypt: mockEncrypt,
}));

// Mock Supabase server client
const mockUpsert = vi.fn();
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

// Mock global fetch for Notion token exchange
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Helper: build a NextRequest with query params and optional cookie
function buildRequest(
  params: Record<string, string>,
  cookieState?: string
): NextRequest {
  const url = new URL("http://localhost/api/auth/connect/notion/callback");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const request = new NextRequest(url.toString());
  if (cookieState !== undefined) {
    Object.defineProperty(request, "cookies", {
      value: {
        get: (name: string) =>
          name === "oauth_state" ? { value: cookieState } : undefined,
      },
    });
  }
  return request;
}

describe("GET /api/auth/connect/notion/callback", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NOTION_CLIENT_ID: "test-notion-client-id",
      NOTION_CLIENT_SECRET: "test-notion-secret",
    };
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

  afterEach(() => {
    process.env = originalEnv;
  });

  // TC: Success — code + valid state → token exchange → encrypt → store → redirect
  it("valid code + state → exchanges token with Notion → encrypts → stores in connected_services → redirects to /connections", async () => {
    const validState = "csrf-token-abc";
    const notionTokenResponse = {
      access_token: "ntn_test_access_token",
      bot_id: "bot-123",
      workspace_id: "ws-456",
      workspace_name: "Test Workspace",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(notionTokenResponse),
    });

    const request = buildRequest(
      { code: "valid-auth-code", state: validState },
      validState
    );

    const response = await GET(request);

    // Token exchange called with correct URL and Basic Auth
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.notion.com/v1/oauth/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      })
    );

    // Access token was encrypted
    expect(mockEncrypt).toHaveBeenCalledWith(notionTokenResponse.access_token);

    // Stored in connected_services with service_name: 'notion'
    expect(mockFrom).toHaveBeenCalledWith("connected_services");

    // Redirect to /connections on success
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toMatch(/\/connections/);
  });

  // TC: Missing code → 400
  it("missing code parameter → 400 bad request", async () => {
    const request = buildRequest({ state: "csrf-token" }, "csrf-token");

    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/missing.*code|code.*required/i);
  });

  // TC: State mismatch → 400 (CSRF)
  it("state mismatch → 400 CSRF validation failure", async () => {
    const request = buildRequest(
      { code: "some-code", state: "tampered-state" },
      "original-state"
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/csrf|state.*mismatch|invalid.*state/i);
  });

  // TC: Unauthenticated user → 401
  it("unauthenticated user → 401 unauthorized", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "token",
          bot_id: "bot",
          workspace_id: "ws",
          workspace_name: "WS",
        }),
    });

    const request = buildRequest(
      { code: "valid-code", state: "csrf-token" },
      "csrf-token"
    );

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  // TC: Notion token exchange failure → 400
  it("Notion token exchange failure → 400 error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "invalid_grant" }),
    });

    const request = buildRequest(
      { code: "invalid-code", state: "csrf-token" },
      "csrf-token"
    );

    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/token.*exchange|oauth.*failed|notion/i);
  });

  // TC: DB upsert failure → 500
  it("DB upsert failure → 500 internal server error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "token",
          bot_id: "bot",
          workspace_id: "ws",
          workspace_name: "WS",
        }),
    });

    mockFrom.mockReturnValue({
      upsert: vi.fn().mockReturnValue({
        eq: vi
          .fn()
          .mockResolvedValue({ error: { message: "DB insert failed" } }),
      }),
    });

    const request = buildRequest(
      { code: "valid-code", state: "csrf-token" },
      "csrf-token"
    );

    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/save|connection|failed/i);
  });

  // TC: Success upsert includes correct fields
  it("upsert payload includes service_name 'notion' and encrypted_access_token", async () => {
    const validState = "csrf-state-123";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          access_token: "ntn_access_token",
          bot_id: "bot-id",
          workspace_id: "ws-id",
          workspace_name: "My Workspace",
        }),
    });

    const mockUpsertFn = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    mockFrom.mockReturnValue({ upsert: mockUpsertFn });

    const request = buildRequest(
      { code: "valid-code", state: validState },
      validState
    );

    await GET(request);

    expect(mockUpsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        service_name: "notion",
        encrypted_access_token: "encrypted:ntn_access_token",
        user_id: "user-123",
      })
    );
  });
});
