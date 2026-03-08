/**
 * GitHub OAuth Callback API Route Tests
 * TDD Red Phase: These tests FAIL until the callback route is implemented.
 *
 * Tests validate:
 * - Success: valid code + state → GitHub token exchange → encrypt → upsert → redirect /connections
 * - Missing code → 400
 * - Missing state → 400
 * - State mismatch → 400 (CSRF)
 * - GitHub returns tokenData.error → 400
 * - Unauthenticated user → 401
 * - DB upsert error → 500
 *
 * GitHub OAuth specifics:
 * - Token URL: https://github.com/login/oauth/access_token (JSON POST, Accept: application/json)
 * - Error indicator: tokenData.error (not ok field)
 * - Response: { access_token, token_type, scope }
 * - provider stored as 'github'
 * - field name: access_token_encrypted
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/auth/connect/github/callback/route';

// Mock crypto module (AES-256-GCM encryption)
const { mockEncrypt } = vi.hoisted(() => ({ mockEncrypt: vi.fn() }));
vi.mock('@/lib/crypto', () => ({ encrypt: mockEncrypt }));

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Spy on global fetch for GitHub token exchange
const fetchSpy = vi.spyOn(global, 'fetch');

// Helper: build a NextRequest with query params and oauth_state cookie
function buildRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/auth/connect/github/callback');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const req = new NextRequest(url.toString());
  Object.defineProperty(req, 'cookies', {
    value: {
      get: (name: string) =>
        name === 'oauth_state' ? { value: 'csrf-token' } : undefined,
    },
  });
  return req;
}

describe('GET /api/auth/connect/github/callback', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      GITHUB_CLIENT_ID: 'test-github-client-id',
      GITHUB_CLIENT_SECRET: 'test-github-secret',
    };
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    mockEncrypt.mockImplementation((v: string) =>
      Promise.resolve(`encrypted:${v}`)
    );
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });
    fetchSpy.mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'github-token',
          token_type: 'bearer',
          scope: 'repo,user',
        }),
        { status: 200 }
      )
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // TC: Success — valid code + state → token exchange → encrypt → upsert → redirect
  it('valid code + state → exchanges token with GitHub → encrypts → upserts to connected_services → 302 redirect to /connections', async () => {
    const mockUpsertFn = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: mockUpsertFn });

    const request = buildRequest({ code: 'valid-auth-code', state: 'csrf-token' });

    const response = await GET(request);

    // Token exchange called with GitHub's endpoint using JSON
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://github.com/login/oauth/access_token',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      })
    );

    // Access token was encrypted
    expect(mockEncrypt).toHaveBeenCalledWith('github-token');

    // Stored in connected_services with provider: 'github'
    expect(mockFrom).toHaveBeenCalledWith('connected_services');
    expect(mockUpsertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'github',
        access_token_encrypted: 'encrypted:github-token',
        user_id: 'user-123',
        is_active: true,
      }),
      expect.anything()
    );

    // Redirect to /connections on success
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toMatch(/\/connections/);
  });

  // TC: Missing code → 400
  it('missing code parameter → 400 bad request', async () => {
    const url = new URL('http://localhost/api/auth/connect/github/callback');
    url.searchParams.set('state', 'csrf-token');
    const req = new NextRequest(url.toString());
    Object.defineProperty(req, 'cookies', {
      value: {
        get: (name: string) =>
          name === 'oauth_state' ? { value: 'csrf-token' } : undefined,
      },
    });

    const response = await GET(req);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/missing.*code|code.*required/i);
  });

  // TC: Missing state → 400
  it('missing state parameter → 400 bad request', async () => {
    const url = new URL('http://localhost/api/auth/connect/github/callback');
    url.searchParams.set('code', 'some-code');
    const req = new NextRequest(url.toString());
    Object.defineProperty(req, 'cookies', {
      value: {
        get: (name: string) =>
          name === 'oauth_state' ? { value: 'csrf-token' } : undefined,
      },
    });

    const response = await GET(req);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/missing.*state|csrf|state.*required/i);
  });

  // TC: State mismatch → 400 (CSRF)
  it('state mismatch → 400 CSRF validation failure', async () => {
    const url = new URL('http://localhost/api/auth/connect/github/callback');
    url.searchParams.set('code', 'some-code');
    url.searchParams.set('state', 'tampered-state');
    const req = new NextRequest(url.toString());
    Object.defineProperty(req, 'cookies', {
      value: {
        get: (name: string) =>
          name === 'oauth_state' ? { value: 'original-state' } : undefined,
      },
    });

    const response = await GET(req);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/csrf|state.*mismatch|invalid.*state/i);
  });

  // TC: GitHub returns tokenData.error → 400
  it('GitHub returns error field in token response → 400 OAuth failed error', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: 'bad_verification_code', error_description: 'The code passed is incorrect.' }),
        { status: 200 }
      )
    );

    const request = buildRequest({ code: 'bad-code', state: 'csrf-token' });

    const response = await GET(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/github.*oauth.*failed|token.*exchange/i);
  });

  // TC: Unauthenticated user → 401
  it('unauthenticated user → 401 unauthorized', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = buildRequest({ code: 'valid-code', state: 'csrf-token' });

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  // TC: DB upsert error → 500
  it('DB upsert failure → 500 internal server error', async () => {
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { message: 'DB insert failed' } }),
    });

    const request = buildRequest({ code: 'valid-code', state: 'csrf-token' });

    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/save|connection|failed/i);
  });
});
