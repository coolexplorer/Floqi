/**
 * Account Deletion Tests — TC-7013, TC-7014 (PM-18: Account Deletion)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-7013: Settings page has "Delete Account" button that shows confirmation modal
 * TC-7014: After confirming deletion, calls DELETE /api/account endpoint
 *
 * FAILURES expected (Red phase):
 * - Settings 페이지에 계정 삭제 버튼 미구현
 * - 확인 모달 미구현
 * - DELETE /api/account 엔드포인트 미구현
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsPage from "@/app/(dashboard)/settings/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockUpsert = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      upsert: mockUpsert,
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockSingle,
    }),
  }),
}));

vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn().mockResolvedValue("encrypted:value"),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setupUser() {
  const profile = {
    id: "user-123",
    display_name: "Test User",
    timezone: "UTC",
    preferred_language: "en",
    llm_provider: "managed",
    plan: "free",
  };

  mockGetUser.mockResolvedValue({
    data: { user: { id: profile.id } },
    error: null,
  });

  mockSingle.mockResolvedValue({ data: profile, error: null });
  mockEq.mockReturnValue({ single: mockSingle, maybeSingle: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
  mockUpsert.mockResolvedValue({ error: null });

  return profile;
}

// ─── TC-7013: Delete Account button + confirmation modal ────────────────────

describe("TC-7013: 계정 삭제 버튼 및 확인 모달", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser();
  });

  it("Settings 페이지에 'Delete Account' 버튼이 있다 — RED: 계정 삭제 미구현", async () => {
    render(<SettingsPage />);

    // EXPECT: "Delete Account" 또는 "계정 삭제" 버튼
    // ACTUAL: Settings 페이지에 삭제 버튼 없음 → FAIL
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete account|계정 삭제/i })
      ).toBeInTheDocument();
    });
  });

  it("Delete Account 클릭 시 확인 모달이 표시된다 — RED: 모달 미구현", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete account|계정 삭제/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /delete account|계정 삭제/i })
    );

    // EXPECT: 경고 텍스트가 포함된 확인 모달 (modal title or body)
    await waitFor(() => {
      const elements = screen.getAllByText(/정말 삭제|are you sure|cannot be undone/i);
      expect(elements.length).toBeGreaterThan(0);
    });
  });

  it("확인 모달에 Confirm과 Cancel 버튼이 있다 — RED: 모달 미구현", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete account|계정 삭제/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /delete account|계정 삭제/i })
    );

    await waitFor(() => {
      // Confirm 버튼
      expect(
        screen.getByRole("button", { name: /confirm|확인/i })
      ).toBeInTheDocument();
      // Cancel 버튼
      expect(
        screen.getByRole("button", { name: /cancel|취소/i })
      ).toBeInTheDocument();
    });
  });

  it("Cancel 클릭 시 모달이 닫힌다 — RED: 모달 미구현", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete account|계정 삭제/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /delete account|계정 삭제/i })
    );

    // 모달이 열린 상태에서 Cancel 클릭
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cancel|취소/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /cancel|취소/i })
    );

    // 모달 경고 텍스트가 사라져야 함
    await waitFor(() => {
      expect(
        screen.queryByText(/정말 삭제|are you sure|cannot be undone/i)
      ).not.toBeInTheDocument();
    });
  });
});

// ─── TC-7014: Confirm deletion → DELETE /api/account ────────────────────────

describe("TC-7014: 계정 삭제 확인 → DELETE /api/account 호출", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser();
  });

  it("Confirm 클릭 시 DELETE /api/account 호출 — RED: API 미구현", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
    global.fetch = mockFetch;

    render(<SettingsPage />);

    // Delete Account 클릭
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete account|계정 삭제/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /delete account|계정 삭제/i })
    );

    // 모달에서 Confirm 클릭
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /confirm|확인/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /confirm|확인/i })
    );

    // EXPECT: DELETE /api/account 호출
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/account",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("삭제 성공 후 /login으로 리다이렉트 — RED: API 미구현", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete account|계정 삭제/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /delete account|계정 삭제/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /confirm|확인/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /confirm|확인/i })
    );

    // EXPECT: /login으로 리다이렉트
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("삭제 실패 시 에러 메시지 표시 — RED: API 미구현", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "Failed to delete account" }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /delete account|계정 삭제/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /delete account|계정 삭제/i })
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /confirm|확인/i })
      ).toBeInTheDocument();
    });

    await userEvent.click(
      screen.getByRole("button", { name: /confirm|확인/i })
    );

    // EXPECT: 에러 메시지 표시
    await waitFor(() => {
      expect(
        screen.getByText(/failed|실패|error|오류/i)
      ).toBeInTheDocument();
    });
  });
});
