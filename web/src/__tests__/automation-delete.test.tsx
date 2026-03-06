/**
 * Automation Delete Tests — TC-3015, TC-3016, TC-3017
 * TDD Red Phase
 *
 * Tests validate:
 * - TC-3015: Click delete button → confirmation modal appears
 * - TC-3016: Click confirm in modal → DELETE /api/automations/[id] called
 * - TC-3017: After delete → automation removed from list, success toast displayed
 * - Cancel modal → no API call, automation remains in list
 *
 * FAILURES expected:
 * - TC-3016: FAILS — current AutomationsPage calls supabase.delete() directly, NOT fetch DELETE /api/automations/[id]
 * - TC-3017 (toast): FAILS — no success toast is shown after delete
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

const sampleAutomation = {
  id: "auto-1",
  name: "Morning Briefing",
  template_type: "morning_briefing",
  status: "active",
  last_run_at: "2026-03-04T08:00:00Z",
  next_run_at: "2026-03-05T08:00:00Z",
  schedule_cron: "0 8 * * *",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupWithOneAutomation() {
  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq });

  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [sampleAutomation], error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    delete: deleteFn,
  });

  return { deleteFn, deleteEq };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Automation Delete — TC-3015, TC-3016, TC-3017", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    // Set up fetch mock
    // Current implementation uses Supabase directly, not fetch API routes
    // TC-3016 assertions FAIL because fetch is never called
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    global.fetch = mockFetch as typeof fetch;
  });

  // ── TC-3015: Confirmation modal ────────────────────────────────────────────

  it("TC-3015: clicking delete button opens a confirmation modal", async () => {
    setupWithOneAutomation();
    render(<AutomationsPage />);

    const deleteBtn = await screen.findByRole("button", {
      name: /morning briefing 삭제/i,
    });
    await userEvent.click(deleteBtn);

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("TC-3015: confirmation modal contains the automation name and delete warning text", async () => {
    setupWithOneAutomation();
    render(<AutomationsPage />);

    await screen.findByRole("button", { name: /morning briefing 삭제/i });
    await userEvent.click(screen.getByRole("button", { name: /morning briefing 삭제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Modal should contain warning text about deletion
    expect(
      screen.getByText(/삭제.*확인|정말.*삭제|이 자동화를 삭제/i)
    ).toBeInTheDocument();
  });

  it("TC-3015: confirmation modal has both confirm and cancel buttons", async () => {
    setupWithOneAutomation();
    render(<AutomationsPage />);

    await screen.findByRole("button", { name: /morning briefing 삭제/i });
    await userEvent.click(screen.getByRole("button", { name: /morning briefing 삭제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /확인|confirm|삭제 확인/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /취소|cancel/i })
    ).toBeInTheDocument();
  });

  // ── TC-3016: DELETE API call on confirm ────────────────────────────────────

  it("TC-3016: clicking confirm in modal calls DELETE /api/automations/[id]", async () => {
    setupWithOneAutomation();
    render(<AutomationsPage />);

    // Open delete modal
    const deleteBtn = await screen.findByRole("button", {
      name: /morning briefing 삭제/i,
    });
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Confirm delete
    await userEvent.click(
      screen.getByRole("button", { name: /확인|confirm|삭제 확인/i })
    );

    // RED: Current implementation calls supabase.from('automations').delete().eq('id', 'auto-1')
    // EXPECTED: fetch DELETE /api/automations/auto-1
    // ACTUAL: fetch is never called → assertion FAILS
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/automations/auto-1",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });
  });

  it("TC-3016: DELETE request targets the correct automation ID in URL", async () => {
    setupWithOneAutomation();
    render(<AutomationsPage />);

    await screen.findByRole("button", { name: /morning briefing 삭제/i });
    await userEvent.click(screen.getByRole("button", { name: /morning briefing 삭제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /확인|confirm|삭제 확인/i })
    );

    await waitFor(() => {
      const [url] = mockFetch.mock.calls[0] ?? [];
      // RED: fetch is never called
      expect(url).toBe("/api/automations/auto-1");
    });
  });

  // ── TC-3017: Post-delete list update + toast ────────────────────────────────

  it("TC-3017: after confirming delete, automation is removed from the list", async () => {
    setupWithOneAutomation();
    render(<AutomationsPage />);

    await screen.findByRole("button", { name: /morning briefing 삭제/i });
    await userEvent.click(screen.getByRole("button", { name: /morning briefing 삭제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /확인|confirm|삭제 확인/i })
    );

    // Card should be removed from list
    await waitFor(() => {
      expect(screen.queryByText("Morning Briefing")).not.toBeInTheDocument();
    });
  });

  it("TC-3017: after successful delete, success toast notification is displayed", async () => {
    setupWithOneAutomation();
    render(<AutomationsPage />);

    await screen.findByRole("button", { name: /morning briefing 삭제/i });
    await userEvent.click(screen.getByRole("button", { name: /morning briefing 삭제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /확인|confirm|삭제 확인/i })
    );

    // RED: No success toast is shown in current implementation
    // EXPECTED: Toast/notification with success message
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        /삭제.*완료|successfully deleted|deleted/i
      );
    });
  });

  it("TC-3017: modal is closed after successful delete", async () => {
    setupWithOneAutomation();
    render(<AutomationsPage />);

    await screen.findByRole("button", { name: /morning briefing 삭제/i });
    await userEvent.click(screen.getByRole("button", { name: /morning briefing 삭제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /확인|confirm|삭제 확인/i })
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // ── Cancel modal: no API call ──────────────────────────────────────────────

  it("clicking cancel in modal closes it without calling DELETE API", async () => {
    setupWithOneAutomation();
    render(<AutomationsPage />);

    await screen.findByRole("button", { name: /morning briefing 삭제/i });
    await userEvent.click(screen.getByRole("button", { name: /morning briefing 삭제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Cancel
    await userEvent.click(screen.getByRole("button", { name: /취소|cancel/i }));

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Automation should still be in the list
    expect(screen.getByText("Morning Briefing")).toBeInTheDocument();

    // fetch should NOT have been called
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("clicking cancel does NOT delete the automation from Supabase either", async () => {
    const { deleteFn } = setupWithOneAutomation();
    render(<AutomationsPage />);

    await screen.findByRole("button", { name: /morning briefing 삭제/i });
    await userEvent.click(screen.getByRole("button", { name: /morning briefing 삭제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: /취소|cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    // Neither fetch nor Supabase delete should be called
    expect(mockFetch).not.toHaveBeenCalled();
    expect(deleteFn).not.toHaveBeenCalled();
  });

  // ── API error on delete ────────────────────────────────────────────────────

  it("when DELETE API fails, automation remains in list and error is shown", async () => {
    mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Server error" }),
    });
    global.fetch = mockFetch as typeof fetch;

    setupWithOneAutomation();
    render(<AutomationsPage />);

    await screen.findByRole("button", { name: /morning briefing 삭제/i });
    await userEvent.click(screen.getByRole("button", { name: /morning briefing 삭제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /확인|confirm|삭제 확인/i })
    );

    // RED: Current impl uses Supabase (succeeds), so automation IS removed
    // and no error is shown. These assertions FAIL because:
    //   1. Supabase delete mock succeeds → card removed
    //   2. No error notification shown
    await waitFor(() => {
      // Automation should still be visible (delete failed)
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
      // Error notification should be shown
      expect(screen.getByRole("status")).toHaveTextContent(/error|실패/i);
    });
  });
});
