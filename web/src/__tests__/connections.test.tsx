/**
 * Connections Page Tests — TC-2001, TC-2004, TC-2005
 * TDD Red Phase: These tests FAIL until ConnectionsPage is implemented.
 *
 * Tests validate:
 * - TC-2001: "Connect with Google" button → redirects to OAuth consent URL
 * - TC-2004: Connected service → ServiceCard shows "연결됨" Badge + connection date
 * - TC-2005: Disconnect button → confirmation Modal → DELETE mutation → card updates to disconnected
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConnectionsPage from "@/app/(dashboard)/connections/page";

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockGetUser = vi.fn();
const mockAutomationsUpdate = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

// Helper: chain builder for Supabase query mock
function buildChain(result: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

// Sets up mockFrom to route by table name for tests involving disconnect click
function setupDisconnectMock({
  connectedService = { id: "conn-1", service_name: "google", connected_at: "2026-03-01T10:00:00Z", scopes: ["gmail.readonly"] },
  deleteError = null as null | { message: string },
  activeAutomations = [] as { id: string; name: string; template_type: string }[],
} = {}) {
  mockAutomationsUpdate.mockReturnValue({
    in: vi.fn().mockResolvedValue({ error: null }),
  });
  mockFrom.mockImplementation((table: string) => {
    if (table === "automations") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: activeAutomations, error: null }),
          }),
        }),
        update: mockAutomationsUpdate,
      };
    }
    // connected_services
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [connectedService],
          error: null,
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: deleteError }),
      }),
    };
  });
}

describe("ConnectionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
  });

  it("TC-2001: clicking 'Connect with Google' button initiates OAuth redirect", async () => {
    // Arrange — no connected services
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    // Mock window.location.href assignment
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "" },
    });

    render(<ConnectionsPage />);

    // Act
    const connectButton = await screen.findByRole("switch", {
      name: /google.*연결/i,
    });
    await userEvent.click(connectButton);

    // Assert — should call router.push with Google OAuth API route
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/api/auth/connect/google');
    });

    // Restore
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("TC-2004: connected service displays ServiceCard with '연결됨' badge and connection date", async () => {
    // Arrange — Google is connected
    const connectedAt = "2026-03-01T10:00:00Z";
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: "conn-1",
              service_name: "google",
              connected_at: connectedAt,
              scopes: ["gmail.readonly", "calendar.readonly"],
            },
          ],
          error: null,
        }),
      }),
    });

    render(<ConnectionsPage />);

    // Assert — ServiceCard shows connected badge
    await waitFor(() => {
      expect(screen.getByText(/연결됨/i)).toBeInTheDocument();
    });

    // Assert — shows connection date
    const dateText = new Date(connectedAt).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    expect(screen.getByText(new RegExp(dateText.replace(/\./g, "\\.")))).toBeInTheDocument();

    // Assert — disconnect toggle is visible
    expect(
      screen.getByRole("switch", { name: /google.*연결 해제/i })
    ).toBeInTheDocument();
  });

  it("TC-2005: disconnect button → confirmation modal → confirm → DELETE mutation → card shows disconnected", async () => {
    // Arrange — Google is connected, no active automations
    setupDisconnectMock();

    render(<ConnectionsPage />);

    // Wait for connected card to render
    await screen.findByRole("switch", { name: /google.*연결 해제/i });

    // Act — click disconnect
    await userEvent.click(
      screen.getByRole("switch", { name: /google.*연결 해제/i })
    );

    // Assert — confirmation modal appears
    await waitFor(() => {
      expect(
        screen.getByRole("dialog", { hidden: false })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Google 서비스 연결을 해제하시겠습니까/i)
    ).toBeInTheDocument();

    // Act — confirm disconnect in modal
    const confirmButton = screen.getByRole("button", {
      name: /확인|confirm|연결 해제|disconnect/i,
    });
    await userEvent.click(confirmButton);

    // Assert — DELETE was called, card updates to disconnected state
    await waitFor(() => {
      expect(screen.getByText(/미연결|not connected/i)).toBeInTheDocument();
    });

    // Modal should close
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("TC-2005 (cancel): clicking cancel in modal does NOT disconnect", async () => {
    // Arrange — Google is connected, no active automations
    setupDisconnectMock({ connectedService: { id: "conn-1", service_name: "google", connected_at: "2026-03-01T10:00:00Z", scopes: [] } });

    render(<ConnectionsPage />);

    await screen.findByRole("switch", { name: /google.*연결 해제/i });

    // Act — click disconnect then cancel
    await userEvent.click(
      screen.getByRole("switch", { name: /google.*연결 해제/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: /취소|cancel/i });
    await userEvent.click(cancelButton);

    // Assert — still connected, no DELETE called
    await waitFor(() => {
      expect(screen.getByText(/연결됨/i)).toBeInTheDocument();
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("fetch error → shows error message", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: "DB error" },
        }),
      }),
    });

    render(<ConnectionsPage />);

    await waitFor(() => {
      expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
    });
  });

  it("TC-2011: disconnect button → confirmation modal appears", async () => {
    setupDisconnectMock();

    render(<ConnectionsPage />);

    await screen.findByRole("switch", { name: /google.*연결 해제/i });

    await userEvent.click(screen.getByRole("switch", { name: /google.*연결 해제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { hidden: false })).toBeInTheDocument();
    });

    expect(screen.getByText(/Google 서비스 연결을 해제하시겠습니까/i)).toBeInTheDocument();
  });

  it("TC-2012: modal shows affected automation count when active automations exist", async () => {
    setupDisconnectMock({
      activeAutomations: [
        { id: "auto-1", name: "Morning Briefing", template_type: "morning_briefing" },
        { id: "auto-2", name: "Email Triage", template_type: "email_triage" },
      ],
    });

    render(<ConnectionsPage />);

    await screen.findByRole("switch", { name: /google.*연결 해제/i });
    await userEvent.click(screen.getByRole("switch", { name: /google.*연결 해제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { hidden: false })).toBeInTheDocument();
    });

    expect(screen.getByText(/2개 자동화가 일시정지됩니다/i)).toBeInTheDocument();
  });

  it("TC-2013: confirm disconnect → automations paused + service deleted", async () => {
    setupDisconnectMock({
      activeAutomations: [
        { id: "auto-1", name: "Morning Briefing", template_type: "morning_briefing" },
      ],
    });

    render(<ConnectionsPage />);

    await screen.findByRole("switch", { name: /google.*연결 해제/i });
    await userEvent.click(screen.getByRole("switch", { name: /google.*연결 해제/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog", { hidden: false })).toBeInTheDocument();
    });

    // Confirm disconnect
    const confirmButton = screen.getByRole("button", { name: /확인|confirm|연결 해제|disconnect/i });
    await userEvent.click(confirmButton);

    // Automations should be paused
    await waitFor(() => {
      expect(mockAutomationsUpdate).toHaveBeenCalledWith({ status: "paused" });
    });

    // Card should show disconnected
    await waitFor(() => {
      expect(screen.getByText(/미연결|not connected/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("TC-2005 variant: disconnect DELETE failure → error shown", async () => {
    setupDisconnectMock({ deleteError: { message: "Delete failed" } });

    render(<ConnectionsPage />);

    await screen.findByRole("switch", { name: /google.*연결 해제/i });

    await userEvent.click(
      screen.getByRole("switch", { name: /google.*연결 해제/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog", { hidden: false })).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", {
      name: /확인|confirm|연결 해제|disconnect/i,
    });
    await userEvent.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText(/error|failed|실패/i)).toBeInTheDocument();
    });
  });
});
