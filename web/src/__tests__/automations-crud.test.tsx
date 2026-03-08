/**
 * Automations CRUD Tests — TC-3001, TC-3002, TC-3003, TC-3004, TC-3005, TC-3006
 * TDD Red Phase: Delete confirmation modal (TC-3005) FAILS until modal is added to AutomationsPage.
 *
 * Tests validate:
 * - TC-3001: Create automation form validation (template required, name required)
 * - TC-3002: Create automation → INSERT into automations table → redirect to /automations
 * - TC-3003: Automations list fetches only current user's records (.eq('user_id', userId))
 * - TC-3004: Toggle active/paused → UPDATE status in DB
 * - TC-3005: Delete automation → confirmation modal → DELETE from DB  ← RED: no modal yet
 * - TC-3006: Automation detail page shows execution history logs
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AutomationsPage from "@/app/(dashboard)/automations/page";
import NewAutomationPage from "@/app/(dashboard)/automations/new/page";
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

const USER_ID = "user-abc";

const sampleAutomations = [
  {
    id: "auto-1",
    user_id: USER_ID,
    name: "Morning Briefing",
    template_type: "morning_briefing",
    status: "active",
    last_run_at: "2026-03-04T08:00:00Z",
    next_run_at: "2026-03-05T08:00:00Z",
    schedule_cron: "0 8 * * *",
  },
  {
    id: "auto-2",
    user_id: USER_ID,
    name: "Email Triage",
    template_type: "email_triage",
    status: "paused",
    last_run_at: null,
    next_run_at: null,
    schedule_cron: "0 9 * * *",
  },
];

const automationDetail = {
  id: "automation-123",
  user_id: USER_ID,
  name: "Morning Briefing",
  description: "Daily morning summary",
  template_type: "morning_briefing",
  status: "active",
  schedule_cron: "0 8 * * *",
  last_run_at: "2026-03-04T08:00:00Z",
  next_run_at: "2026-03-05T08:00:00Z",
  created_at: "2026-02-01T00:00:00Z",
};

const executionLogs = [
  {
    id: "log-1",
    status: "success",
    duration_ms: 3200,
    created_at: "2026-03-04T08:00:05Z",
    tool_calls: [
      {
        id: "tc-1",
        toolName: "calendar_list_events_today",
        input: { date: "2026-03-04" },
        output: { events: [] },
        duration: 1200,
        status: "success",
      },
    ],
  },
  {
    id: "log-2",
    status: "error",
    duration_ms: 500,
    created_at: "2026-03-03T08:00:05Z",
    tool_calls: [],
  },
];

// ─── Helper: build a Supabase query chain for list queries ───────────────────
// Chains: .from(table).select(...).eq(...).order(...) → resolves
function makeListChain(resolvedData: unknown[], resolvedError: unknown = null) {
  const result = { data: resolvedData, error: resolvedError };
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
    // for mutation
    insert: vi.fn().mockResolvedValue({ data: [{ id: "new-id" }], error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  };
  (chain as Record<string, unknown>)["select"] = vi.fn().mockReturnValue(chain);
  (chain as Record<string, unknown>)["eq"] = vi.fn().mockReturnValue(chain);
  (chain as Record<string, unknown>)["order"] = vi.fn().mockResolvedValue(result);
  (chain as Record<string, unknown>)["limit"] = vi.fn().mockResolvedValue(result);
  (chain as Record<string, unknown>)["update"] = vi.fn().mockReturnValue(chain);
  (chain as Record<string, unknown>)["delete"] = vi.fn().mockReturnValue(chain);
  return chain;
}

// Helper for detail page: .select().eq().single() chain
function makeSingleChain(resolvedData: unknown) {
  const result = { data: resolvedData, error: null };
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

// ─── AutomationsPage Tests ────────────────────────────────────────────────────

describe("AutomationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
  });

  // TC-3003: RLS — only fetch current user's automations
  describe("TC-3003: Automations list — RLS enforcement", () => {
    it("queries automations filtered by current user_id", async () => {
      const chain = makeListChain(sampleAutomations);
      mockFrom.mockReturnValue(chain);

      render(<AutomationsPage />);

      await waitFor(() => {
        expect(mockFrom).toHaveBeenCalledWith("automations");
        // eq('user_id', userId) must be called to enforce RLS on client side
        expect(chain.eq).toHaveBeenCalledWith("user_id", USER_ID);
      });
    });

    it("displays automation cards for fetched automations", async () => {
      const chain = makeListChain([]);
      // Simulate select chain resolving to our data
      (chain.select as ReturnType<typeof vi.fn>).mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: sampleAutomations, error: null }),
        }),
      });
      mockFrom.mockReturnValue(chain);

      render(<AutomationsPage />);

      await waitFor(() => {
        expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
        expect(screen.getByText("Email Triage")).toBeInTheDocument();
      });
    });

    it("shows empty state with CTA when user has 0 automations", async () => {
      (chain => {
        (chain.select as ReturnType<typeof vi.fn>).mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        });
        mockFrom.mockReturnValue(chain);
      })(makeListChain([]));

      render(<AutomationsPage />);

      await waitFor(() => {
        expect(screen.getByText(/no automations yet/i)).toBeInTheDocument();
      });

      // CTA should link/navigate to create
      expect(
        screen.getByRole("link", { name: /create automation/i })
      ).toBeInTheDocument();
    });
  });

  // TC-3004: Toggle active ↔ paused
  describe("TC-3004: Toggle automation status", () => {
    function setupAutomationsList(automations: typeof sampleAutomations) {
      const updateEq = vi.fn().mockResolvedValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: updateEq });
      const deleteEq = vi.fn().mockResolvedValue({ error: null });
      const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq });

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: automations, error: null }),
          }),
        }),
        update: updateFn,
        delete: deleteFn,
      }));

      return { updateFn, updateEq, deleteFn, deleteEq };
    }

    it("clicking '일시정지' on active automation calls UPDATE status='paused'", async () => {
      const { updateFn, updateEq } = setupAutomationsList([sampleAutomations[0]]);

      render(<AutomationsPage />);

      const pauseBtn = await screen.findByRole("button", {
        name: /morning briefing 일시정지/i,
      });
      await userEvent.click(pauseBtn);

      await waitFor(() => {
        expect(updateFn).toHaveBeenCalledWith({ status: "paused" });
        expect(updateEq).toHaveBeenCalledWith("id", "auto-1");
      });

      // Badge should update to '일시정지'
      await waitFor(() => {
        expect(screen.getByText("일시정지")).toBeInTheDocument();
      });
    });

    it("clicking '재개' on paused automation calls UPDATE status='active'", async () => {
      const { updateFn, updateEq } = setupAutomationsList([sampleAutomations[1]]);

      render(<AutomationsPage />);

      const activateBtn = await screen.findByRole("button", {
        name: /email triage 재개/i,
      });
      await userEvent.click(activateBtn);

      await waitFor(() => {
        expect(updateFn).toHaveBeenCalledWith({ status: "active" });
        expect(updateEq).toHaveBeenCalledWith("id", "auto-2");
      });
    });
  });

  // TC-3005: Delete with confirmation modal — RED: no modal in current implementation
  describe("TC-3005: Delete automation — confirmation modal", () => {
    function setupWithOneAutomation() {
      const deleteEq = vi.fn().mockResolvedValue({ error: null });
      const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq });

      mockFrom.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [sampleAutomations[0]],
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        delete: deleteFn,
      }));

      return { deleteFn, deleteEq };
    }

    it("clicking '삭제' shows a confirmation modal before deleting (RED: no modal currently)", async () => {
      setupWithOneAutomation();

      render(<AutomationsPage />);

      const deleteBtn = await screen.findByRole("button", {
        name: /morning briefing 삭제/i,
      });
      await userEvent.click(deleteBtn);

      // EXPECT: a confirmation dialog appears
      // ACTUAL: AutomationsPage.handleDelete() deletes immediately without a modal
      // → This assertion FAILS (Red phase)
      await waitFor(() => {
        expect(screen.getByRole("dialog")).toBeInTheDocument();
      });

      expect(
        screen.getByText(/삭제.*확인|정말 삭제|이 자동화를 삭제/i)
      ).toBeInTheDocument();
    });

    it("confirming in modal calls DELETE and removes card from list", async () => {
      const { deleteFn, deleteEq } = setupWithOneAutomation();

      render(<AutomationsPage />);

      const deleteBtn = await screen.findByRole("button", {
        name: /morning briefing 삭제/i,
      });
      await userEvent.click(deleteBtn);

      // Find confirm button in modal (will fail if no modal, see above)
      const confirmBtn = await screen.findByRole("button", {
        name: /확인|삭제 확인|delete/i,
      });
      await userEvent.click(confirmBtn);

      await waitFor(() => {
        expect(deleteFn).toHaveBeenCalled();
        expect(deleteEq).toHaveBeenCalledWith("id", "auto-1");
      });

      // Modal should close
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Card removed from list
      await waitFor(() => {
        expect(screen.queryByText("Morning Briefing")).not.toBeInTheDocument();
      });
    });

    it("cancelling delete modal does NOT call DELETE", async () => {
      const { deleteFn } = setupWithOneAutomation();

      render(<AutomationsPage />);

      const deleteBtn = await screen.findByRole("button", {
        name: /morning briefing 삭제/i,
      });
      await userEvent.click(deleteBtn);

      const cancelBtn = await screen.findByRole("button", { name: /취소|cancel/i });
      await userEvent.click(cancelBtn);

      expect(deleteFn).not.toHaveBeenCalled();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      // Automation should still be in list
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
    });
  });
});

// ─── NewAutomationPage Tests ──────────────────────────────────────────────────

describe("NewAutomationPage — TC-3001, TC-3002", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
  });

  describe("TC-3001: Create automation form validation", () => {
    it("clicking Next without selecting a template shows validation error", async () => {
      render(<NewAutomationPage />);

      // Step 1: Choose Template — nothing selected
      const nextBtn = screen.getByRole("button", { name: /go to next step/i });
      await userEvent.click(nextBtn);

      // Validation error should appear
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          /please complete|required|select.*template/i
        );
      });

      // Still on step 1
      expect(screen.getByRole('region', { name: /choose template/i })).toBeInTheDocument();
    });

    it("clicking Next with an empty name field shows validation error", async () => {
      render(<NewAutomationPage />);

      // Step 1: Select Morning Briefing
      await userEvent.click(
        screen.getByRole("button", { name: /morning briefing/i })
      );
      await userEvent.click(
        screen.getByRole("button", { name: /go to next step/i })
      );

      // Step 2: Configure — clear the name
      const nameInput = await screen.findByRole("textbox", { name: /name/i });
      await userEvent.clear(nameInput);

      await userEvent.click(
        screen.getByRole("button", { name: /go to next step/i })
      );

      // Validation error should appear
      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(
          /please complete|required/i
        );
      });
    });

    it("template button shows aria-pressed=true when selected", async () => {
      render(<NewAutomationPage />);

      const morningBriefingBtn = screen.getByRole("button", {
        name: /morning briefing/i,
      });
      expect(morningBriefingBtn).toHaveAttribute("aria-pressed", "false");

      await userEvent.click(morningBriefingBtn);

      expect(morningBriefingBtn).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("TC-3002: Create automation → INSERT → redirect to /automations", () => {
    it("completes wizard and inserts automation with correct fields", async () => {
      const insertMock = vi.fn().mockResolvedValue({
        data: [{ id: "new-auto-1" }],
        error: null,
      });
      mockFrom.mockReturnValue({ insert: insertMock });

      render(<NewAutomationPage />);

      // Step 1: Select template
      await userEvent.click(
        screen.getByRole("button", { name: /morning briefing/i })
      );
      await userEvent.click(
        screen.getByRole("button", { name: /go to next step/i })
      );

      // Step 2: Name is pre-filled with template label
      const nameInput = await screen.findByRole("textbox", { name: /name/i });
      expect(nameInput).toHaveValue("Morning Briefing");
      await userEvent.click(
        screen.getByRole("button", { name: /go to next step/i })
      );

      // Step 3: Schedule — submit
      const submitBtn = await screen.findByRole("button", { name: /submit/i });
      await userEvent.click(submitBtn);

      // INSERT called with correct data
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

      // schedule_cron must be a valid 5-part cron string
      const insertArg = insertMock.mock.calls[0][0] as Record<string, unknown>;
      expect(insertArg.schedule_cron).toMatch(
        /^[\d*]+\s+[\d*]+\s+[\d*]+\s+[\d*]+\s+[\d*]+$/
      );

      // Redirected to /automations
      expect(mockPush).toHaveBeenCalledWith("/automations");
    });

    it("all 3 templates (Morning Briefing, Email Triage, Reading Digest) are selectable", async () => {
      render(<NewAutomationPage />);

      expect(
        screen.getByRole("button", { name: /morning briefing/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /email triage/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reading digest/i })
      ).toBeInTheDocument();
    });

    it("selecting a template pre-fills the name field on step 2", async () => {
      render(<NewAutomationPage />);

      await userEvent.click(
        screen.getByRole("button", { name: /email triage/i })
      );
      await userEvent.click(
        screen.getByRole("button", { name: /go to next step/i })
      );

      const nameInput = await screen.findByRole("textbox", { name: /name/i });
      expect(nameInput).toHaveValue("Email Triage");
    });
  });
});

// ─── AutomationDetailPage Tests ───────────────────────────────────────────────

describe("AutomationDetailPage — TC-3006: Execution History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
  });

  function setupDetailPage(logs: typeof executionLogs) {
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

  it("TC-3006: shows execution history section with status badges", async () => {
    setupDetailPage(executionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/execution history/i)).toBeInTheDocument();
    });

    expect(screen.getByText("success")).toBeInTheDocument();
    expect(screen.getByText("error")).toBeInTheDocument();
  });

  it("TC-3006: shows duration for each execution log", async () => {
    setupDetailPage(executionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      // 3200ms = 3.2s
      expect(screen.getByText(/3\.2s/i)).toBeInTheDocument();
    });
  });

  it("TC-3006: clicking a log entry expands ToolCallsTimeline", async () => {
    setupDetailPage(executionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("success")).toBeInTheDocument();
    });

    // First execution row button should be aria-expanded="false" initially
    const executionButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-expanded"));

    expect(executionButtons.length).toBeGreaterThan(0);
    expect(executionButtons[0]).toHaveAttribute("aria-expanded", "false");

    // Click to expand
    await userEvent.click(executionButtons[0]);

    await waitFor(() => {
      expect(executionButtons[0]).toHaveAttribute("aria-expanded", "true");
    });

    // ToolCallsTimeline should display tool name
    await waitFor(() => {
      expect(
        screen.getByText("calendar_list_events_today")
      ).toBeInTheDocument();
    });
  });

  it("TC-3006: clicking the same log entry again collapses the timeline", async () => {
    setupDetailPage(executionLogs);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("success")).toBeInTheDocument();
    });

    const executionButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("aria-expanded"));

    // Expand
    await userEvent.click(executionButtons[0]);
    await waitFor(() => {
      expect(screen.getByText("calendar_list_events_today")).toBeInTheDocument();
    });

    // Collapse (click again)
    await userEvent.click(executionButtons[0]);
    await waitFor(() => {
      expect(
        screen.queryByText("calendar_list_events_today")
      ).not.toBeInTheDocument();
    });
  });

  it("TC-3006: shows empty state when no execution history exists", async () => {
    setupDetailPage([]);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/no executions recorded yet/i)
      ).toBeInTheDocument();
    });
  });

  it("shows automation name and status badge in header", async () => {
    setupDetailPage([]);

    render(<AutomationDetailPage />);

    await waitFor(() => {
      expect(screen.getByText("Morning Briefing")).toBeInTheDocument();
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });
});
