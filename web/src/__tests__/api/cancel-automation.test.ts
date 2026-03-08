/**
 * Cancel Automation API Route Tests
 *
 * Tests validate:
 * - Authenticated user, owns automation, worker returns 200 → 200 { status: 'cancelled' }
 * - Unauthenticated user → 401
 * - User doesn't own the automation → 404
 * - Worker returns non-200 → forwards worker's status code and error
 * - Worker unreachable (fetch throws) → 502
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/automations/[id]/cancel/route';

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

function buildRequest(): NextRequest {
  return new NextRequest('http://localhost/api/automations/auto-123/cancel', { method: 'POST' });
}

const makeParams = (id = 'auto-123') => ({ params: Promise.resolve({ id }) });

describe('POST /api/automations/[id]/cancel', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    // Default: user owns the automation + execution_logs update succeeds
    mockFrom.mockImplementation((table: string) => {
      if (table === 'automations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'auto-123' }, error: null }),
              }),
            }),
          }),
        };
      }
      // execution_logs
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    });

    // Default: worker responds with 200
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'cancelled' }), { status: 200 })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('authenticated user, owns automation, worker returns 200 → 200 { status: cancelled }', async () => {
    const response = await POST(buildRequest(), makeParams());

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'cancelled' });

    // Verify worker was called with correct payload
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/cancel$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ automation_id: 'auto-123' }),
      })
    );

    // Verify execution_logs was updated to cancelled
    expect(mockFrom).toHaveBeenCalledWith('execution_logs');
  });

  it('unauthenticated user → 401', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await POST(buildRequest(), makeParams());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toMatch(/unauthorized/i);

    // Worker should not be called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("user doesn't own the automation (single returns null) → 404", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'automations') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
              }),
            }),
          }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    });

    const response = await POST(buildRequest(), makeParams());

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not found/i);

    // Worker should not be called
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('worker returns non-200 → forwards worker status code and error', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Automation not running' }), { status: 409 })
    );

    const response = await POST(buildRequest(), makeParams());

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/automation not running/i);

    // execution_logs should NOT be updated on worker failure
    expect(mockFrom).not.toHaveBeenCalledWith('execution_logs');
  });

  it('worker unreachable (fetch throws) → 502', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const response = await POST(buildRequest(), makeParams());

    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error).toMatch(/worker unreachable/i);
  });
});
