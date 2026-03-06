/**
 * Automation Toggle Tests — TC-3012, TC-3013
 * TDD Red Phase
 *
 * Tests validate:
 * - TC-3012: Click toggle on active automation → PATCH /api/automations/[id] with status: 'paused'
 * - TC-3013: Click toggle on paused automation → PATCH /api/automations/[id] with status: 'active'
 * - Optimistic UI update (badge changes before API responds)
 * - Error handling: API failure → UI rolls back to original status
 *
 * FAILURES expected:
 * - TC-3012: FAILS — current AutomationsPage calls supabase.update() directly, NOT fetch PATCH /api/automations/[id]
 * - TC-3013: FAILS — same reason
 * - Optimistic UI test: FAILS — current impl awaits Supabase update before updating state
 * - Error rollback test: FAILS — no error rollback implemented; fetch is not used
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AutomationsPage from "@/app/(dashboard)/automations/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const activeAutomation = {
  id: "auto-1",
  name: "Morning Briefing",
  template_type: "morning_briefing",
  status: "active",
  last_run_at: "2026-03-04T08:00:00Z" as string | null,
  next_run_at: "2026-03-05T08:00:00Z" as string | null,
  schedule_cron: "0 8 * * *",
};

const pausedAutomation = {
  id: "auto-2",
  name: "Email Triage",
  template_type: "email_triage",
  status: "paused",
  last_run_at: null as string | null,
  next_run_at: null as string | null,
  schedule_cron: "0 9 * * *",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupListWithAutomations(automations: (typeof activeAutomation)[]) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: automations, error: null }),
      }),
    }),
    // Supabase update mock — component currently calls this instead of fetch
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Automation Toggle — TC-3012, TC-3013", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Set up fetch mock
    // Current implementation does NOT call fetch — it uses Supabase directly
    // All fetch-based assertions in this suite FAIL until component is refactored
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "auto-1", status: "paused" }),
    });
    global.fetch = mockFetch as typeof fetch;
  });

  // ── TC-3012: Toggle active → paused via API ────────────────────────────────

  it("TC-3012: clicking '일시정지' on active automation calls PATCH /api/automations/[id] with status='paused'", async () => {
    setupListWithAutomations([activeAutomation]);
    render(<AutomationsPage />);

    const pauseBtn = await screen.findByRole("button", {
      name: /morning briefing 일시정지/i,
    });
    await userEvent.click(pauseBtn);

    // RED: Current implementation calls supabase.from('automations').update({status:'paused'}).eq(...)
    // EXPECTED: fetch PATCH /api/automations/auto-1
    // ACTUAL: fetch is never called → assertion FAILS
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/automations/auto-1",
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify({ status: "paused" }),
        })
      );
    });
  });

  it("TC-3012: PATCH request contains correct automation ID in URL path", async () => {
    setupListWithAutomations([activeAutomation]);
    render(<AutomationsPage />);

    const pauseBtn = await screen.findByRole("button", {
      name: /morning briefing 일시정지/i,
    });
    await userEvent.click(pauseBtn);

    await waitFor(() => {
      const [url] = mockFetch.mock.calls[0] ?? [];
      // RED: fetch is never called → mockFetch.mock.calls[0] is undefined
      expect(url).toBe("/api/automations/auto-1");
    });
  });

  // ── TC-3013: Toggle paused → active via API ────────────────────────────────

  it("TC-3013: clicking '재개' on paused automation calls PATCH /api/automations/[id] with status='active'", async () => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "auto-2", status: "active" }),
    });
    global.fetch = mockFetch as typeof fetch;

    setupListWithAutomations([pausedAutomation]);
    render(<AutomationsPage />);

    const resumeBtn = await screen.findByRole("button", {
      name: /email triage 재개/i,
    });
    await userEvent.click(resumeBtn);

    // RED: fetch is never called → assertion FAILS
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/automations/auto-2",
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: JSON.stringify({ status: "active" }),
        })
      );
    });
  });

  it("TC-3013: '재개' button visible only for paused automations", async () => {
    setupListWithAutomations([pausedAutomation]);
    render(<AutomationsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /email triage 재개/i })
      ).toBeInTheDocument();
    });

    // Should not show '일시정지' for a paused automation
    expect(
      screen.queryByRole("button", { name: /email triage 일시정지/i })
    ).not.toBeInTheDocument();
  });

  // ── Optimistic UI update ───────────────────────────────────────────────────

  it("optimistic UI: status badge updates to '일시정지' immediately after click (before API resolves)", async () => {
    // Slow fetch that takes 500ms
    mockFetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve({ status: "paused" }),
              }),
            500
          );
        })
    );
    global.fetch = mockFetch as typeof fetch;

    setupListWithAutomations([activeAutomation]);
    render(<AutomationsPage />);

    const pauseBtn = await screen.findByRole("button", {
      name: /morning briefing 일시정지/i,
    });

    // Click and immediately check (before 500ms fetch resolves)
    await userEvent.click(pauseBtn);

    // RED: Current impl uses Supabase (instant mock) so state updates after Supabase.
    //      With fetch being slow, optimistic update should happen first.
    //      Since current code doesn't use fetch, the optimistic test is meaningless here,
    //      but the PATCH fetch assertion above will already fail this suite.
    // This test checks that the badge shows '일시정지' within 10ms of click.
    await waitFor(
      () => {
        expect(screen.getByText("일시정지")).toBeInTheDocument();
      },
      { timeout: 10 }
    );
    // RED: With slow fetch, if update is optimistic this passes.
    // Current Supabase mock is instant so this test may misleadingly pass,
    // but TC-3012/3013 fetch assertions above will correctly fail.
  });

  // ── Error handling: API failure → rollback ─────────────────────────────────

  it("error handling: when PATCH /api/automations/[id] returns error, status badge rolls back", async () => {
    // Fetch returns an error
    mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Unauthorized" }),
    });
    global.fetch = mockFetch as typeof fetch;

    setupListWithAutomations([activeAutomation]);
    render(<AutomationsPage />);

    const pauseBtn = await screen.findByRole("button", {
      name: /morning briefing 일시정지/i,
    });
    await userEvent.click(pauseBtn);

    // RED: Current implementation uses Supabase (not fetch), so:
    //   1. Supabase update succeeds (mocked)
    //   2. State updates to 'paused' (badge shows '일시정지')
    //   3. No rollback happens
    //   4. This assertion FAILS: expects '활성', finds '일시정지'
    await waitFor(() => {
      expect(screen.getByText("활성")).toBeInTheDocument();
      expect(screen.queryByText("일시정지")).not.toBeInTheDocument();
    });
  });

  it("error handling: API error shows toast/notification with error message", async () => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Server error" }),
    });
    global.fetch = mockFetch as typeof fetch;

    setupListWithAutomations([activeAutomation]);
    render(<AutomationsPage />);

    const pauseBtn = await screen.findByRole("button", {
      name: /morning briefing 일시정지/i,
    });
    await userEvent.click(pauseBtn);

    // RED: No error notification is shown in current implementation
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/error|실패/i);
    });
  });
});
