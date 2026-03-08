/**
 * Output Format Setting Tests — TC-7011, TC-7012 (PM-17: Output Format)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-7011: Automation edit page has output format select with options: email / notion / both
 * TC-7012: Selecting "Notion" when Notion is not connected shows warning
 *
 * FAILURES expected (Red phase):
 * - Edit 페이지에 output format 드롭다운 미구현
 * - data-testid="output-format-select" 없음
 * - Notion 연결 상태 체크 미구현
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
  agent_prompt: "Summarize my morning schedule",
  output_format: "email",
};

// ─── Setup helpers ───────────────────────────────────────────────────────────

function setupEditPage(options: { notionConnected?: boolean } = {}) {
  const { notionConnected = false } = options;

  mockGetUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
    error: null,
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === "automations") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: automationDetail, error: null }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    if (table === "connections") {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: notionConnected ? { id: "conn-1", service: "notion", status: "active" } : null,
          error: notionConnected ? null : { code: "PGRST116", message: "not found" },
        }),
      };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
  });
}

// ─── TC-7011: Output format select with options ─────────────────────────────

describe("TC-7011: Automation edit 페이지에 output format 선택", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupEditPage();
  });

  it("output format 드롭다운이 존재한다 — RED: output format 미구현", async () => {
    render(<EditAutomationPage />);

    // EXPECT: data-testid="output-format-select" 존재
    // ACTUAL: Edit 페이지에 output format 없음 → FAIL
    await waitFor(() => {
      expect(screen.getByTestId("output-format-select")).toBeInTheDocument();
    });
  });

  it("output format 옵션에 email, notion, both가 있다 — RED: output format 미구현", async () => {
    render(<EditAutomationPage />);

    await waitFor(() => {
      const select = screen.getByTestId("output-format-select");
      expect(select).toBeInTheDocument();
    });

    const select = screen.getByTestId("output-format-select") as HTMLSelectElement;
    const options = Array.from(select.options).map((opt) => opt.value);

    expect(options).toContain("email");
    expect(options).toContain("notion");
    expect(options).toContain("both");
  });

  it("기본값은 현재 automation의 output_format 값이다 — RED: output format 필드 없음", async () => {
    render(<EditAutomationPage />);

    await waitFor(() => {
      const select = screen.getByTestId("output-format-select") as HTMLSelectElement;
      expect(select.value).toBe("email");
    });
  });

  it("output format을 변경할 수 있다 — RED: output format 미구현", async () => {
    render(<EditAutomationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("output-format-select")).toBeInTheDocument();
    });

    const select = screen.getByTestId("output-format-select");
    await userEvent.selectOptions(select, "both");

    expect(select).toHaveValue("both");
  });
});

// ─── TC-7012: Notion not connected warning ──────────────────────────────────

describe("TC-7012: Notion 미연결 시 경고 메시지", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Notion 미연결 상태에서 'notion' 선택 시 경고 메시지 표시 — RED: 연결 체크 미구현", async () => {
    setupEditPage({ notionConnected: false });
    render(<EditAutomationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("output-format-select")).toBeInTheDocument();
    });

    const select = screen.getByTestId("output-format-select");
    await userEvent.selectOptions(select, "notion");

    // EXPECT: Notion 연결 필요 경고 메시지
    // ACTUAL: 경고 미구현 → FAIL
    await waitFor(() => {
      expect(
        screen.getByText(/notion.*연결|connect.*notion/i)
      ).toBeInTheDocument();
    });
  });

  it("Notion 미연결 상태에서 'both' 선택 시에도 경고 메시지 표시 — RED: 연결 체크 미구현", async () => {
    setupEditPage({ notionConnected: false });
    render(<EditAutomationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("output-format-select")).toBeInTheDocument();
    });

    const select = screen.getByTestId("output-format-select");
    await userEvent.selectOptions(select, "both");

    await waitFor(() => {
      expect(
        screen.getByText(/notion.*연결|connect.*notion/i)
      ).toBeInTheDocument();
    });
  });

  it("Notion 연결된 상태에서 'notion' 선택 시 경고 없음 — RED: 연결 체크 미구현", async () => {
    setupEditPage({ notionConnected: true });
    render(<EditAutomationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("output-format-select")).toBeInTheDocument();
    });

    const select = screen.getByTestId("output-format-select");
    await userEvent.selectOptions(select, "notion");

    // 경고 메시지가 표시되지 않아야 함
    await waitFor(() => {
      expect(
        screen.queryByText(/notion.*연결|connect.*notion/i)
      ).not.toBeInTheDocument();
    });
  });
});
