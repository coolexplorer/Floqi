/**
 * Natural Language Automation Creation Tests — TC-3004, TC-3005
 * TDD Red Phase: NaturalLanguageAutomationPage is a stub — all feature assertions FAIL.
 *
 * Tests validate:
 * - TC-3004: Input "매일 오전 8시에 뉴스 요약해줘" → creates automation with prompt in DB
 * - TC-3005: Empty prompt → validation error "자동화 설명을 입력해주세요"
 * - Natural language input field exists on the page
 * - Submit button is disabled when input is empty
 * - Successful creation redirects to /automations
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NaturalLanguageAutomationPage from "@/app/(dashboard)/automations/new-natural/page";

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

const USER_ID = "user-abc";

function setupPage() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  });

  const insertMock = vi
    .fn()
    .mockResolvedValue({ data: [{ id: "new-auto-nl" }], error: null });

  mockFrom.mockReturnValue({ insert: insertMock });

  return { insertMock };
}

// ─── UI Structure Tests ───────────────────────────────────────────────────────

describe("NaturalLanguageAutomationPage — UI structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a natural language input field — RED: stub has no input", async () => {
    setupPage();
    render(<NaturalLanguageAutomationPage />);

    await waitFor(() => {
      // Textarea or input where user types the natural language description
      expect(
        screen.getByRole("textbox", { name: /describe|설명|자동화|automation/i })
      ).toBeInTheDocument();
    });
  });

  it("renders a page heading for natural language creation — RED: stub has no heading", async () => {
    setupPage();
    render(<NaturalLanguageAutomationPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", {
          name: /create automation|자동화 만들기|자연어/i,
        })
      ).toBeInTheDocument();
    });
  });

  it("shows a placeholder hint in the input field — RED: stub has no input", async () => {
    setupPage();
    render(<NaturalLanguageAutomationPage />);

    await waitFor(() => {
      const textarea = screen.getByRole("textbox", {
        name: /describe|설명|자동화|automation/i,
      });
      // Should have a helpful placeholder
      expect(textarea).toHaveAttribute("placeholder");
      expect(textarea.getAttribute("placeholder")).toBeTruthy();
    });
  });

  it("Submit button exists on the page — RED: stub has no button", async () => {
    setupPage();
    render(<NaturalLanguageAutomationPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /create|생성|submit/i })
      ).toBeInTheDocument();
    });
  });
});

// ─── Submit button disabled state ─────────────────────────────────────────────

describe("Submit button disabled when input is empty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Submit button is disabled when input is empty on initial render — RED: stub has no logic", async () => {
    setupPage();
    render(<NaturalLanguageAutomationPage />);

    await waitFor(() => {
      const submitBtn = screen.getByRole("button", {
        name: /create|생성|submit/i,
      });
      expect(submitBtn).toBeDisabled();
    });
  });

  it("Submit button becomes enabled when user types in the input — RED: stub has no logic", async () => {
    setupPage();
    render(<NaturalLanguageAutomationPage />);

    const textarea = await screen.findByRole("textbox", {
      name: /describe|설명|자동화|automation/i,
    });
    await userEvent.type(textarea, "매일 오전 8시에 뉴스 요약해줘");

    const submitBtn = screen.getByRole("button", { name: /create|생성|submit/i });
    expect(submitBtn).not.toBeDisabled();
  });

  it("Submit button returns to disabled when input is cleared — RED: stub has no logic", async () => {
    setupPage();
    render(<NaturalLanguageAutomationPage />);

    const textarea = await screen.findByRole("textbox", {
      name: /describe|설명|자동화|automation/i,
    });
    await userEvent.type(textarea, "Something");
    await userEvent.clear(textarea);

    const submitBtn = screen.getByRole("button", { name: /create|생성|submit/i });
    expect(submitBtn).toBeDisabled();
  });
});

// ─── TC-3004: Natural language input → creates automation ─────────────────────

describe("TC-3004: Natural language input → creates automation with prompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-3004: typing prompt and submitting inserts automation into DB — RED: stub has no logic", async () => {
    const { insertMock } = setupPage();
    render(<NaturalLanguageAutomationPage />);

    const textarea = await screen.findByRole("textbox", {
      name: /describe|설명|자동화|automation/i,
    });
    await userEvent.type(textarea, "매일 오전 8시에 뉴스 요약해줘");

    const submitBtn = screen.getByRole("button", { name: /create|생성|submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith("automations");
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: USER_ID,
          agent_prompt: "매일 오전 8시에 뉴스 요약해줘",
        })
      );
    });
  });

  it("TC-3004: the inserted automation includes status='paused' — RED: stub has no logic", async () => {
    const { insertMock } = setupPage();
    render(<NaturalLanguageAutomationPage />);

    const textarea = await screen.findByRole("textbox", {
      name: /describe|설명|자동화|automation/i,
    });
    await userEvent.type(textarea, "매일 오전 8시에 뉴스 요약해줘");

    const submitBtn = screen.getByRole("button", { name: /create|생성|submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "paused",
        })
      );
    });
  });

  it("TC-3004: successful creation redirects to /automations — RED: stub has no navigation", async () => {
    setupPage();
    render(<NaturalLanguageAutomationPage />);

    const textarea = await screen.findByRole("textbox", {
      name: /describe|설명|자동화|automation/i,
    });
    await userEvent.type(textarea, "매일 오전 8시에 뉴스 요약해줘");

    const submitBtn = screen.getByRole("button", { name: /create|생성|submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/automations");
    });
  });

  it("shows loading state while submitting — RED: stub has no async state", async () => {
    // Make insert take a moment
    mockGetUser.mockResolvedValue({
      data: { user: { id: USER_ID } },
      error: null,
    });
    const insertMock = vi
      .fn()
      .mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ data: [{ id: "x" }], error: null }), 100)));
    mockFrom.mockReturnValue({ insert: insertMock });

    render(<NaturalLanguageAutomationPage />);

    const textarea = await screen.findByRole("textbox", {
      name: /describe|설명|자동화|automation/i,
    });
    await userEvent.type(textarea, "뉴스 요약해줘");

    const submitBtn = screen.getByRole("button", { name: /create|생성|submit/i });
    await userEvent.click(submitBtn);

    // During submission: button should show loading or be disabled
    expect(submitBtn).toBeDisabled();
  });
});

// ─── TC-3005: Empty prompt → validation error ─────────────────────────────────

describe("TC-3005: Empty prompt → validation error '자동화 설명을 입력해주세요'", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-3005: clicking Submit with empty input shows '자동화 설명을 입력해주세요' — RED: button is disabled (cannot click)", async () => {
    setupPage();
    render(<NaturalLanguageAutomationPage />);

    // Submit is disabled when empty, so we force the check via keyboard or aria
    const textarea = await screen.findByRole("textbox", {
      name: /describe|설명|자동화|automation/i,
    });

    // Type then clear to attempt submission with empty
    await userEvent.type(textarea, "test");
    await userEvent.clear(textarea);

    // Try pressing Enter in the textarea (form submit)
    await userEvent.keyboard("{Enter}");

    await waitFor(() => {
      expect(
        screen.getByText(/자동화 설명을 입력해주세요/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-3005: validation error disappears when user starts typing — RED: stub has no state", async () => {
    setupPage();
    render(<NaturalLanguageAutomationPage />);

    const textarea = await screen.findByRole("textbox", {
      name: /describe|설명|자동화|automation/i,
    });

    // Trigger validation error
    await userEvent.type(textarea, "test");
    await userEvent.clear(textarea);
    await userEvent.keyboard("{Enter}");

    await waitFor(() => {
      expect(screen.getByText(/자동화 설명을 입력해주세요/i)).toBeInTheDocument();
    });

    // Start typing → error clears
    await userEvent.type(textarea, "뉴스 요약해줘");

    await waitFor(() => {
      expect(
        screen.queryByText(/자동화 설명을 입력해주세요/i)
      ).not.toBeInTheDocument();
    });
  });

  it("TC-3005: empty prompt does NOT call DB insert — RED: stub has no logic", async () => {
    const { insertMock } = setupPage();
    render(<NaturalLanguageAutomationPage />);

    const textarea = await screen.findByRole("textbox", {
      name: /describe|설명|자동화|automation/i,
    });

    // Force form submit with empty value (e.g., via Enter key)
    await userEvent.click(textarea);
    await userEvent.keyboard("{Enter}");

    expect(insertMock).not.toHaveBeenCalled();
  });
});
