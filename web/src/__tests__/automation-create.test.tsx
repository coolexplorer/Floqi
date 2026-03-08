/**
 * Automation Create Page Tests — TC-3001, TC-3002, TC-3003, TC-3008
 * TDD Red Phase
 *
 * Tests validate:
 * - TC-3001: Template selection page renders 5 MVP template cards
 *   (Morning Briefing, Email Triage, Reading Digest, Weekly Review, Smart Save)
 * - TC-3002: Select template → wizard steps → create automation → redirect to /automations
 * - TC-3003: Template requires Google service but not connected → error message displayed
 * - TC-3008: POST /api/automations API route creates DB record
 * - Wizard navigation (Next, Back buttons)
 *
 * FAILURES expected:
 * - TC-3001: FAILS — current NewAutomationPage only has 3 templates (missing Weekly Review, Smart Save)
 * - TC-3003: FAILS — no Google service connectivity check implemented
 * - TC-3008: FAILS — /api/automations route does not exist
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewAutomationPage from "@/app/(dashboard)/automations/new/page";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mock connected_services: no Google connection */
function setupNoGoogleConnection() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "connected_services") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }
    // automations insert
    return {
      insert: vi.fn().mockResolvedValue({ data: [{ id: "new-id" }], error: null }),
    };
  });
}

