/**
 * Automation Edit Tests — TC-3018, TC-3019
 * TDD Red Phase: Edit page is a stub — all feature assertions FAIL until implemented.
 *
 * Tests validate:
 * - TC-3018: Edit agent_prompt text → saves to database
 * - TC-3019: Change schedule (daily → weekly) → updates schedule_cron via UPDATE
 * - Edit page renders with current automation data (name, prompt, schedule)
 * - Cancel button returns to automation list without saving
 * - Validation: empty prompt shows error, does NOT call UPDATE
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditAutomationPage from "@/app/(dashboard)/automations/[id]/edit/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
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

const automationDetail = {
  id: "automation-123",
  user_id: USER_ID,
  name: "Morning Briefing",
  description: "Daily morning summary",
  template_type: "morning_briefing",
  status: "active",
  schedule_cron: "0 8 * * *",
  agent_prompt: "Summarize my morning schedule and important emails",
  created_at: "2026-02-01T00:00:00Z",
};

// ─── Setup helper ─────────────────────────────────────────────────────────────

function setupEditPage() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  });

  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

  mockFrom.mockImplementation((table: string) => {
    if (table === "automations") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi
          .fn()
          .mockResolvedValue({ data: automationDetail, error: null }),
        update: updateFn,
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  return { updateFn, updateEq };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EditAutomationPage — renders with current data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Edit Automation' heading — RED: stub returns plain text", async () => {
    setupEditPage();
    render(<EditAutomationPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /edit automation|자동화 수정/i })
      ).toBeInTheDocument();
    });
  });

  it("renders input pre-filled with automation name — RED: stub has no form", async () => {
    setupEditPage();
    render(<EditAutomationPage />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue("Morning Briefing")
      ).toBeInTheDocument();
    });
  });

  it("renders agent_prompt textarea pre-filled with current prompt — RED: stub has no form", async () => {
    setupEditPage();
    render(<EditAutomationPage />);

    await waitFor(() => {
      expect(
        screen.getByDisplayValue(
          "Summarize my morning schedule and important emails"
        )
      ).toBeInTheDocument();
    });
  });

  it("shows SchedulePicker with current cron value — RED: stub has no SchedulePicker", async () => {
    setupEditPage();
    render(<EditAutomationPage />);

    await waitFor(() => {
      // SchedulePicker should render a frequency selector
      expect(
        screen.getByRole("combobox", { name: /frequency|빈도/i })
      ).toBeInTheDocument();
    });
  });
});

// ─── TC-3018: Edit agent_prompt ────────────────────────────────────────────────

describe("TC-3018: Edit agent_prompt → saves to database", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prompt textarea is editable — RED: stub has no textarea", async () => {
    setupEditPage();
    render(<EditAutomationPage />);

    const promptField = await screen.findByRole("textbox", {
      name: /prompt|프롬프트/i,
    });
    await userEvent.clear(promptField);
    await userEvent.type(promptField, "New custom prompt");

    expect(promptField).toHaveValue("New custom prompt");
  });

  it("TC-3018: Save calls UPDATE automations with new agent_prompt — RED: stub has no Save", async () => {
    const { updateFn, updateEq } = setupEditPage();
    render(<EditAutomationPage />);

    const promptField = await screen.findByRole("textbox", {
      name: /prompt|프롬프트/i,
    });
    await userEvent.clear(promptField);
    await userEvent.type(promptField, "Updated briefing prompt");

    const saveBtn = screen.getByRole("button", { name: /save|저장/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("automations");
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_prompt: "Updated briefing prompt",
        })
      );
      expect(updateEq).toHaveBeenCalledWith("id", "automation-123");
    });
  });

  it("TC-3018: successful Save redirects to automation detail page — RED: stub has no navigation", async () => {
    setupEditPage();
    render(<EditAutomationPage />);

    await screen.findByRole("textbox", { name: /prompt|프롬프트/i });
    const saveBtn = screen.getByRole("button", { name: /save|저장/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining("automation-123")
      );
    });
  });
});

// ─── TC-3019: Change schedule → updates schedule_cron ─────────────────────────

describe("TC-3019: Change schedule (daily → weekly) → updates schedule_cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-3019: frequency dropdown exists and allows changing to weekly — RED: no SchedulePicker", async () => {
    setupEditPage();
    render(<EditAutomationPage />);

    const frequencySelect = await screen.findByRole("combobox", {
      name: /frequency|빈도/i,
    });
    // Current automation is daily (0 8 * * *)
    expect(frequencySelect).toBeInTheDocument();

    // Change to weekly
    await userEvent.selectOptions(frequencySelect, "weekly");
    expect(frequencySelect).toHaveValue("weekly");
  });

  it("TC-3019: Save with weekly schedule calls UPDATE with valid weekly cron — RED: stub has no logic", async () => {
    const { updateFn, updateEq } = setupEditPage();
    render(<EditAutomationPage />);

    const frequencySelect = await screen.findByRole("combobox", {
      name: /frequency|빈도/i,
    });
    await userEvent.selectOptions(frequencySelect, "weekly");

    const saveBtn = screen.getByRole("button", { name: /save|저장/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          // Weekly cron: day-of-week field is 0-7 (not *)
          schedule_cron: expect.stringMatching(/^\d+ \d+ \* \* [0-7]$/),
        })
      );
      expect(updateEq).toHaveBeenCalledWith("id", "automation-123");
    });
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe("Validation: empty agent_prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows error message when prompt is cleared and Save clicked — RED: no validation in stub", async () => {
    setupEditPage();
    render(<EditAutomationPage />);

    const promptField = await screen.findByRole("textbox", {
      name: /prompt|프롬프트/i,
    });
    await userEvent.clear(promptField);

    const saveBtn = screen.getByRole("button", { name: /save|저장/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/required|필수|prompt.*empty|프롬프트.*입력/i)
      ).toBeInTheDocument();
    });
  });

  it("does NOT call UPDATE when prompt is empty — RED: stub has no UPDATE logic", async () => {
    const { updateFn } = setupEditPage();
    render(<EditAutomationPage />);

    const promptField = await screen.findByRole("textbox", {
      name: /prompt|프롬프트/i,
    });
    await userEvent.clear(promptField);

    const saveBtn = screen.getByRole("button", { name: /save|저장/i });
    await userEvent.click(saveBtn);

    expect(updateFn).not.toHaveBeenCalled();
  });
});

// ─── Cancel button ────────────────────────────────────────────────────────────

describe("Cancel button returns to list without saving", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Cancel button exists on the edit page — RED: stub has no Cancel button", async () => {
    setupEditPage();
    render(<EditAutomationPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cancel|취소/i })
      ).toBeInTheDocument();
    });
  });

  it("clicking Cancel does NOT call UPDATE and navigates away — RED: stub has no navigation", async () => {
    const { updateFn } = setupEditPage();
    render(<EditAutomationPage />);

    await screen.findByRole("button", { name: /cancel|취소/i });
    const cancelBtn = screen.getByRole("button", { name: /cancel|취소/i });
    await userEvent.click(cancelBtn);

    expect(updateFn).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringMatching(/automations/)
    );
  });
});
