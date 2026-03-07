/**
 * Schedule Settings Tests — TC-3009, TC-3010
 * TDD Red Phase
 *
 * Tests validate:
 * - TC-3009: Daily 7am preset → onChange fires "0 7 * * *"
 * - TC-3010: Weekly Monday 9am → onChange fires "0 9 * * 1"
 * - Custom cron input → valid cron passthrough
 * - Invalid cron input → validation error (RED: SchedulePicker has no validation)
 * - Timezone from SchedulePicker → saved in automation (RED: NewAutomationPage hardcodes UTC)
 *
 * FAILURES expected:
 * - "typing invalid cron → validation error" — RED: SchedulePicker passes invalid expression through
 * - "saving automation uses timezone from SchedulePicker" — RED: hardcoded timezone: 'UTC'
 * - "Seoul timezone + 7am → UTC cron saved" — RED: no UTC conversion implemented
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SchedulePicker } from "@/components/pickers/SchedulePicker";
import NewAutomationPage from "@/app/(dashboard)/automations/new/page";

// jsdom does not implement scrollIntoView — mock it globally
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

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

async function openSelectAndChoose(combobox: HTMLElement, optionName: string | RegExp) {
  await userEvent.click(combobox);
  const option = await screen.findByRole("option", { name: optionName });
  await userEvent.click(option);
}

// ─── SchedulePicker Component Tests ───────────────────────────────────────────

describe("SchedulePicker — TC-3009: Daily preset", () => {
  it("renders Daily radio button as selected by default", () => {
    render(<SchedulePicker />);
    const dailyBtn = screen.getByRole("radio", { name: "Daily" });
    expect(dailyBtn).toHaveAttribute("aria-checked", "true");
  });

  it("default daily preset shows hour 09 and minute 00", () => {
    render(<SchedulePicker />);
    // Hour Select shows "09" (value '9'), Minute shows "00" (value '0')
    expect(screen.getByText("09")).toBeInTheDocument();
    expect(screen.getByText("00")).toBeInTheDocument();
  });

  it("TC-3009: daily preset + hour=7 → onChange fires '0 7 * * *'", async () => {
    const onChange = vi.fn();
    render(<SchedulePicker onChange={onChange} />);

    // Daily preset is default. Change hour from 9 to 7.
    // Hour combobox is first combobox rendered (daily: Hour, Minute, Timezone)
    const comboboxes = screen.getAllByRole("combobox");
    await openSelectAndChoose(comboboxes[0], "07");

    expect(onChange).toHaveBeenLastCalledWith("0 7 * * *");
  });

  it("TC-3009: rendering with value='0 7 * * *' shows cron in preview", () => {
    render(<SchedulePicker value="0 7 * * *" />);
    expect(screen.getByText("0 7 * * *")).toBeInTheDocument();
  });

  it("TC-3009: rendering with value='0 7 * * *' shows human-readable 'Every day at 07:00'", () => {
    render(<SchedulePicker value="0 7 * * *" />);
    expect(screen.getByText("Every day at 07:00")).toBeInTheDocument();
  });

  it("daily preset + hour=7, minute=30 → onChange fires '30 7 * * *'", async () => {
    const onChange = vi.fn();
    render(<SchedulePicker onChange={onChange} />);

    const comboboxes = screen.getAllByRole("combobox");
    // Change hour to 7
    await openSelectAndChoose(comboboxes[0], "07");
    // Change minute to 30
    await openSelectAndChoose(comboboxes[1], "30");

    expect(onChange).toHaveBeenLastCalledWith("30 7 * * *");
  });
});

describe("SchedulePicker — TC-3010: Weekly preset", () => {
  it("TC-3010: clicking Weekly preset → onChange fires '0 9 * * 1' (Mon 9am default)", async () => {
    const onChange = vi.fn();
    render(<SchedulePicker onChange={onChange} />);

    const weeklyBtn = screen.getByRole("radio", { name: "Weekly" });
    await userEvent.click(weeklyBtn);

    // Default weekly: hour='9', minute='0', dayOfWeek='1' (Monday) → "0 9 * * 1"
    expect(onChange).toHaveBeenLastCalledWith("0 9 * * 1");
  });

  it("TC-3010: weekly preset with value='0 9 * * 1' shows 'Every Monday at 09:00'", () => {
    render(<SchedulePicker value="0 9 * * 1" />);
    expect(screen.getByText("Every Monday at 09:00")).toBeInTheDocument();
  });

  it("TC-3010: weekly preset shows Day of week selector", () => {
    render(<SchedulePicker value="0 9 * * 1" />);
    expect(screen.getByText(/day of week/i)).toBeInTheDocument();
  });

  it("weekly preset + selecting Tuesday → onChange fires '0 9 * * 2'", async () => {
    const onChange = vi.fn();
    render(<SchedulePicker value="0 9 * * 1" onChange={onChange} />);

    // In weekly mode: comboboxes are Hour(0), Minute(1), DayOfWeek(2), Timezone(3)
    const comboboxes = screen.getAllByRole("combobox");
    await openSelectAndChoose(comboboxes[2], "Tuesday");

    expect(onChange).toHaveBeenLastCalledWith("0 9 * * 2");
  });

  it("weekly preset shows 'Every Tuesday at 09:00' for '0 9 * * 2'", () => {
    render(<SchedulePicker value="0 9 * * 2" />);
    expect(screen.getByText("Every Tuesday at 09:00")).toBeInTheDocument();
  });

  it("weekly Mon 9am cron preview shows '0 9 * * 1'", () => {
    render(<SchedulePicker value="0 9 * * 1" />);
    expect(screen.getByText("0 9 * * 1")).toBeInTheDocument();
  });
});

describe("SchedulePicker — Custom cron input", () => {
  it("clicking Custom preset shows cron expression textbox", async () => {
    render(<SchedulePicker />);

    const customBtn = screen.getByRole("radio", { name: "Custom" });
    await userEvent.click(customBtn);

    expect(
      screen.getByRole("textbox", { name: /custom cron expression/i })
    ).toBeInTheDocument();
  });

  it("Custom preset hides Hour/Minute selects", async () => {
    render(<SchedulePicker />);

    const comboboxesBefore = screen.getAllByRole("combobox");
    const dailyCount = comboboxesBefore.length; // Hour, Minute, Timezone = 3

    const customBtn = screen.getByRole("radio", { name: "Custom" });
    await userEvent.click(customBtn);

    const comboboxesAfter = screen.getAllByRole("combobox");
    // Custom mode: only Timezone combobox remains
    expect(comboboxesAfter.length).toBeLessThan(dailyCount);
  });

  it("typing a valid cron → onChange fires with that cron", async () => {
    const onChange = vi.fn();
    render(<SchedulePicker onChange={onChange} />);

    const customBtn = screen.getByRole("radio", { name: "Custom" });
    await userEvent.click(customBtn);

    const cronInput = screen.getByRole("textbox", { name: /custom cron expression/i });
    await userEvent.clear(cronInput);
    await userEvent.type(cronInput, "30 6 * * 1-5");

    expect(onChange).toHaveBeenLastCalledWith("30 6 * * 1-5");
  });

  // RED: SchedulePicker has no validation — passes invalid expressions through without error
  it("typing an invalid cron → shows validation error (RED: no validation yet)", async () => {
    render(<SchedulePicker />);

    const customBtn = screen.getByRole("radio", { name: "Custom" });
    await userEvent.click(customBtn);

    const cronInput = screen.getByRole("textbox", { name: /custom cron expression/i });
    await userEvent.type(cronInput, "not-a-valid-cron");

    // RED: No validation exists — SchedulePicker passes the string through unchanged
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/invalid.*cron|cron.*invalid/i);
  });

  // RED: No empty cron validation
  it("clearing custom cron input → validation error (RED: no empty validation)", async () => {
    render(<SchedulePicker />);

    const customBtn = screen.getByRole("radio", { name: "Custom" });
    await userEvent.click(customBtn);

    const cronInput = screen.getByRole("textbox", { name: /custom cron expression/i });
    await userEvent.clear(cronInput);
    await userEvent.tab();

    // RED: No empty string validation in SchedulePicker
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});

describe("SchedulePicker — Timezone selector", () => {
  it("renders timezone combobox with default 'UTC'", () => {
    render(<SchedulePicker />);
    expect(screen.getByText("UTC")).toBeInTheDocument();
  });

  it("timezone dropdown contains Asia/Seoul option", async () => {
    render(<SchedulePicker />);

    const comboboxes = screen.getAllByRole("combobox");
    const timezoneCombobox = comboboxes[comboboxes.length - 1];
    await userEvent.click(timezoneCombobox);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Seoul/i })).toBeInTheDocument();
    });
  });

  it("selecting Asia/Seoul timezone calls onChange (cron unchanged)", async () => {
    const onChange = vi.fn();
    render(<SchedulePicker onChange={onChange} />);

    const comboboxes = screen.getAllByRole("combobox");
    const timezoneCombobox = comboboxes[comboboxes.length - 1];
    await openSelectAndChoose(timezoneCombobox, /Seoul/i);

    // onChange IS called after timezone change (internal state update triggers rebuild)
    expect(onChange).toHaveBeenCalled();
  });
});

// ─── NewAutomationPage Schedule Step Integration ──────────────────────────────

describe("NewAutomationPage — Schedule step (Step 3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  async function navigateToScheduleStep() {
    await userEvent.click(screen.getByRole("button", { name: /morning briefing/i }));
    await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));
    await screen.findByRole("textbox", { name: /name/i });
    await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));
    await screen.findByRole("radiogroup", { name: /schedule frequency/i });
  }

  it("Step 3 renders SchedulePicker with Morning Briefing default cron '0 8 * * *'", async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockResolvedValue({ data: [{ id: "new-id" }], error: null }),
    });

    render(<NewAutomationPage />);
    await navigateToScheduleStep();

    // Morning Briefing defaultCron is "0 8 * * *"
    expect(screen.getByText("0 8 * * *")).toBeInTheDocument();
    expect(screen.getByText("Every day at 08:00")).toBeInTheDocument();
  });

  it("TC-3009: changing schedule to daily 7am saves '0 7 * * *'", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "new-id" }),
    });
    global.fetch = fetchMock as typeof fetch;

    render(<NewAutomationPage />);
    await navigateToScheduleStep();

    // Change hour to 7
    const comboboxes = screen.getAllByRole("combobox");
    await openSelectAndChoose(comboboxes[0], "07");

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/automations",
        expect.objectContaining({
          body: expect.stringContaining("0 7 * * *"),
        })
      );
    });
  });

  // TC-3010: Switching to Weekly preset → weekly cron pattern saved.
  // Note: Morning Briefing default is 8am ("0 8 * * *"), so switching to Weekly
  // gives "0 8 * * 1" (Mon 8am). The exact "0 9 * * 1" case is tested via
  // SchedulePicker unit test (TC-3010 above, which PASSES).
  it("TC-3010: switching to weekly Monday preset → saves weekly cron (Mon at template hour)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "new-id" }),
    });
    global.fetch = fetchMock as typeof fetch;
    mockFrom.mockReturnValue({ insert: vi.fn() });

    render(<NewAutomationPage />);
    await navigateToScheduleStep();

    // Switch to Weekly preset (Morning Briefing default was "0 8 * * *")
    await userEvent.click(screen.getByRole("radio", { name: "Weekly" }));

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      // Weekly cron pattern: "M H * * D" where D is a specific weekday (0-6), not *
      expect(body.schedule_cron).toMatch(/^\d+ \d+ \* \* [0-6]$/);
    });
  });

  // RED: NewAutomationPage hardcodes timezone: 'UTC' in handleSubmit
  // Expected: it should use the timezone the user selected in SchedulePicker
  it("saving automation uses timezone from SchedulePicker (RED: currently hardcoded 'UTC')", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "new-id" }),
    });
    global.fetch = fetchMock as typeof fetch;

    render(<NewAutomationPage />);
    await navigateToScheduleStep();

    // Change timezone to Seoul
    const comboboxes = screen.getAllByRole("combobox");
    await openSelectAndChoose(comboboxes[comboboxes.length - 1], /Seoul/i);

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    // RED: handleSubmit uses timezone: 'UTC' regardless of SchedulePicker selection
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/automations",
        expect.objectContaining({
          body: expect.stringContaining("Asia/Seoul"),
        })
      );
    });
  });
});
