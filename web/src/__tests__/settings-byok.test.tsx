/**
 * Settings BYOK (Bring Your Own Key) Tests — TC-7005~7008 (PM-07: BYOK API 키 등록/삭제)
 * TDD Red Phase — 구현 전 실패하는 테스트
 *
 * TC-7005: 유효한 API 키 등록
 * TC-7006: 잘못된 API 키 입력
 * TC-7007: BYOK → Managed 모드 전환
 * TC-7008: 암호화 저장 확인
 *
 * FAILURES expected (Red phase):
 * - BYOK 섹션 UI 미구현 → 요소 찾기 실패
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
      maybeSingle: mockSingle,
    }),
  }),
}));

// Mock global fetch for BYOK API calls
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  display_name: string;
  timezone: string;
  preferred_language: string;
  llm_provider: string;
  llm_api_key_encrypted: string | null;
}

function setupUser(overrides: Partial<Profile> = {}) {
  const profile: Profile = {
    id: "user-123",
    display_name: "Test User",
    timezone: "UTC",
    preferred_language: "en",
    llm_provider: "managed",
    llm_api_key_encrypted: null,
    ...overrides,
  };

  mockGetUser.mockResolvedValue({
    data: { user: { id: profile.id } },
    error: null,
  });

  mockSingle.mockResolvedValue({ data: profile, error: null });
  mockEq.mockReturnValue({ single: mockSingle, maybeSingle: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });

  return profile;
}

// ─── TC-7005: 유효한 API 키 등록 ─────────────────────────────────────────────

describe("TC-7005: 유효한 API 키 등록", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ llm_provider: "managed", llm_api_key_encrypted: null });
  });

  it("Settings 페이지에 BYOK 섹션 (API 키 입력 필드)이 존재한다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/api key|API 키/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-7005: 유효한 API 키 입력 → 저장 → 서버 API 호출 성공", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/api key|API 키/i));

    const apiKeyInput = screen.getByLabelText(/api key|API 키/i);
    await userEvent.type(apiKeyInput, "sk-ant-api03-valid-key-for-testing");

    await userEvent.click(
      screen.getByRole("button", { name: /save.*key|키.*저장|register|등록/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/account/byok",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ apiKey: "sk-ant-api03-valid-key-for-testing" }),
        })
      );
    });
  });

  it("TC-7005: 저장 성공 시 성공 메시지 표시", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/api key|API 키/i));

    const apiKeyInput = screen.getByLabelText(/api key|API 키/i);
    await userEvent.type(apiKeyInput, "sk-ant-api03-valid-key-for-testing");

    await userEvent.click(
      screen.getByRole("button", { name: /save.*key|키.*저장|register|등록/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/saved|저장.*완료|success|성공|registered|등록.*완료/i)
      ).toBeInTheDocument();
    });
  });
});

// ─── TC-7006: 잘못된 API 키 입력 ─────────────────────────────────────────────

describe("TC-7006: 잘못된 API 키 입력", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ llm_provider: "managed", llm_api_key_encrypted: null });
  });

  it("TC-7006: 빈 문자열 입력 → 유효성 검증 실패 에러 메시지 표시", async () => {
    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/api key|API 키/i));

    // 아무것도 입력하지 않고 저장 시도
    await userEvent.click(
      screen.getByRole("button", { name: /save.*key|키.*저장|register|등록/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/invalid|유효하지 않|required|필수/i)
      ).toBeInTheDocument();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("TC-7006: 잘못된 형식 키 입력 → 에러 메시지 표시", async () => {
    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/api key|API 키/i));

    const apiKeyInput = screen.getByLabelText(/api key|API 키/i);
    await userEvent.type(apiKeyInput, "not-a-valid-key");

    await userEvent.click(
      screen.getByRole("button", { name: /save.*key|키.*저장|register|등록/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/invalid|유효하지 않/i)
      ).toBeInTheDocument();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

// ─── TC-7007: BYOK → Managed 모드 전환 ──────────────────────────────────────

describe("TC-7007: BYOK → Managed 모드 전환", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ llm_provider: "byok", llm_api_key_encrypted: "encrypted:existing-key" });
  });

  it("BYOK 모드일 때 'Managed 모드로 전환' 버튼이 표시된다", async () => {
    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /managed.*모드|switch.*managed|전환/i })
      ).toBeInTheDocument();
    });
  });

  it("TC-7007: 'Managed 모드로 전환' 클릭 → 확인 모달 표시", async () => {
    render(<SettingsPage />);

    await waitFor(() =>
      screen.getByRole("button", { name: /managed.*모드|switch.*managed|전환/i })
    );

    await userEvent.click(
      screen.getByRole("button", { name: /managed.*모드|switch.*managed|전환/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/confirm|확인|are you sure|정말/i)
      ).toBeInTheDocument();
    });
  });

  it("TC-7007: 확인 모달에서 확인 → llm_provider=managed, llm_api_key_encrypted=null 업데이트", async () => {
    render(<SettingsPage />);

    await waitFor(() =>
      screen.getByRole("button", { name: /managed.*모드|switch.*managed|전환/i })
    );

    await userEvent.click(
      screen.getByRole("button", { name: /managed.*모드|switch.*managed|전환/i })
    );

    // 확인 모달에서 확인 버튼 클릭
    await waitFor(() =>
      screen.getByRole("button", { name: /^confirm$|^확인$/i })
    );

    await userEvent.click(
      screen.getByRole("button", { name: /^confirm$|^확인$/i })
    );

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          llm_provider: "managed",
          llm_api_key_encrypted: null,
        })
      );
    });
  });
});

// ─── TC-7008: 암호화 저장 확인 ───────────────────────────────────────────────

describe("TC-7008: 암호화 저장 확인 (서버 사이드)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUser({ llm_provider: "managed", llm_api_key_encrypted: null });
  });

  it("TC-7008: API 키 저장 시 서버 API로 전송된다 (클라이언트에서 encrypt 호출 안함)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/api key|API 키/i));

    const apiKeyInput = screen.getByLabelText(/api key|API 키/i);
    await userEvent.type(apiKeyInput, "sk-ant-api03-valid-key-for-testing");

    await userEvent.click(
      screen.getByRole("button", { name: /save.*key|키.*저장|register|등록/i })
    );

    await waitFor(() => {
      // API key is sent to server-side route for encryption
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/account/byok",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ apiKey: "sk-ant-api03-valid-key-for-testing" }),
        })
      );
    });

    // Client-side Supabase update should NOT be called (server handles it)
    expect(mockUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        llm_api_key_encrypted: expect.any(String),
      })
    );
  });

  it("TC-7008: 평문 키가 직접 클라이언트 DB에 전달되지 않음 (서버에서 암호화)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<SettingsPage />);

    await waitFor(() => screen.getByLabelText(/api key|API 키/i));

    const apiKeyInput = screen.getByLabelText(/api key|API 키/i);
    await userEvent.type(apiKeyInput, "sk-ant-api03-plaintext-key");

    await userEvent.click(
      screen.getByRole("button", { name: /save.*key|키.*저장|register|등록/i })
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/account/byok",
        expect.any(Object)
      );
    });

    // 평문 키가 클라이언트 DB에 직접 전달되지 않았는지 확인
    expect(mockUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({
        llm_api_key_encrypted: "sk-ant-api03-plaintext-key",
      })
    );
  });
});
