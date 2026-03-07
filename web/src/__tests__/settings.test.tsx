/**
 * Settings Page Tests — TC-7001~7004 (US-701: 프로필 설정)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-7001: Settings 페이지에서 이름 변경 → profiles.display_name 업데이트
 * TC-7002: 타임존 변경 (UTC → Asia/Seoul) → profiles.timezone 업데이트
 * TC-7003: 변경된 타임존이 AI 프롬프트에 반영 (Integration — Worker 측)
 *          → SettingsPage는 timezone 저장, Worker buildSystemPrompt는 별도 테스트
 * TC-7004: 선호 언어 변경 (en → ko) → profiles.preferred_language 업데이트
 *
 * FAILURES expected (Red phase):
 * - SettingsPage 컴포넌트 미존재 → import 에러
 * - profiles.update API 라우트 미구현 → fetch 호출 없음
 * - 유효성 검증 로직 미구현 → 빈 이름으로 제출 가능
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

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn().mockReturnValue({
      select: mockSelect,
      update: mockUpdate,
      eq: mockEq,
      single: mockSingle,
    }),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  mockEq.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });

  // Chain: from('profiles').update({...}).eq('id', userId)
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

  return profile;
}

interface Profile {
  id: string;
  display_name: string;
  timezone: string;
  preferred_language: string;
}

// ─── TC-7001: 이름 변경 ───────────────────────────────────────────────────────

describe("TC-7001: 프로필 이름 변경", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ display_name: "기존 이름" });
  });

  it("Settings 페이지가 현재 display_name을 입력 필드에 표시한다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      const nameInput = screen.getByLabelText(/name|이름/i);
      expect(nameInput).toHaveValue("기존 이름");
    });
  });

  it("TC-7001: 이름을 변경하고 저장하면 profiles.update()가 display_name 포함하여 호출된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/name|이름/i));

    const nameInput = screen.getByLabelText(/name|이름/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "새 이름");

    await userEvent.click(screen.getByRole("button", { name: /save|저장/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ display_name: "새 이름" })
      );
    });
  });

  it("TC-7001: 저장 성공 시 성공 메시지가 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/name|이름/i));

    const nameInput = screen.getByLabelText(/name|이름/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "새 이름");
    await userEvent.click(screen.getByRole("button", { name: /save|저장/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/saved|저장.*완료|success|성공/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-7001 (validation): 이름을 비우고 저장 시도 → 유효성 검증 에러", async () => {
    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/name|이름/i));

    const nameInput = screen.getByLabelText(/name|이름/i);
    await userEvent.clear(nameInput);
    await userEvent.click(screen.getByRole("button", { name: /save|저장/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/required|필수|name.*required|이름.*필수/i)
      ).toBeInTheDocument();
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("TC-7001 (error): DB 업데이트 실패 시 에러 메시지 표시", async () => {
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: { message: "DB error" } }),
    });

    render(<SettingsPage />);
    await waitFor(() => screen.getByLabelText(/name|이름/i));

    await userEvent.clear(screen.getByLabelText(/name|이름/i));
    await userEvent.type(screen.getByLabelText(/name|이름/i), "새 이름");
    await userEvent.click(screen.getByRole("button", { name: /save|저장/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/error|오류|failed|실패/i)
      ).toBeInTheDocument();
    });
  });
});

// ─── TC-7002: 타임존 변경 ─────────────────────────────────────────────────────

describe("TC-7002: 타임존 변경 (UTC → Asia/Seoul)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ timezone: "UTC" });
  });

  it("Settings 페이지에 타임존 선택 필드가 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/timezone|타임존/i)).toBeInTheDocument();
    });
  });

  it("현재 타임존(UTC)이 기본 선택값으로 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      const timezoneField = screen.getByLabelText(/timezone|타임존/i);
      expect(timezoneField).toHaveValue("UTC");
    });
  });

  it("TC-7002: Asia/Seoul로 변경 후 저장 시 timezone = 'Asia/Seoul' 로 업데이트", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByLabelText(/timezone|타임존/i));

    const timezoneSelect = screen.getByLabelText(/timezone|타임존/i);
    await userEvent.selectOptions(timezoneSelect, "Asia/Seoul");

    await userEvent.click(screen.getByRole("button", { name: /save|저장/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ timezone: "Asia/Seoul" })
      );
    });
  });

  it("TC-7002: 타임존 드롭다운에 Asia/Seoul 옵션이 포함된다", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByLabelText(/timezone|타임존/i));

    const timezoneSelect = screen.getByLabelText(/timezone|타임존/i);
    await userEvent.click(timezoneSelect);

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /Asia\/Seoul|Seoul/i })
      ).toBeInTheDocument();
    });
  });
});

// ─── TC-7003: 타임존이 AI 프롬프트에 반영 (Web 측: timezone 저장 검증) ────────

describe("TC-7003: 타임존 저장 → AI 프롬프트 반영 (Web 저장 검증)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ timezone: "UTC" });
  });

  it("TC-7003: Asia/Seoul 저장 시 update payload에 timezone 포함", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByLabelText(/timezone|타임존/i));

    const timezoneSelect = screen.getByLabelText(/timezone|타임존/i);
    await userEvent.selectOptions(timezoneSelect, "Asia/Seoul");

    await userEvent.click(screen.getByRole("button", { name: /save|저장/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ timezone: "Asia/Seoul" })
      );
    });
  });
});

// ─── TC-7004: 선호 언어 변경 ─────────────────────────────────────────────────

describe("TC-7004: 선호 언어 변경 (en → ko)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ preferred_language: "en" });
  });

  it("Settings 페이지에 언어 선택 필드가 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/language|언어/i)
      ).toBeInTheDocument();
    });
  });

  it("현재 언어(en)가 기본 선택값으로 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      const langField = screen.getByLabelText(/language|언어/i);
      expect(langField).toHaveValue("en");
    });
  });

  it("TC-7004: ko로 변경 후 저장 시 preferred_language = 'ko' 로 업데이트", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByLabelText(/language|언어/i));

    const langSelect = screen.getByLabelText(/language|언어/i);
    await userEvent.selectOptions(langSelect, "ko");

    await userEvent.click(screen.getByRole("button", { name: /save|저장/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ preferred_language: "ko" })
      );
    });
  });

  it("TC-7004: 언어 드롭다운에 영어(en)와 한국어(ko) 옵션이 포함된다", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByLabelText(/language|언어/i));

    const langSelect = screen.getByLabelText(/language|언어/i);
    await userEvent.click(langSelect);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /english|en/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /korean|한국어|ko/i })).toBeInTheDocument();
    });
  });

  it("TC-7004: 저장 성공 시 language 필드가 선택된 값(ko)을 유지한다", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByLabelText(/language|언어/i));

    const langSelect = screen.getByLabelText(/language|언어/i);
    await userEvent.selectOptions(langSelect, "ko");
    await userEvent.click(screen.getByRole("button", { name: /save|저장/i }));

    await waitFor(() => {
      expect(langSelect).toHaveValue("ko");
    });
  });
});

// ─── 전체 저장: 여러 필드 동시 변경 ─────────────────────────────────────────

describe("Settings: 여러 필드 동시 변경", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({
      display_name: "Old Name",
      timezone: "UTC",
      preferred_language: "en",
    });
  });

  it("이름 + 타임존 + 언어 모두 변경 후 저장 → 단일 update 호출에 모든 변경 포함", async () => {
    render(<SettingsPage />);
    await waitFor(() => screen.getByLabelText(/name|이름/i));

    await userEvent.clear(screen.getByLabelText(/name|이름/i));
    await userEvent.type(screen.getByLabelText(/name|이름/i), "New Name");
    await userEvent.selectOptions(screen.getByLabelText(/timezone|타임존/i), "Asia/Seoul");
    await userEvent.selectOptions(screen.getByLabelText(/language|언어/i), "ko");

    await userEvent.click(screen.getByRole("button", { name: /save|저장/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: "New Name",
          timezone: "Asia/Seoul",
          preferred_language: "ko",
        })
      );
    });
  });
});
