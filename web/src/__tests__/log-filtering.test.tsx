/**
 * Log Filtering Tests — TC-6007, TC-6008, TC-6009
 * TDD Red Phase: LogsPage has no filter UI — all filter assertions FAIL.
 *
 * Tests validate:
 * - TC-6007: Automation filter → shows only that automation's logs
 * - TC-6008: "failed" / "error" status filter → shows only failed logs
 * - TC-6009: "Last 7 days" date range → filters logs by date
 * - Filter combinations: automation + status
 * - Clear filters button resets all filters
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LogsPage from "@/app/(dashboard)/logs/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// LogsPage fetches from /api/logs — mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date("2026-03-06T12:00:00Z");

const sampleLogs = [
  {
    id: "log-1",
    automation_id: "auto-morning",
    automation_name: "Morning Briefing",
    status: "success",
    created_at: new Date(NOW.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    duration_ms: 3200,
  },
  {
    id: "log-2",
    automation_id: "auto-morning",
    automation_name: "Morning Briefing",
    status: "error",
    created_at: new Date(NOW.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    duration_ms: 200,
    error_message: "Token expired",
  },
  {
    id: "log-3",
    automation_id: "auto-email",
    automation_name: "Email Triage",
    status: "success",
    created_at: new Date(NOW.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    duration_ms: 1800,
  },
  {
    id: "log-4",
    automation_id: "auto-email",
    automation_name: "Email Triage",
    status: "error",
    created_at: new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago (outside 7-day window)
    duration_ms: 150,
    error_message: "Rate limit",
  },
  {
    id: "log-5",
    automation_id: "auto-news",
    automation_name: "Reading Digest",
    status: "success",
    created_at: new Date(NOW.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days ago
    duration_ms: 5000,
  },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function setupFetch(logs = sampleLogs) {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ logs }),
  });
}

// Count visible log rows (by automation name presence in the rendered list)
function getVisibleLogRows() {
  // LogEntry components render within divs — count by unique log id attributes or rows
  return screen.queryAllByRole("button").filter((btn) =>
    btn.getAttribute("data-log-id") !== null
  );
}

// ─── Filter UI presence — RED: LogsPage has no filter controls ────────────────

describe("Filter UI — filter controls exist on logs page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an automation filter dropdown — RED: LogsPage has no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // EXPECT: a combobox/select for filtering by automation name
    // ACTUAL: no filter controls → FAILS
    expect(
      screen.getByRole("combobox", { name: /automation|자동화/i })
    ).toBeInTheDocument();
  });

  it("renders a status filter with options (all, success, failed) — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // EXPECT: a group of filter buttons/select for status
    // ACTUAL: no filter controls → FAILS
    const statusFilter = screen.getByRole("group", {
      name: /status|상태/i,
    });
    expect(statusFilter).toBeInTheDocument();

    expect(within(statusFilter).getByRole("radio", { name: /all|전체/i })).toBeInTheDocument();
    expect(within(statusFilter).getByRole("radio", { name: /success|성공/i })).toBeInTheDocument();
    expect(within(statusFilter).getByRole("radio", { name: /failed|error|실패/i })).toBeInTheDocument();
  });

  it("renders a date range filter — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // EXPECT: a date range selector
    // ACTUAL: no filter controls → FAILS
    expect(
      screen.getByRole("combobox", { name: /date.*range|기간|날짜/i })
    ).toBeInTheDocument();
  });

  it("renders a clear filters button — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // EXPECT: a clear filters button
    // ACTUAL: no filter controls → FAILS
    expect(
      screen.getByRole("button", { name: /clear.*filter|필터.*초기화|reset/i })
    ).toBeInTheDocument();
  });
});

// ─── TC-6007: Automation filter ────────────────────────────────────────────────

describe("TC-6007: Select automation filter → shows only that automation's logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-6007: all 5 logs shown before filtering — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
      expect(screen.getByText("Email Triage")).toBeInTheDocument();
      expect(screen.getByText("Reading Digest")).toBeInTheDocument();
    });
  });

  it("TC-6007: selecting 'Morning Briefing' filter hides Email Triage and Reading Digest logs — RED: no filter", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // EXPECT: automation filter combobox
    // ACTUAL: no filter → FAILS
    const automationFilter = screen.getByRole("combobox", {
      name: /automation|자동화/i,
    });
    await userEvent.selectOptions(automationFilter, "Morning Briefing");

    // After filter: only Morning Briefing logs shown (2 entries)
    await waitFor(() => {
      // Email Triage and Reading Digest should be gone
      expect(screen.queryAllByText("Email Triage")).toHaveLength(0);
      expect(screen.queryAllByText("Reading Digest")).toHaveLength(0);
      // Morning Briefing entries still visible
      expect(screen.getAllByText("Morning Briefing")).toHaveLength(2);
    });
  });

  it("TC-6007: selecting 'Email Triage' shows only 2 Email Triage logs — RED: no filter", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Email Triage")).toBeInTheDocument();
    });

    const automationFilter = screen.getByRole("combobox", {
      name: /automation|자동화/i,
    });
    await userEvent.selectOptions(automationFilter, "Email Triage");

    await waitFor(() => {
      expect(screen.queryAllByText("Morning Briefing")).toHaveLength(0);
      expect(screen.queryAllByText("Reading Digest")).toHaveLength(0);
      expect(screen.getAllByText("Email Triage")).toHaveLength(2);
    });
  });

  it("TC-6007: automation filter dropdown lists all unique automation names — RED: no filter", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    const automationFilter = screen.getByRole("combobox", {
      name: /automation|자동화/i,
    });

    // Should have options for each unique automation plus "All"
    expect(
      within(automationFilter).getByRole("option", { name: /all|전체/i })
    ).toBeInTheDocument();
    expect(
      within(automationFilter).getByRole("option", { name: /morning briefing/i })
    ).toBeInTheDocument();
    expect(
      within(automationFilter).getByRole("option", { name: /email triage/i })
    ).toBeInTheDocument();
    expect(
      within(automationFilter).getByRole("option", { name: /reading digest/i })
    ).toBeInTheDocument();
  });
});

// ─── TC-6008: Status filter ───────────────────────────────────────────────────

describe("TC-6008: Select 'failed' status filter → shows only failed/error logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-6008: clicking 'failed' filter radio shows only error logs — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // EXPECT: status filter group with 'failed' radio
    // ACTUAL: no filter → FAILS
    const statusGroup = screen.getByRole("group", { name: /status|상태/i });
    const failedRadio = within(statusGroup).getByRole("radio", {
      name: /failed|error|실패/i,
    });
    await userEvent.click(failedRadio);

    // After filter: only error logs (log-2 and log-4) shown
    await waitFor(() => {
      // 2 error logs remain: log-2 (Morning Briefing, error) and log-4 (Email Triage, error)
      // success logs should be hidden
      const allLogNames = screen.queryAllByText(/morning briefing|email triage|reading digest/i);

      // Reading Digest (log-5, success) should be hidden
      expect(screen.queryAllByText("Reading Digest")).toHaveLength(0);
    });
  });

  it("TC-6008: clicking 'success' filter shows only successful logs — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    const statusGroup = screen.getByRole("group", { name: /status|상태/i });
    const successRadio = within(statusGroup).getByRole("radio", {
      name: /success|성공/i,
    });
    await userEvent.click(successRadio);

    await waitFor(() => {
      // 3 success logs (log-1, log-3, log-5)
      // Error logs (log-2, log-4) should be hidden
      // Check that status badges only show "success"
      const errorBadges = screen.queryAllByText(/error|실패/i);
      expect(errorBadges).toHaveLength(0);
    });
  });

  it("TC-6008: 'all' status is selected by default — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    const statusGroup = screen.getByRole("group", { name: /status|상태/i });
    const allRadio = within(statusGroup).getByRole("radio", {
      name: /all|전체/i,
    });
    expect(allRadio).toBeChecked();
  });
});

// ─── TC-6009: Date range filter ───────────────────────────────────────────────

describe("TC-6009: 'Last 7 days' date range filter → filters logs by date", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-6009: selecting 'Last 7 days' hides log-4 (10 days ago) — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      // All 5 logs initially visible (log-4 is Email Triage error, 10 days ago)
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // EXPECT: date range combobox with "Last 7 days" option
    // ACTUAL: no filter → FAILS
    const dateFilter = screen.getByRole("combobox", {
      name: /date.*range|기간|날짜/i,
    });
    await userEvent.selectOptions(dateFilter, "last_7_days");

    await waitFor(() => {
      // log-4 (10 days ago, Email Triage, error) should be hidden
      // log-1 (1d), log-2 (3d), log-3 (5d), log-5 (6d) should remain
      // After filter, Email Triage should only have 1 entry (log-3, 5 days ago)
      const emailEntries = screen.queryAllByText("Email Triage");
      expect(emailEntries).toHaveLength(1); // only log-3 visible
    });
  });

  it("TC-6009: date range options include 'All time', 'Last 7 days', 'Last 30 days' — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    const dateFilter = screen.getByRole("combobox", {
      name: /date.*range|기간|날짜/i,
    });

    expect(
      within(dateFilter).getByRole("option", { name: /all time|전체/i })
    ).toBeInTheDocument();
    expect(
      within(dateFilter).getByRole("option", { name: /last 7 days|최근 7일/i })
    ).toBeInTheDocument();
    expect(
      within(dateFilter).getByRole("option", { name: /last 30 days|최근 30일/i })
    ).toBeInTheDocument();
  });
});

// ─── Filter Combinations ──────────────────────────────────────────────────────

describe("Filter combinations: automation + status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("automation='Morning Briefing' + status='error' → shows only log-2 — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // Set automation filter
    const automationFilter = screen.getByRole("combobox", {
      name: /automation|자동화/i,
    });
    await userEvent.selectOptions(automationFilter, "Morning Briefing");

    // Set status filter to error
    const statusGroup = screen.getByRole("group", { name: /status|상태/i });
    const failedRadio = within(statusGroup).getByRole("radio", {
      name: /failed|error|실패/i,
    });
    await userEvent.click(failedRadio);

    await waitFor(() => {
      // Only log-2: Morning Briefing, error
      const emailEntries = screen.queryAllByText("Email Triage");
      expect(emailEntries).toHaveLength(0);
      const readingEntries = screen.queryAllByText("Reading Digest");
      expect(readingEntries).toHaveLength(0);
      // Only 1 Morning Briefing entry (error one)
      expect(screen.queryAllByText("Morning Briefing")).toHaveLength(1);
    });
  });
});

// ─── Clear Filters ────────────────────────────────────────────────────────────

describe("Clear filters button resets all filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clicking 'Clear Filters' after applying filters restores all logs — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // Apply automation filter
    const automationFilter = screen.getByRole("combobox", {
      name: /automation|자동화/i,
    });
    await userEvent.selectOptions(automationFilter, "Morning Briefing");

    await waitFor(() => {
      expect(screen.queryAllByText("Email Triage")).toHaveLength(0);
    });

    // Click clear filters
    const clearBtn = screen.getByRole("button", {
      name: /clear.*filter|필터.*초기화|reset/i,
    });
    await userEvent.click(clearBtn);

    // All logs should be visible again
    await waitFor(() => {
      expect(screen.getByText("Email Triage")).toBeInTheDocument();
      expect(screen.getByText("Reading Digest")).toBeInTheDocument();
    });
  });

  it("Clear Filters resets automation combobox to 'All' — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    const automationFilter = screen.getByRole("combobox", {
      name: /automation|자동화/i,
    });
    await userEvent.selectOptions(automationFilter, "Morning Briefing");

    const clearBtn = screen.getByRole("button", {
      name: /clear.*filter|필터.*초기화|reset/i,
    });
    await userEvent.click(clearBtn);

    // Automation filter should be reset to "all"
    await waitFor(() => {
      expect(automationFilter).toHaveValue("all");
    });
  });

  it("Clear Filters resets status radio to 'All' — RED: no filter UI", async () => {
    setupFetch();
    render(<LogsPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    const statusGroup = screen.getByRole("group", { name: /status|상태/i });
    const failedRadio = within(statusGroup).getByRole("radio", {
      name: /failed|error|실패/i,
    });
    await userEvent.click(failedRadio);

    const clearBtn = screen.getByRole("button", {
      name: /clear.*filter|필터.*초기화|reset/i,
    });
    await userEvent.click(clearBtn);

    await waitFor(() => {
      const allRadio = within(statusGroup).getByRole("radio", {
        name: /all|전체/i,
      });
      expect(allRadio).toBeChecked();
    });
  });
});
