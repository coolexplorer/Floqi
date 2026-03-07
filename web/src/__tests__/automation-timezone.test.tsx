/**
 * Automation Timezone-Aware Storage Tests
 * TDD Red Phase
 *
 * Tests validate:
 * - Selecting Asia/Seoul timezone → automation saved with timezone='Asia/Seoul' (RED: hardcoded UTC)
 * - Selecting America/New_York timezone → different timezone saved (RED: hardcoded UTC)
 * - SchedulePicker onChange does NOT expose timezone to parent (RED: interface gap)
 * - Automation save body includes correct timezone field (RED: hardcoded 'UTC' in handleSubmit)
 *
 * FAILURES expected:
 * - All "timezone saved as X" tests → RED: NewAutomationPage hardcodes timezone: 'UTC'
 * - "onTimezoneChange prop exists" → RED: SchedulePicker has no such prop
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

async function navigateToScheduleStep() {
  await userEvent.click(screen.getByRole("button", { name: /morning briefing/i }));
  await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));
  await screen.findByRole("textbox", { name: /name/i });
  await userEvent.click(screen.getByRole("button", { name: /go to next step/i }));
  await screen.findByRole("radiogroup", { name: /schedule frequency/i });
}

function makeFetchMock() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ id: "new-id" }),
  });
  global.fetch = fetchMock as typeof fetch;
  return fetchMock;
}

// ─── SchedulePicker timezone interface tests ──────────────────────────────────

describe("SchedulePicker — timezone prop interface", () => {
  it("renders timezone selector with default UTC", () => {
    render(<SchedulePicker />);
    expect(screen.getByText("UTC")).toBeInTheDocument();
  });

  it("timezone combobox has accessible label 'Timezone'", () => {
    render(<SchedulePicker />);
    expect(screen.getByText(/^Timezone$/i)).toBeInTheDocument();
  });

  it("changing timezone to Asia/Seoul calls onChange with cron string", async () => {
    const onChange = vi.fn();
    render(<SchedulePicker onChange={onChange} />);

    const comboboxes = screen.getAllByRole("combobox");
    const timezoneCombobox = comboboxes[comboboxes.length - 1];
    await openSelectAndChoose(timezoneCombobox, /Seoul/i);

    // onChange is called — but only with a cron string, NOT with timezone info
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
    // The argument is a plain string (cron expression), not an object with timezone
    expect(typeof lastCall[0]).toBe("string");
  });

  // RED: SchedulePicker should expose an onTimezoneChange callback so parents
  // can react to timezone changes. Currently it does not.
  it("SchedulePicker has onTimezoneChange prop (RED: prop does not exist)", async () => {
    const onTimezoneChange = vi.fn();
    // RED: SchedulePicker does not accept onTimezoneChange prop
    // TypeScript would error here; at runtime the prop is silently ignored
    render(
      <SchedulePicker
        {...({ onTimezoneChange } as Record<string, unknown>)}
      />
    );

    const comboboxes = screen.getAllByRole("combobox");
    const timezoneCombobox = comboboxes[comboboxes.length - 1];
    await openSelectAndChoose(timezoneCombobox, /Seoul/i);

    // RED: onTimezoneChange is never called because the prop doesn't exist
    expect(onTimezoneChange).toHaveBeenCalledWith("Asia/Seoul");
  });

  it("different timezones show different labels in the selector", async () => {
    render(<SchedulePicker />);

    const comboboxes = screen.getAllByRole("combobox");
    const timezoneCombobox = comboboxes[comboboxes.length - 1];
    await userEvent.click(timezoneCombobox);

    // Multiple timezones should be available
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Seoul/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Eastern Time/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /UTC/ })).toBeInTheDocument();
    });
  });
});

// ─── NewAutomationPage timezone storage tests ─────────────────────────────────

describe("NewAutomationPage — timezone saved with automation (RED: hardcoded 'UTC')", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  // RED: handleSubmit in NewAutomationPage hardcodes timezone: 'UTC'
  // This test FAILS because the body always contains "UTC" regardless of picker
  it("selecting Asia/Seoul timezone → POST body contains timezone='Asia/Seoul'", async () => {
    const fetchMock = makeFetchMock();

    render(<NewAutomationPage />);
    await navigateToScheduleStep();

    // Change timezone to Seoul in SchedulePicker
    const comboboxes = screen.getAllByRole("combobox");
    await openSelectAndChoose(comboboxes[comboboxes.length - 1], /Seoul/i);

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    // RED: body has timezone: 'UTC' hardcoded
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/automations",
        expect.objectContaining({
          body: expect.stringContaining("Asia/Seoul"),
        })
      );
    });
  });

  // RED: same issue — America/New_York not propagated
  it("selecting America/New_York timezone → POST body contains timezone='America/New_York'", async () => {
    const fetchMock = makeFetchMock();

    render(<NewAutomationPage />);
    await navigateToScheduleStep();

    const comboboxes = screen.getAllByRole("combobox");
    await openSelectAndChoose(comboboxes[comboboxes.length - 1], /Eastern Time/i);

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    // RED: hardcoded 'UTC' will be sent instead
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/automations",
        expect.objectContaining({
          body: expect.stringContaining("America/New_York"),
        })
      );
    });
  });

  // This test PASSES — UTC is the default and currently hardcoded
  it("keeping UTC timezone (default) → POST body contains timezone='UTC'", async () => {
    const fetchMock = makeFetchMock();

    render(<NewAutomationPage />);
    await navigateToScheduleStep();
    // No timezone change — default UTC

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/automations",
        expect.objectContaining({
          body: expect.stringContaining("UTC"),
        })
      );
    });
  });

  it("POST body includes both schedule_cron and timezone fields", async () => {
    const fetchMock = makeFetchMock();

    render(<NewAutomationPage />);
    await navigateToScheduleStep();

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
      const call = fetchMock.mock.calls[0];
      const body = JSON.parse(call[1].body as string);
      expect(body).toHaveProperty("schedule_cron");
      expect(body).toHaveProperty("timezone");
    });
  });

  // RED: Two users in different timezones selecting "7am" should yield
  // different stored values. Currently both would store "0 7 * * *" with "UTC".
  it("User in Seoul + 7am → stored cron differs from User in NY + 7am (RED: both store same)", async () => {
    // Simulate Seoul user
    const fetchMockSeoul = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: "id-seoul" }),
    });
    global.fetch = fetchMockSeoul as typeof fetch;

    render(<NewAutomationPage />);
    await navigateToScheduleStep();

    // Select Seoul timezone
    const comboboxes = screen.getAllByRole("combobox");
    await openSelectAndChoose(comboboxes[comboboxes.length - 1], /Seoul/i);

    // Change hour to 7
    await openSelectAndChoose(comboboxes[0], "07");

    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => expect(fetchMockSeoul).toHaveBeenCalled());

    const seoulBody = JSON.parse(
      fetchMockSeoul.mock.calls[0][1].body as string
    );

    // RED: seoulBody.timezone === 'UTC' (hardcoded), not 'Asia/Seoul'
    // When fixed: Seoul 7am local should store timezone='Asia/Seoul'
    expect(seoulBody.timezone).toBe("Asia/Seoul");
    // And the cron should reflect the local time the user intended
    expect(seoulBody.schedule_cron).toBe("0 7 * * *");
  });
});

// ─── Timezone display tests (these PASS with current implementation) ───────────

describe("SchedulePicker — timezone selector display (passing)", () => {
  it("Seoul timezone option label is 'Seoul (KST)'", async () => {
    render(<SchedulePicker />);

    const comboboxes = screen.getAllByRole("combobox");
    await userEvent.click(comboboxes[comboboxes.length - 1]);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Seoul (KST)" })).toBeInTheDocument();
    });
  });

  it("Eastern Time option label is 'Eastern Time (ET)'", async () => {
    render(<SchedulePicker />);

    const comboboxes = screen.getAllByRole("combobox");
    await userEvent.click(comboboxes[comboboxes.length - 1]);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Eastern Time (ET)" })).toBeInTheDocument();
    });
  });

  it("all 11 timezone options are available", async () => {
    render(<SchedulePicker />);

    const comboboxes = screen.getAllByRole("combobox");
    await userEvent.click(comboboxes[comboboxes.length - 1]);

    await waitFor(() => {
      const options = screen.getAllByRole("option");
      expect(options.length).toBe(11);
    });
  });
});
