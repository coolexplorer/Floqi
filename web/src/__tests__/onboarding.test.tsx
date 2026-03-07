/**
 * Onboarding Page Tests — TC-1015~1016 (PM-01: 온보딩 플로우)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-1015: 첫 로그인 시 온보딩 화면 표시
 * TC-1016: 온보딩 완료 (타임존 + 언어 선택 → profiles 업데이트 → /dashboard 리다이렉트)
 *
 * FAILURES expected (Red phase):
 * - OnboardingPage 컴포넌트 미존재 → import 에러
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OnboardingPage from "@/app/(dashboard)/onboarding/page";

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

interface Profile {
  id: string;
  display_name: string;
  timezone: string;
  preferred_language: string;
  onboarding_completed: boolean;
}

function setupUser(overrides: Partial<Profile> = {}) {
  const profile: Profile = {
    id: "user-123",
    display_name: "Test User",
    timezone: "UTC",
    preferred_language: "en",
    onboarding_completed: false,
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

// ─── TC-1015: 첫 로그인 시 온보딩 화면 표시 ──────────────────────────────────

describe("TC-1015: 첫 로그인 시 온보딩 화면 표시", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ onboarding_completed: false });
  });

  it("온보딩 페이지에 타임존 선택 드롭다운이 표시된다", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/timezone|타임존/i)).toBeInTheDocument();
    });
  });

  it("온보딩 페이지에 언어 선택 필드가 표시된다 (한국어/영어)", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByLabelText(/language|언어/i)).toBeInTheDocument();
    });
  });

  it("'시작하기' 또는 'Get Started' 버튼이 존재한다", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /시작하기|get started|start/i })
      ).toBeInTheDocument();
    });
  });

  it("타임존 드롭다운에 Asia/Seoul 옵션이 포함된다", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /Asia\/Seoul|Seoul/i })
      ).toBeInTheDocument();
    });
  });

  it("언어 드롭다운에 영어(en)와 한국어(ko) 옵션이 포함된다", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /english|en/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /korean|한국어|ko/i })).toBeInTheDocument();
    });
  });
});

// ─── TC-1016: 온보딩 완료 ────────────────────────────────────────────────────

describe("TC-1016: 온보딩 완료", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ onboarding_completed: false });
  });

  it("TC-1016: 타임존 Asia/Seoul + 언어 ko 선택 → '시작하기' 클릭 → profiles 업데이트", async () => {
    render(<OnboardingPage />);

    await waitFor(() => screen.getByLabelText(/timezone|타임존/i));

    const timezoneSelect = screen.getByLabelText(/timezone|타임존/i);
    await userEvent.selectOptions(timezoneSelect, "Asia/Seoul");

    const langSelect = screen.getByLabelText(/language|언어/i);
    await userEvent.selectOptions(langSelect, "ko");

    await userEvent.click(
      screen.getByRole("button", { name: /시작하기|get started|start/i })
    );

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: "Asia/Seoul",
          preferred_language: "ko",
          onboarding_completed: true,
        })
      );
    });
  });

  it("TC-1016: 온보딩 완료 후 /dashboard로 리다이렉트", async () => {
    render(<OnboardingPage />);

    await waitFor(() => screen.getByLabelText(/timezone|타임존/i));

    await userEvent.click(
      screen.getByRole("button", { name: /시작하기|get started|start/i })
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});

// ─── 추가 케이스: onboarding_completed=true → /dashboard 리다이렉트 ──────────

describe("온보딩 완료된 사용자 → /dashboard 리다이렉트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ onboarding_completed: true });
  });

  it("onboarding_completed=true 사용자가 /onboarding 접근 시 /dashboard로 리다이렉트", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });
});

// ─── 추가 케이스: 타임존 미선택 시 기본값 UTC 허용 ───────────────────────────

describe("온보딩: 타임존 미변경 시 기본값 UTC 허용", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ onboarding_completed: false });
  });

  it("타임존 미변경(기본 UTC) + 언어 선택 → 제출 가능 (UTC로 저장)", async () => {
    render(<OnboardingPage />);

    await waitFor(() => screen.getByLabelText(/language|언어/i));

    const langSelect = screen.getByLabelText(/language|언어/i);
    await userEvent.selectOptions(langSelect, "ko");

    await userEvent.click(
      screen.getByRole("button", { name: /시작하기|get started|start/i })
    );

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          timezone: "UTC",
          onboarding_completed: true,
        })
      );
    });
  });
});
