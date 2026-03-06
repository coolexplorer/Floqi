/**
 * Automations List Page Tests — TC-3006, TC-3007
 * TDD Red Phase
 *
 * Tests validate:
 * - TC-3006: Empty state rendered when user has 0 automations
 * - TC-3007: AutomationCard for each automation (name, status badge, schedule, actions)
 * - FilterBar: status filter integration
 * - FilterBar: date range filter integration (RED: not implemented in AutomationsPage)
 * - Loading state display
 *
 * FAILURES expected:
 * - "date range filter" test → FAILS because AutomationsPage does not pass onDateChange to FilterBar
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

const sampleAutomations = [
  {
    id: "auto-1",
    name: "Morning Briefing",
    template_type: "morning_briefing",
    status: "active",
    last_run_at: "2026-03-04T08:00:00Z",
    next_run_at: "2026-03-05T08:00:00Z",
    schedule_cron: "0 8 * * *",
  },
  {
    id: "auto-2",
    name: "Email Triage",
    template_type: "email_triage",
    status: "paused",
    last_run_at: null,
    next_run_at: null,
    schedule_cron: "0 9 * * *",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupListMock(automations: typeof sampleAutomations) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: automations, error: null }),
      }),
    }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AutomationsPage — TC-3006, TC-3007", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  // ── TC-3006: Empty state ──────────────────────────────────────────────────

  it("TC-3006: shows EmptyState with 'Create Automation' button when user has 0 automations", async () => {
    setupListMock([]);
    render(<AutomationsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no automations yet/i)).toBeInTheDocument();
    });

    // EmptyState CTA button should navigate to create page
    expect(screen.getByRole("button", { name: /create automation/i })).toBeInTheDocument();
  });

  it("TC-3006: EmptyState CTA button navigates to /automations/new", async () => {
    setupListMock([]);
    render(<AutomationsPage />);

    await screen.findByRole("button", { name: /create automation/i });
    await userEvent.click(screen.getByRole("button", { name: /create automation/i }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/automations/new");
    });
  });

  // ── TC-3007: AutomationCard display ────────────────────────────────────────

  it("TC-3007: renders one AutomationCard per automation with the automation name", async () => {
    setupListMock(sampleAutomations);
    render(<AutomationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
      expect(screen.getByText("Email Triage")).toBeInTheDocument();
    });
  });

  it("TC-3007: AutomationCard shows status badge (활성 for active, 일시정지 for paused)", async () => {
    setupListMock(sampleAutomations);
    render(<AutomationsPage />);

    await waitFor(() => {
      // At least one status badge with "활성" text exists
      const activeBadges = screen.getAllByText("활성");
      expect(activeBadges.length).toBeGreaterThanOrEqual(1);
      // At least one status badge with "일시정지" text exists
      const pausedBadges = screen.getAllByText("일시정지");
      expect(pausedBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("TC-3007: AutomationCard shows schedule cron expression", async () => {
    setupListMock([sampleAutomations[0]]);
    render(<AutomationsPage />);

    await waitFor(() => {
      expect(screen.getByText("0 8 * * *")).toBeInTheDocument();
    });
  });

  it("TC-3007: AutomationCard shows edit, toggle, and delete action buttons", async () => {
    setupListMock([sampleAutomations[0]]);
    render(<AutomationsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /morning briefing 편집/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /morning briefing 일시정지/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /morning briefing 삭제/i })
      ).toBeInTheDocument();
    });
  });

  // ── FilterBar: status filter integration ─────────────────────────────────

  it("FilterBar status filter: clicking 'Paused' shows only paused automations", async () => {
    setupListMock(sampleAutomations);
    render(<AutomationsPage />);

    // Wait for list to load
    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // Click 'Paused' filter
    await userEvent.click(screen.getByRole("radio", { name: /^paused$/i }));

    await waitFor(() => {
      expect(screen.queryByText("Morning Briefing")).not.toBeInTheDocument();
      expect(screen.getByText("Email Triage")).toBeInTheDocument();
    });
  });

  it("FilterBar status filter: clicking 'Active' shows only active automations", async () => {
    setupListMock(sampleAutomations);
    render(<AutomationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Email Triage")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("radio", { name: /^active$/i }));

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
      expect(screen.queryByText("Email Triage")).not.toBeInTheDocument();
    });
  });

  // ── FilterBar: date range filter (RED — not implemented in AutomationsPage) ─

  it("FilterBar date range: applying a date filter updates the automation list (RED: not implemented)", async () => {
    setupListMock(sampleAutomations);
    render(<AutomationsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // Open date range picker
    await userEvent.click(screen.getByRole("button", { name: /filter by date|date range/i }));

    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { name: /date range/i })
      ).toBeInTheDocument();
    });

    // Set date range: only Morning Briefing has next_run_at: 2026-03-05
    await userEvent.type(screen.getByLabelText(/^from$/i), "2026-03-05");
    await userEvent.type(screen.getByLabelText(/^to$/i), "2026-03-06");
    await userEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    // EXPECT: Email Triage (no run date) filtered out
    // ACTUAL: AutomationsPage does NOT pass onDateChange to FilterBar → no filtering
    // → RED: This assertion FAILS
    await waitFor(() => {
      expect(screen.queryByText("Email Triage")).not.toBeInTheDocument();
    });
  });

  // ── Loading state ─────────────────────────────────────────────────────────

  it("shows loading indicator while automations are being fetched", () => {
    // Never-resolving promise to keep loading state active
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(new Promise(() => {})),
        }),
      }),
    });

    render(<AutomationsPage />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
