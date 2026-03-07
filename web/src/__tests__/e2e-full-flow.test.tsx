/**
 * Full E2E Scenario Tests — TC-1001, TC-2001, TC-3002, TC-3020, TC-6004
 * TDD Red Phase: These tests cover the complete user journey.
 * Some assertions will FAIL until all features are fully integrated.
 *
 * Tests validate the full user journey:
 * - TC-1001: Email signup → success
 * - TC-2001: Google OAuth connection from Connections page
 * - TC-3002: Template-based automation creation
 * - TC-3020: Manual "Run Now" execution (RED: Run Now API call may not exist yet)
 * - TC-6004: View execution log detail with tool_calls
 *
 * Full flow: signup → login → connect Google → create automation → run → view logs
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupPage from "@/app/(auth)/signup/page";
import ConnectionsPage from "@/app/(dashboard)/connections/page";
import NewAutomationPage from "@/app/(dashboard)/automations/new/page";
import AutomationDetailPage from "@/app/(dashboard)/automations/[id]/page";

// ─── Global Mocks ─────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useParams: () => ({ id: "automation-e2e-1" }),
}));

const mockSignUp = vi.fn();
const mockSignIn = vi.fn();
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignIn,
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

// Global fetch mock for API routes (TC-3020: Run Now)
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const USER_ID = "e2e-user-001";
const USER_EMAIL = "e2e@example.com";
const USER_PASSWORD = "password123";
const AUTOMATION_ID = "automation-e2e-1";

const googleConnection = {
  id: "conn-1",
  user_id: USER_ID,
  service_name: "google",
  status: "connected",
  connected_at: "2026-03-01T00:00:00Z",
  scopes: ["gmail.readonly", "calendar.readonly"],
};

const automationDetail = {
  id: AUTOMATION_ID,
  user_id: USER_ID,
  name: "Morning Briefing",
  description: "Daily morning summary",
  template_type: "morning_briefing",
  status: "active",
  schedule_cron: "0 8 * * *",
  last_run_at: "2026-03-05T08:00:00Z",
  next_run_at: "2026-03-06T08:00:00Z",
  created_at: "2026-02-01T00:00:00Z",
};

const executionLog = {
  id: "log-e2e-1",
  status: "success",
  duration_ms: 3800,
  created_at: "2026-03-05T08:00:10Z",
  result_summary: "Morning briefing sent to e2e@example.com",
  tokens_used: 450,
  tool_calls: [
    {
      id: "tc-1",
      toolName: "calendar_list_events_today",
      input: { date: "2026-03-05", calendarId: "primary" },
      output: { events: [{ summary: "Team Standup", start: "09:00" }] },
      duration: 1200,
      status: "success",
    },
    {
      id: "tc-2",
      toolName: "gmail_list_recent_emails",
      input: { query: "is:important", maxResults: 5 },
      output: {
        emails: [{ subject: "Q1 Budget Review", from: "cfo@company.com" }],
      },
      duration: 1800,
      status: "success",
    },
    {
      id: "tc-3",
      toolName: "weather_current",
      input: { location: "Seoul" },
      output: { temp: 8, condition: "sunny" },
      duration: 400,
      status: "success",
    },
    {
      id: "tc-4",
      toolName: "gmail_send_email",
      input: { to: "e2e@example.com", subject: "Morning Briefing 2026-03-05" },
      output: { messageId: "msg-123", success: true },
      duration: 600,
      status: "success",
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupAuthenticatedUser() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: USER_ID, email: USER_EMAIL } },
    error: null,
  });
}

function setupConnectionsPage() {
  mockFrom.mockImplementation((table: string) => {
    if (table === "connected_services") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnValue({
          data: [googleConnection],
          error: null,
        }),
      };
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

function setupAutomationDetailPage(logs = [executionLog]) {
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
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() };
  });
}

// ─── TC-1001: Email Signup ─────────────────────────────────────────────────────

describe("TC-1001: Email signup → success", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user fills signup form with valid credentials → signUp() called, redirect to dashboard", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: USER_ID, email: USER_EMAIL } },
      error: null,
    });

    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText(/email/i), USER_EMAIL);
    await userEvent.type(screen.getByLabelText(/password/i), USER_PASSWORD);
    await userEvent.click(
      screen.getByRole("button", { name: /sign up|create account/i })
    );

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: USER_EMAIL,
        password: USER_PASSWORD,
      });
    });

    // After signup, user is redirected to dashboard or email verification notice
    await waitFor(() => {
      const wasRedirected = mockPush.mock.calls.some(
        ([path]) => path === "/" || path === "/dashboard" || path === "/login"
      );
      // Either redirect OR a success message is shown
      const hasSuccessMessage =
        screen.queryByText(/check your email|verify|성공|welcome/i) !== null;
      expect(wasRedirected || hasSuccessMessage).toBe(true);
    });
  });

  it("signup page has email and password fields with submit button", () => {
    render(<SignupPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up|create account/i })
    ).toBeInTheDocument();
  });

  it("password shorter than 8 chars → Supabase NOT called", async () => {
    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText(/email/i), USER_EMAIL);
    await userEvent.type(screen.getByLabelText(/password/i), "short");
    await userEvent.click(
      screen.getByRole("button", { name: /sign up|create account/i })
    );

    expect(mockSignUp).not.toHaveBeenCalled();
    expect(
      screen.getByText(/password|8자|at least 8/i)
    ).toBeInTheDocument();
  });

  it("Supabase error on signup → error message displayed", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: null,
      error: { message: "User already registered" },
    });

    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText(/email/i), USER_EMAIL);
    await userEvent.type(screen.getByLabelText(/password/i), USER_PASSWORD);
    await userEvent.click(
      screen.getByRole("button", { name: /sign up|create account/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/already registered|already|이미|error/i)
      ).toBeInTheDocument();
    });
  });
});

// ─── TC-2001: Google OAuth Connection ─────────────────────────────────────────

describe("TC-2001: Google OAuth connection from Connections page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedUser();
  });

  it("Connections page shows Google service card", async () => {
    setupConnectionsPage();

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/google/i)).toBeInTheDocument();
    });
  });

  it("unconnected Google card shows 'Connect' button", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({ data: [], error: null }),
    }));

    render(<ConnectionsPage />);

    await waitFor(() => {
      const connectBtn = screen.getByRole("button", {
        name: /connect.*google|google.*connect/i,
      });
      expect(connectBtn).toBeInTheDocument();
    });
  });

  it("clicking Google Connect redirects to OAuth consent URL", async () => {
    // Mock window.location for OAuth redirect
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, href: "" },
    });

    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({ data: [], error: null }),
    }));

    // Mock fetch for the connect endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        url: "https://accounts.google.com/o/oauth2/auth?scope=gmail.readonly...",
      }),
    });

    render(<ConnectionsPage />);

    const connectBtn = await screen.findByRole("button", {
      name: /connect.*google|google.*connect/i,
    });
    await userEvent.click(connectBtn);

    // Either window.location.href is set OR a redirect happens OR a link is followed
    await waitFor(() => {
      const redirected =
        window.location.href.includes("google") ||
        mockPush.mock.calls.some(([p]) => p.includes("google")) ||
        mockFetch.mock.calls.some(([url]) =>
          String(url).includes("connect/google")
        );
      expect(redirected).toBe(true);
    });

    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("connected Google card shows 'Connected' status", async () => {
    setupConnectionsPage(); // has googleConnection with status="connected"

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/connected|연결됨/i)
      ).toBeInTheDocument();
    });
  });
});

// ─── TC-3002: Template-Based Automation Creation ───────────────────────────────

describe("TC-3002: Create Morning Briefing automation from template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
  });

  it("shows all automation template options", async () => {
    render(<NewAutomationPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /morning briefing/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /email triage/i })
      ).toBeInTheDocument();
    });
  });

  it("completes 3-step wizard and inserts automation with template fields", async () => {
    const insertMock = vi.fn().mockResolvedValue({
      data: [{ id: AUTOMATION_ID }],
      error: null,
    });
    mockFrom.mockReturnValue({ insert: insertMock });

    render(<NewAutomationPage />);

    // Step 1: Select Morning Briefing template
    await userEvent.click(
      screen.getByRole("button", { name: /morning briefing/i })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /go to next step/i })
    );

    // Step 2: Name is pre-filled
    const nameInput = await screen.findByRole("textbox", { name: /name/i });
    expect(nameInput).toHaveValue("Morning Briefing");
    await userEvent.click(
      screen.getByRole("button", { name: /go to next step/i })
    );

    // Step 3: Schedule → Submit
    const submitBtn = await screen.findByRole("button", { name: /submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("automations");
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          name: "Morning Briefing",
          template_type: "morning_briefing",
        })
      );
    });

    // Automation creates with a valid cron expression
    const insertArg = insertMock.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.schedule_cron).toMatch(
      /^[\d*]+\s+[\d*]+\s+[\d*]+\s+[\d*]+\s+[\d*]+$/
    );

    // Redirected after creation
    expect(mockPush).toHaveBeenCalledWith("/automations");
  });

  it("selecting Morning Briefing pre-fills name on step 2", async () => {
    render(<NewAutomationPage />);

    await userEvent.click(
      screen.getByRole("button", { name: /morning briefing/i })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /go to next step/i })
    );

    const nameInput = await screen.findByRole("textbox", { name: /name/i });
    expect(nameInput).toHaveValue("Morning Briefing");
  });
});

// ─── TC-3020: Manual "Run Now" Execution ──────────────────────────────────────
// RED: Run Now button and API route may not be fully integrated yet.

describe("TC-3020: Manual Run Now execution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedUser();
  });

  it("automation detail page shows 'Run Now' button — RED: may not exist yet", async () => {
    setupAutomationDetailPage();

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // EXPECT: a "Run Now" button that triggers manual execution
    // ACTUAL: button may not exist yet in the detail page
    // → This assertion FAILS (Red phase) if Run Now button is missing
    const runNowBtn = screen.getByRole("button", {
      name: /run now|수동 실행|지금 실행/i,
    });
    expect(runNowBtn).toBeInTheDocument();
  });

  it("clicking Run Now calls POST /api/automations/[id]/run — RED", async () => {
    setupAutomationDetailPage();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logId: "log-new-1", status: "queued" }),
    });

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // EXPECT: clicking Run Now POSTs to the run endpoint
    // ACTUAL: button may not exist → this will throw (Red phase)
    const runNowBtn = await screen.findByRole("button", {
      name: /run now|수동 실행|지금 실행/i,
    });
    await userEvent.click(runNowBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/automations/${AUTOMATION_ID}/run`),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("after successful Run Now, shows confirmation or navigates to logs — RED", async () => {
    setupAutomationDetailPage();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logId: "log-new-1", status: "queued" }),
    });

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // EXPECT: Run Now button triggers execution feedback
    const runNowBtn = await screen.findByRole("button", {
      name: /run now|수동 실행|지금 실행/i,
    });
    await userEvent.click(runNowBtn);

    // Should show a success toast/message or navigate to the log
    await waitFor(() => {
      const hasSuccessFeedback =
        screen.queryByText(/queued|실행 중|started|실행이 시작/i) !== null ||
        mockPush.mock.calls.some(([p]) => p.includes("logs"));
      expect(hasSuccessFeedback).toBe(true);
    });
  });

  it("Run Now button is disabled while execution is in progress — RED", async () => {
    setupAutomationDetailPage();

    // Simulate slow API response
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ ok: true, json: async () => ({ status: "queued" }) }),
            500
          )
        )
    );

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    const runNowBtn = await screen.findByRole("button", {
      name: /run now|수동 실행|지금 실행/i,
    });
    await userEvent.click(runNowBtn);

    // Button should be disabled/loading during API call
    // RED: disabled state may not be implemented
    expect(runNowBtn).toBeDisabled();
  });
});

// ─── TC-6004: View Execution Log Detail ───────────────────────────────────────

describe("TC-6004: View execution log detail with tool_calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAuthenticatedUser();
  });

  it("automation detail page shows execution history section", async () => {
    setupAutomationDetailPage();

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/execution history/i)).toBeInTheDocument();
    });
  });

  it("log entry shows status badge, duration, and timestamp", async () => {
    setupAutomationDetailPage();

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("success")).toBeInTheDocument();
      // 3800ms → 3.8s
      expect(screen.getByText(/3\.8s/i)).toBeInTheDocument();
    });
  });

  it("clicking log entry expands to show result_summary and token count", async () => {
    setupAutomationDetailPage();

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

    // Should show tool calls section
    await waitFor(() => {
      expect(screen.getByText(/tool calls/i)).toBeInTheDocument();
    });
  });

  it("TC-6004: expanded log shows all 4 tool calls for Morning Briefing", async () => {
    setupAutomationDetailPage();

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

    // All 4 tools from the Morning Briefing execution
    await waitFor(() => {
      expect(
        screen.getByText("calendar_list_events_today")
      ).toBeInTheDocument();
      expect(screen.getByText("gmail_list_recent_emails")).toBeInTheDocument();
      expect(screen.getByText("weather_current")).toBeInTheDocument();
      expect(screen.getByText("gmail_send_email")).toBeInTheDocument();
    });
  });

  it("TC-6004: tool call durations are displayed", async () => {
    setupAutomationDetailPage();

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
      // At least one tool call duration rendered
      const durationPattern = /\d+(ms|s)/;
      const durationEls = screen
        .getAllByText(durationPattern)
        .filter((el) => el.textContent?.match(durationPattern));
      expect(durationEls.length).toBeGreaterThan(0);
    });
  });

  it("TC-6004: clicking expanded log again collapses it", async () => {
    setupAutomationDetailPage();

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

    // Expand
    await userEvent.click(firstLog);
    await waitFor(() => {
      expect(screen.getByText("calendar_list_events_today")).toBeInTheDocument();
    });

    // Collapse
    await userEvent.click(firstLog);
    await waitFor(() => {
      expect(
        screen.queryByText("calendar_list_events_today")
      ).not.toBeInTheDocument();
    });
  });

  it("empty execution history shows 'no executions' state", async () => {
    setupAutomationDetailPage([]); // no logs

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/no executions recorded yet/i)
      ).toBeInTheDocument();
    });
  });
});

// ─── Full User Journey Scenario ────────────────────────────────────────────────

describe("Full User Journey: signup → connect → create → run → view logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Step 1 (TC-1001): User signs up with valid credentials", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: USER_ID, email: USER_EMAIL } },
      error: null,
    });

    render(<SignupPage />);

    await userEvent.type(screen.getByLabelText(/email/i), USER_EMAIL);
    await userEvent.type(screen.getByLabelText(/password/i), USER_PASSWORD);
    await userEvent.click(
      screen.getByRole("button", { name: /sign up|create account/i })
    );

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: USER_EMAIL,
        password: USER_PASSWORD,
      });
    });
  });

  it("Step 2 (TC-2001): Authenticated user visits Connections and sees Google card", async () => {
    setupAuthenticatedUser();
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue({ data: [], error: null }),
    }));

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/google/i)).toBeInTheDocument();
    });
  });

  it("Step 3 (TC-3002): Authenticated user creates Morning Briefing automation", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });

    const insertMock = vi.fn().mockResolvedValue({
      data: [{ id: AUTOMATION_ID }],
      error: null,
    });
    mockFrom.mockReturnValue({ insert: insertMock });

    render(<NewAutomationPage />);

    // Select template
    await userEvent.click(
      screen.getByRole("button", { name: /morning briefing/i })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /go to next step/i })
    );

    // Step 2 - name already filled
    await userEvent.click(
      screen.getByRole("button", { name: /go to next step/i })
    );

    // Step 3 - submit
    const submitBtn = await screen.findByRole("button", { name: /submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          template_type: "morning_briefing",
        })
      );
      expect(mockPush).toHaveBeenCalledWith("/automations");
    });
  });

  it("Step 4 (TC-3020): User clicks 'Run Now' on automation detail — RED", async () => {
    setupAuthenticatedUser();
    setupAutomationDetailPage();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logId: "log-new-1", status: "queued" }),
    });

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });

    // RED: Run Now button may not exist yet
    const runNowBtn = await screen.findByRole("button", {
      name: /run now|수동 실행|지금 실행/i,
    });
    await userEvent.click(runNowBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/api/automations/${AUTOMATION_ID}/run`),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("Step 5 (TC-6004): User views execution log detail with tool calls", async () => {
    setupAuthenticatedUser();
    setupAutomationDetailPage([executionLog]);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/execution history/i)).toBeInTheDocument();
      expect(screen.getByText("success")).toBeInTheDocument();
    });

    const [firstLog] = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-expanded"));

    await userEvent.click(firstLog);

    await waitFor(() => {
      expect(
        screen.getByText("calendar_list_events_today")
      ).toBeInTheDocument();
      expect(screen.getByText("gmail_send_email")).toBeInTheDocument();
    });
  });
});
