/**
 * Settings Preferences Tests — TC-7009~7010 (PM-08: 선호도 설정 UI)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-7009: 뉴스 카테고리 선택 저장
 * TC-7010: 이메일 중요도 기준 설정
 *
 * FAILURES expected (Red phase):
 * - 선호도 섹션 UI 미구현 → 요소 찾기 실패
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
    from: vi.fn((table: string) => {
      if (table === "user_preferences") {
        return {
          select: mockSelect,
          upsert: mockUpsert,
          eq: mockEq,
          single: mockSingle,
          maybeSingle: mockSingle,
        };
      }
      // profiles table
      return {
        select: mockSelect,
        update: mockUpdate,
        eq: mockEq,
        single: mockSingle,
        maybeSingle: mockSingle,
      };
    }),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  display_name: string;
  timezone: string;
  preferred_language: string;
}

function setupUser(overrides: Partial<Profile> = {}) {
  const profile: Profile = {
    id: "user-123",
    display_name: "Test User",
    timezone: "UTC",
    preferred_language: "en",
    ...overrides,
  };

  mockGetUser.mockResolvedValue({
    data: { user: { id: profile.id } },
    error: null,
  });

  // Chain: from('profiles').select('*').eq('id', userId).single()
  mockSingle.mockResolvedValue({ data: profile, error: null });
  mockEq.mockReturnValue({ single: mockSingle, maybeSingle: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });

  // upsert for user_preferences
  mockUpsert.mockResolvedValue({ error: null });

  // update for profiles
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

  return profile;
}

// ─── TC-7009: 뉴스 카테고리 선택 저장 ────────────────────────────────────────

describe("TC-7009: 뉴스 카테고리 선택 저장", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser();
  });

  it("Settings 페이지에 뉴스 카테고리 체크박스 목록이 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/technology|기술/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/science|과학/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/business|비즈니스/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/health|건강/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/sports|스포츠/i)).toBeInTheDocument();
    });
  });

  it("TC-7009: technology + science 선택 → 저장 → user_preferences upsert 호출", async () => {
    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/technology|기술/i));

    await userEvent.click(screen.getByLabelText(/technology|기술/i));
    await userEvent.click(screen.getByLabelText(/science|과학/i));

    await userEvent.click(
      screen.getByRole("button", { name: /save.*preferences|선호도.*저장|save|저장/i })
    );

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          category: "content",
          key: "news_categories",
          value: expect.arrayContaining(["technology", "science"]),
        })
      );
    });
  });

  it("기존 선호도 로드 → 저장된 카테고리가 체크된 상태로 표시", async () => {
    // user_preferences 로드 시 기존 데이터 반환 (news_categories)
    // Page calls: from('user_preferences').select('value').eq(...).eq(...).maybeSingle()
    mockSelect.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { value: ["technology", "science"] },
            error: null,
          }),
        }),
      }),
    });

    render(<SettingsPage />);

    await waitFor(() => {
      const techCheckbox = screen.getByLabelText(/technology|기술/i);
      expect(techCheckbox).toBeChecked();
    });

    await waitFor(() => {
      const sciCheckbox = screen.getByLabelText(/science|과학/i);
      expect(sciCheckbox).toBeChecked();
    });
  });

  it("아무것도 선택 안 함 → 빈 배열 저장 허용", async () => {
    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/technology|기술/i));

    // 아무것도 선택하지 않고 저장
    await userEvent.click(
      screen.getByRole("button", { name: /save.*preferences|선호도.*저장|save|저장/i })
    );

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "content",
          key: "news_categories",
          value: [],
        })
      );
    });
  });
});

// ─── TC-7010: 이메일 중요도 기준 설정 ────────────────────────────────────────

describe("TC-7010: 이메일 중요도 기준 설정", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser();
  });

  it("Settings 페이지에 이메일 중요도 기준 선택 필드가 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/importance.*criteria|중요도.*기준|email.*priority/i)
      ).toBeInTheDocument();
    });
  });

  it("이메일 중요도 기준 옵션에 sender, subject keyword, all이 포함된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /sender|발신자/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /subject.*keyword|제목.*키워드/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: /all|전체/i })
      ).toBeInTheDocument();
    });
  });

  it("TC-7010: sender 선택 → 저장 → user_preferences upsert 호출", async () => {
    render(<SettingsPage />);

    await waitFor(() =>
      screen.getByLabelText(/importance.*criteria|중요도.*기준|email.*priority/i)
    );

    const criteriaSelect = screen.getByLabelText(
      /importance.*criteria|중요도.*기준|email.*priority/i
    );
    await userEvent.selectOptions(criteriaSelect, "sender");

    await userEvent.click(
      screen.getByRole("button", { name: /save.*preferences|선호도.*저장|save|저장/i })
    );

    await waitFor(() => {
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          category: "email",
          key: "importance_criteria",
          value: "sender",
        })
      );
    });
  });

  it("TC-7010: 저장 성공 시 성공 메시지 표시", async () => {
    render(<SettingsPage />);

    await waitFor(() =>
      screen.getByLabelText(/importance.*criteria|중요도.*기준|email.*priority/i)
    );

    const criteriaSelect = screen.getByLabelText(
      /importance.*criteria|중요도.*기준|email.*priority/i
    );
    await userEvent.selectOptions(criteriaSelect, "sender");

    await userEvent.click(
      screen.getByRole("button", { name: /save.*preferences|선호도.*저장|save|저장/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/saved|저장.*완료|success|성공/i)
      ).toBeInTheDocument();
    });
  });
});
