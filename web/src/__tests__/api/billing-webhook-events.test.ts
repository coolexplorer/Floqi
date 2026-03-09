/**
 * API Route Tests — POST /api/billing/webhook (Stripe event handlers)
 *
 * Tests validate:
 * - checkout.session.completed: with userId/customer → plan='pro' saved
 * - checkout.session.completed: missing client_reference_id → no update
 * - customer.subscription.deleted: valid → plan downgraded to 'free'
 * - customer.subscription.deleted: missing customer → no update
 * - invoice.payment_failed: valid → plan downgraded to 'free'
 * - invoice.payment_failed: unknown customerId → update called but zero rows affected
 * - Missing stripe-signature header → 400
 * - constructEvent throws → 400
 */

import { POST } from '@/app/api/billing/webhook/route';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const {
  mockConstructEvent,
  mockSupabaseUpdate,
  mockSupabaseEq,
  mockSupabaseFrom,
} = vi.hoisted(() => {
  const mockConstructEvent = vi.fn();
  const mockSupabaseEq = vi.fn().mockResolvedValue({ error: null });
  const mockSupabaseUpdate = vi.fn(() => ({ eq: mockSupabaseEq }));
  const mockSupabaseFrom = vi.fn(() => ({ update: mockSupabaseUpdate }));
  return {
    mockConstructEvent,
    mockSupabaseUpdate,
    mockSupabaseEq,
    mockSupabaseFrom,
  };
});

vi.mock('@/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: mockConstructEvent },
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: mockSupabaseFrom }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost/api/billing/webhook';

function makeRequest(body = 'raw-body', signature = 'sig_test') {
  return new Request(BASE_URL, {
    method: 'POST',
    headers: {
      'stripe-signature': signature,
      'Content-Type': 'text/plain',
    },
    body,
  });
}

function makeRequestNoSig(body = 'raw-body') {
  return new Request(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/billing/webhook', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      STRIPE_WEBHOOK_SECRET: 'whsec_test',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    };
    // Default: Supabase operations succeed
    mockSupabaseEq.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ─── checkout.session.completed ──────────────────────────────────────────────

  describe('checkout.session.completed', () => {
    // 1. Valid event with userId and customer → plan='pro' + stripe_customer_id saved
    it('valid event with userId and customer → plan="pro" and stripe_customer_id saved', async () => {
      mockConstructEvent.mockReturnValueOnce({
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: 'user-123',
            customer: 'cus_test123',
          },
        },
      });

      const response = await POST(makeRequest());

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ received: true });

      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          plan: 'pro',
          stripe_customer_id: 'cus_test123',
        })
      );
      expect(mockSupabaseEq).toHaveBeenCalledWith('id', 'user-123');
    });

    // 2. Missing client_reference_id → no update called
    it('missing client_reference_id → no Supabase update called', async () => {
      mockConstructEvent.mockReturnValueOnce({
        type: 'checkout.session.completed',
        data: {
          object: {
            client_reference_id: undefined,
            customer: 'cus_test123',
          },
        },
      });

      const response = await POST(makeRequest());

      expect(response.status).toBe(200);
      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });
  });

  // ─── customer.subscription.deleted ───────────────────────────────────────────

  describe('customer.subscription.deleted', () => {
    // 3. Valid event → plan downgraded to 'free' by stripe_customer_id
    it('valid event → plan downgraded to "free" by stripe_customer_id', async () => {
      mockConstructEvent.mockReturnValueOnce({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_test123',
          },
        },
      });

      const response = await POST(makeRequest());

      expect(response.status).toBe(200);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({ plan: 'free' });
      expect(mockSupabaseEq).toHaveBeenCalledWith(
        'stripe_customer_id',
        'cus_test123'
      );
    });

    // 4. Missing customer field → no update called
    it('missing customer field → no Supabase update called', async () => {
      mockConstructEvent.mockReturnValueOnce({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: undefined,
          },
        },
      });

      const response = await POST(makeRequest());

      expect(response.status).toBe(200);
      expect(mockSupabaseUpdate).not.toHaveBeenCalled();
    });
  });

  // ─── invoice.payment_failed ───────────────────────────────────────────────────

  describe('invoice.payment_failed', () => {
    // 5. Valid event → plan downgraded to 'free' by stripe_customer_id
    it('valid event → plan downgraded to "free" by stripe_customer_id', async () => {
      mockConstructEvent.mockReturnValueOnce({
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_test123',
          },
        },
      });

      const response = await POST(makeRequest());

      expect(response.status).toBe(200);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({ plan: 'free' });
      expect(mockSupabaseEq).toHaveBeenCalledWith(
        'stripe_customer_id',
        'cus_test123'
      );
    });

    // 6. Unknown customerId → update called but zero rows affected (no error)
    it('unknown customerId → update is called but no rows affected (no error thrown)', async () => {
      // Simulate zero rows affected: Supabase returns no error, just no rows updated
      mockSupabaseEq.mockResolvedValueOnce({ error: null, count: 0 });

      mockConstructEvent.mockReturnValueOnce({
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_unknown999',
          },
        },
      });

      const response = await POST(makeRequest());

      // Route should still return 200 (no error thrown for zero matches)
      expect(response.status).toBe(200);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({ plan: 'free' });
      expect(mockSupabaseEq).toHaveBeenCalledWith(
        'stripe_customer_id',
        'cus_unknown999'
      );
    });
  });

  // ─── General ─────────────────────────────────────────────────────────────────

  describe('General', () => {
    // 7. Missing stripe-signature header → 400
    it('missing stripe-signature header → 400', async () => {
      const response = await POST(makeRequestNoSig());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
    });

    // 8. constructEvent throws → 400
    it('constructEvent throws → 400', async () => {
      mockConstructEvent.mockImplementationOnce(() => {
        throw new Error('Invalid signature');
      });

      const response = await POST(makeRequest());

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Invalid signature');
    });
  });
});
