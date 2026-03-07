/**
 * Execution Logs Tests — TC-3007, TC-3008, TC-3009
 * TDD Red Phase: Status filter (TC-3009) FAILS — not implemented in detail page yet.
 *
 * Tests validate:
 * - TC-3007: Execution log shows tool calls timeline with step details
 * - TC-3008: Click log entry → expand ToolCallsTimeline with tool name/input/output
 * - TC-3009: Filter execution logs by status (success/error) ← RED: no filter UI yet
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AutomationDetailPage from "@/app/(dashboard)/automations/[id]/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "automation-123" }),
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

const automationDetail = {
  id: "automation-123",
  name: "Morning Briefing",
  description: "Daily morning summary",
  template_type: "morning_briefing",
  status: "active",
  schedule_cron: "0 8 * * *",
  last_run_at: "2026-03-04T08:00:00Z",
  next_run_at: "2026-03-05T08:00:00Z",
  created_at: "2026-02-01T00:00:00Z",
};

// Fixture: mix of success and error logs with tool_calls
const mixedExecutionLogs = [
  {
    id: "log-1",
    status: "success",
    duration_ms: 3200,
    created_at: "2026-03-04T08:00:05Z",
    tool_calls: [
      {
        id: "tc-1",
        toolName: "calendar_list_events_today",
        input: { date: "2026-03-04", calendarId: "primary" },
        output: { events: [{ summary: "Team Standup", start: "09:00" }] },
        duration: 800,
        status: "success",
      },
      {
        id: "tc-2",
        toolName: "gmail_list_recent_emails",
        input: { query: "is:important", maxResults: 5 },
        output: { emails: [{ subject: "Q1 Report" }] },
        duration: 1200,
        status: "success",
      },
      {
        id: "tc-3",
        toolName: "weather_current",
        input: { location: "Seoul" },
        output: { temp: 5, condition: "cloudy" },
        duration: 400,
        status: "success",
      },
    ],
  },
  {
    id: "log-2",
    status: "success",
    duration_ms: 1800,
    created_at: "2026-03-03T08:00:05Z",
    tool_calls: [
      {
        id: "tc-4",
        toolName: "gmail_list_recent_emails",
        input: { query: "is:unread" },
        output: { emails: [] },
        duration: 1800,
        status: "success",
      },
    ],
  },
  {
    id: "log-3",
    status: "error",
    duration_ms: 200,
    created_at: "2026-03-02T08:00:05Z",
    tool_calls: [
      {
        id: "tc-5",
        toolName: "calendar_list_events_today",
        input: { date: "2026-03-02" },
        output: { error: "Token expired" },
        duration: 200,
        status: "error",
      },
    ],
  },
  {
    id: "log-4",
    status: "error",
    duration_ms: 150,
    created_at: "2026-03-01T08:00:05Z",
    tool_calls: [],
  },
];

// ─── Setup helper ─────────────────────────────────────────────────────────────

function setupPage(logs: typeof mixedExecutionLogs) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-abc" } },
    error: null,
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === "automations") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: automationDetail, error: null }),
      };
    }
    if (table === "execution_logs") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: logs, error: null }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

// ─── TC-3007: Execution log shows tool calls timeline ─────────────────────────

describe("TC-3007: Execution log tool calls timeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("each log entry shows its status badge", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      // Two success and two error logs
      const successBadges = screen.getAllByText("success");
      const errorBadges = screen.getAllByText("error");
      expect(successBadges.length).toBe(2);
      expect(errorBadges.length).toBe(2);
    });
  });

  it("each log entry shows its execution duration", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      // 3200ms → 3.2s
      expect(screen.getByText(/3\.2s/)).toBeInTheDocument();
      // 1800ms → 1.8s
      expect(screen.getByText(/1\.8s/)).toBeInTheDocument();
      // 200ms → 200ms
      expect(screen.getByText(/200ms/)).toBeInTheDocument();
    });
  });

  it("logs are displayed in reverse chronological order (most recent first)", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      // The execution log list should show most recent first
      // log-1 (2026-03-04) should appear before log-4 (2026-03-01)
      const allButtons = screen.getAllByRole("button").filter(
        (btn) => btn.hasAttribute("aria-expanded")
      );
      expect(allButtons.length).toBe(4);
    });
  });

  it("TC-3007: expanding a log shows tool names in timeline", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      const executionRows = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(executionRows.length).toBeGreaterThan(0);
    });

    // Click the first log (most recent)
    const [firstLog] = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-expanded"));

    await userEvent.click(firstLog);

    // Should show all 3 tool calls for log-1
    await waitFor(() => {
      expect(screen.getByText("calendar_list_events_today")).toBeInTheDocument();
      expect(screen.getByText("gmail_list_recent_emails")).toBeInTheDocument();
      expect(screen.getByText("weather_current")).toBeInTheDocument();
    });
  });
});

// ─── TC-3008: Click log entry → expand ToolCallsTimeline ─────────────────────

describe("TC-3008: Click log entry expands ToolCallsTimeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicking a log entry shows the 'Tool Calls' section header", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/execution history/i)).toBeInTheDocument();
    });

    const [firstLog] = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-expanded"));

    await userEvent.click(firstLog);

    await waitFor(() => {
      expect(screen.getByText(/tool calls/i)).toBeInTheDocument();
    });
  });

  it("tool calls timeline shows input parameters for each tool", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      const rows = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(rows.length).toBeGreaterThan(0);
    });

    const [firstLog] = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-expanded"));

    await userEvent.click(firstLog);

    await waitFor(() => {
      // ToolCallStep renders tool name
      expect(screen.getByText("calendar_list_events_today")).toBeInTheDocument();
    });
  });

  it("timeline shows duration for each tool call", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      const rows = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(rows.length).toBeGreaterThan(0);
    });

    const [firstLog] = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-expanded"));

    await userEvent.click(firstLog);

    await waitFor(() => {
      // At least one duration is rendered (800ms, 1200ms, or 400ms)
      const durationPattern = /\d+(ms|s)/;
      const durationElements = screen
        .getAllByText(durationPattern)
        .filter((el) => el.textContent?.match(durationPattern));
      expect(durationElements.length).toBeGreaterThan(0);
    });
  });

  it("timeline shows total duration summary footer", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      const rows = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(rows.length).toBeGreaterThan(0);
    });

    const [firstLog] = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-expanded"));

    await userEvent.click(firstLog);

    await waitFor(() => {
      // ToolCallsTimeline renders "Total: X" footer
      expect(screen.getByText(/total/i)).toBeInTheDocument();
    });
  });

  it("error tool calls show error status in timeline", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      const rows = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(rows.length).toBeGreaterThan(0);
    });

    // Click the error log (log-3, index 2)
    const allRows = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-expanded"));

    await userEvent.click(allRows[2]); // log-3 (error)

    await waitFor(() => {
      expect(screen.getByText("calendar_list_events_today")).toBeInTheDocument();
    });
  });

  it("empty tool_calls array shows 'No tool calls recorded' in timeline", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      const rows = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(rows.length).toBeGreaterThan(0);
    });

    // Click log-4 (has empty tool_calls)
    const allRows = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-expanded"));

    await userEvent.click(allRows[3]); // log-4

    await waitFor(() => {
      expect(screen.getByText(/no tool calls recorded/i)).toBeInTheDocument();
    });
  });
});

// ─── TC-3009: Filter logs by status — RED: not implemented in detail page ─────

describe("TC-3009: Filter execution logs by status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows status filter controls (success / error / all) — RED: not implemented", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/execution history/i)).toBeInTheDocument();
    });

    // EXPECT: status filter buttons/tabs for filtering execution logs
    // ACTUAL: detail page has no status filter UI
    // → This assertion FAILS (Red phase)
    expect(
      screen.getByRole("group", { name: /filter.*status|status.*filter/i })
    ).toBeInTheDocument();
  });

  it("clicking 'success' filter shows only successful logs — RED: not implemented", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      // All 4 logs initially visible
      const rows = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(rows.length).toBe(4);
    });

    // EXPECT: a "success" filter button
    // ACTUAL: no filter button exists
    const successFilterBtn = screen.getByRole("button", {
      name: /^success$/i,
    });
    await userEvent.click(successFilterBtn);

    // After filtering, only success logs visible (2 of 4)
    await waitFor(() => {
      const rows = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(rows.length).toBe(2);
    });
  });

  it("clicking 'error' filter shows only failed logs — RED: not implemented", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/execution history/i)).toBeInTheDocument();
    });

    // EXPECT: an "error" filter button
    // ACTUAL: no filter button exists
    const errorFilterBtn = screen.getByRole("button", {
      name: /^error$/i,
    });
    await userEvent.click(errorFilterBtn);

    // After filtering, only 2 error logs visible
    await waitFor(() => {
      const rows = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(rows.length).toBe(2);
    });

    // Error badges only
    const successBadges = screen.queryAllByText("success");
    expect(successBadges.length).toBe(0);
  });

  it("clicking 'all' filter after filtering restores full list — RED: not implemented", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/execution history/i)).toBeInTheDocument();
    });

    // ACTUAL: no filter buttons → these will throw and fail
    const successFilterBtn = screen.getByRole("button", { name: /^success$/i });
    await userEvent.click(successFilterBtn);

    const allFilterBtn = screen.getByRole("button", { name: /^all$/i });
    await userEvent.click(allFilterBtn);

    await waitFor(() => {
      const rows = screen
        .getAllByRole("button")
        .filter((btn) => btn.hasAttribute("aria-expanded"));
      expect(rows.length).toBe(4);
    });
  });

  it("filter is accessible via keyboard (role=radiogroup with aria-checked)", async () => {
    setupPage(mixedExecutionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/execution history/i)).toBeInTheDocument();
    });

    // EXPECT: radiogroup with aria-checked radio buttons
    // ACTUAL: no filter UI → fails
    const filterGroup = screen.getByRole("group", {
      name: /filter.*status|status.*filter/i,
    });

    const radios = Array.from(filterGroup.querySelectorAll('[role="radio"]'));
    expect(radios.length).toBeGreaterThanOrEqual(3); // all, success, error
  });
});