/** Mock connected_services: Google IS connected */
function setupGoogleConnected() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "connected_services") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [{ id: "cs-1", service_name: "google", connected_at: "2026-03-01T00:00:00Z" }],
            error: null,
          }),
        }),
      };
    }
    return {
      insert: vi.fn().mockResolvedValue({ data: [{ id: "new-id" }], error: null }),
    };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("NewAutomationPage — TC-3001, TC-3002, TC-3003, TC-3008", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  // ── TC-3001: 5 MVP template cards ─────────────────────────────────────────

  it("TC-3001: renders all 5 MVP template cards on the template selection step", () => {
    render(<NewAutomationPage />);

    // All 5 MVP templates must be present
    // RED: Current implementation only has 3 templates (Morning Briefing, Email Triage, Reading Digest)
    // Weekly Review and Smart Save are MISSING → this test FAILS
    expect(
      screen.getByRole("button", { name: /morning briefing/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /email triage/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reading digest/i })
    ).toBeInTheDocument();
    // RED: These two are missing from the current implementation
    expect(
      screen.getByRole("button", { name: /weekly review/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /smart save/i })
    ).toBeInTheDocument();
  });

  it("TC-3001: exactly 5 template cards are shown (not 3)", () => {
    render(<NewAutomationPage />);

    // All 5 template buttons should be present (some are disabled "coming soon")
    const allTemplateButtons = [
      screen.getByRole("button", { name: /morning briefing/i }),
      screen.getByRole("button", { name: /email triage/i }),
      screen.getByRole("button", { name: /reading digest/i }),
      screen.getByRole("button", { name: /weekly review/i }),
      screen.getByRole("button", { name: /smart save/i }),
    ];

    expect(allTemplateButtons).toHaveLength(5);
  });

  it("TC-3001: Weekly Review template card is disabled (coming soon)", async () => {
    render(<NewAutomationPage />);

    // Weekly Review is a "coming soon" template — it should be disabled
    const weeklyReviewBtn = screen.getByRole("button", { name: /weekly review/i });
    expect(weeklyReviewBtn).toBeDisabled();
    expect(weeklyReviewBtn).toHaveAttribute("aria-disabled");
  });

  it("TC-3001: Smart Save template card is disabled (coming soon)", async () => {
    render(<NewAutomationPage />);

    // Smart Save is a "coming soon" template — it should be disabled
    const smartSaveBtn = screen.getByRole("button", { name: /smart save/i });
    expect(smartSaveBtn).toBeDisabled();
    expect(smartSaveBtn).toHaveAttribute("aria-disabled");
  });

  // ── TC-3002: Wizard flow ───────────────────────────────────────────────────

  it("TC-3002: selecting a template pre-fills automation name on step 2", async () => {
    setupGoogleConnected();
    render(<NewAutomationPage />);

    // Step 1: Select Morning Briefing
    await userEvent.click(screen.getByRole("button", { name: /morning briefing/i }));
    await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));

    // Step 2: Name should be pre-filled
    const nameInput = await screen.findByRole("textbox", { name: /name/i });
    expect(nameInput).toHaveValue("Morning Briefing");
  });

  it("TC-3002: wizard Back button returns to previous step", async () => {
    setupGoogleConnected();
    render(<NewAutomationPage />);

    // Go to step 2
    await userEvent.click(screen.getByRole("button", { name: /morning briefing/i }));
    await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));

    // Should now be on step 2 (Configure)
    await screen.findByRole("textbox", { name: /name/i });

    // Go back to step 1
    await userEvent.click(screen.getByRole("button", { name: /go to previous step/i }));

    // Should be back on step 1 (template selection)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /morning briefing/i })).toBeInTheDocument();
    });
  });

  it("TC-3002: clicking Next without selecting template → validation error", async () => {
    render(<NewAutomationPage />);

    // No template selected — click Next
    await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));

    // Validation alert should appear
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("TC-3002: completing wizard → redirects to /automations", async () => {
    setupGoogleConnected();
    const insertMock = vi.fn().mockResolvedValue({
      data: [{ id: "new-auto" }],
      error: null,
    });
    mockFrom.mockReturnValue({ insert: insertMock });

    render(<NewAutomationPage />);

    // Step 1: Select template
    await userEvent.click(screen.getByRole("button", { name: /morning briefing/i }));
    await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));

    // Step 2: Name is pre-filled, go to next
    await screen.findByRole("textbox", { name: /name/i });
    await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));

    // Step 3: Submit
    const submitBtn = await screen.findByRole("button", { name: /submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/automations");
    });
  });

  // ── TC-3003: Google service check ─────────────────────────────────────────

  it("TC-3003: selecting Morning Briefing template when Google not connected → error displayed", async () => {
    setupNoGoogleConnection();
    render(<NewAutomationPage />);

    // Select Morning Briefing (requires Gmail + Calendar → needs Google connection)
    await userEvent.click(screen.getByRole("button", { name: /morning briefing/i }));

    // RED: No Google service check exists in current implementation
    // Expected: an error/warning like "Google service not connected"
    // Actual: user can proceed without Google connection
    await waitFor(() => {
      expect(
        screen.getByText(/google.*not connected|connect google|google.*required/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-3003: selecting Email Triage when Google not connected → shows connection requirement", async () => {
    setupNoGoogleConnection();
    render(<NewAutomationPage />);

    await userEvent.click(screen.getByRole("button", { name: /email triage/i }));

    // RED: No Google check implemented
    await waitFor(() => {
      expect(
        screen.getByText(/google.*not connected|connect google|google.*required/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-3003: when Google IS connected, no error is shown for Morning Briefing", async () => {
    setupGoogleConnected();
    render(<NewAutomationPage />);

    await userEvent.click(screen.getByRole("button", { name: /morning briefing/i }));

    // No error about Google connection
    await waitFor(() => {
      expect(
        screen.queryByText(/google.*not connected|connect google/i)
      ).not.toBeInTheDocument();
    });
  });

  // ── TC-3008: POST /api/automations API route ──────────────────────────────

  it("TC-3008: completing wizard calls POST /api/automations (not Supabase directly)", async () => {
    setupGoogleConnected();

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "new-automation-id" }),
    });
    global.fetch = mockFetch as typeof fetch;

    render(<NewAutomationPage />);

    // Complete the wizard
    await userEvent.click(screen.getByRole("button", { name: /morning briefing/i }));
    await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));
    await screen.findByRole("textbox", { name: /name/i });
    await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));

    const submitBtn = await screen.findByRole("button", { name: /submit/i });
    await userEvent.click(submitBtn);

    // RED: Current implementation calls supabase.from('automations').insert(...)
    // NOT fetch POST /api/automations
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/automations",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
          body: expect.stringContaining("morning_briefing"),
        })
      );
    });
  });
});
