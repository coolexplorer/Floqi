/**
 * API Route Tests — POST /api/account/byok
 *
 * Tests validate:
 * - Unauthenticated request → 401
 * - Malformed JSON body → 400 "Invalid JSON body"
 * - Missing apiKey field → 400 with Zod error
 * - Invalid API key format (no sk-ant- prefix) → 400
 * - Valid request → encrypt called → Supabase update → 200 { success: true }
 * - Supabase update fails → 500 "Failed to save API key"
 */

import { POST } from '@/app/api/account/byok/route';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockGetUser, mockUpdate, mockEq, mockFrom, mockEncrypt } = vi.hoisted(() => {
  const mockEncrypt = vi.fn().mockResolvedValue('encrypted:value');
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ update: mockUpdate }));
  const mockGetUser = vi.fn();
  return { mockGetUser, mockUpdate, mockEq, mockFrom, mockEncrypt };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

vi.mock('@/lib/crypto', () => ({
  encrypt: (...args: unknown[]) => mockEncrypt(...args),
}));

// Don't mock validation schemas - use real Zod validation

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/account/byok', () => {
  const BASE_URL = 'http://localhost/api/account/byok';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });
    // Default: encrypt succeeds
    mockEncrypt.mockResolvedValue('encrypted:value');
    // Default: Supabase update succeeds
    mockEq.mockResolvedValue({ error: null });
  });

  // 1. Unauthenticated request → 401
  it('unauthenticated request (getUser returns null) → 401 Unauthorized', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const request = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'sk-ant-api03-abc123' }),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  // 2. Malformed JSON body → 400 "Invalid JSON body"
  it('malformed JSON body → 400 "Invalid JSON body"', async () => {
    const request = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json{{{',
    });

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid JSON body');
  });

  // 3. Missing apiKey field → 400 with Zod error
  it('missing apiKey field → 400 with Zod error', async () => {
    const request = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  // 4. Invalid API key format (no sk-ant- prefix) → 400
  it('apiKey without sk-ant- prefix → 400 "Invalid API key format"', async () => {
    const request = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'openai-key-abc123' }),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid API key format');
  });

  // 5. Valid request → encrypt called with plaintext key → Supabase update → 200 { success: true }
  it('valid request → encrypt called with plaintext key → Supabase update → 200 { success: true }', async () => {
    const plainKey = 'sk-ant-api03-abc123';

    const request = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: plainKey }),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });

    // Verify encrypt was called with the plaintext key
    expect(mockEncrypt).toHaveBeenCalledWith(plainKey);

    // Verify Supabase update was called with the encrypted value
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        llm_provider: 'byok',
        llm_api_key_encrypted: 'encrypted:value',
      })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'user-123');
  });

  // 6. Supabase update fails → 500 "Failed to save API key"
  it('Supabase update fails → 500 "Failed to save API key"', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } });

    const request = new Request(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: 'sk-ant-api03-abc123' }),
    });

    const response = await POST(request as never);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to save API key');
  });
});
