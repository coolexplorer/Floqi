/**
 * API Route Tests — DELETE /api/account
 *
 * Tests validate:
 * - Unauthenticated request → 401
 * - Successful deletion → 200 with { success: true }
 * - Deletion failure (admin.from throws) → 500
 */

import { DELETE } from "@/app/api/account/route";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const { mockGetUser, mockFrom, mockDeleteUser } = vi.hoisted(() => {
  const mockDeleteUser = vi.fn();
  const mockEq = vi.fn().mockResolvedValue({ error: null });
  const mockDelete = vi.fn(() => ({ eq: mockEq }));
  const mockFrom = vi.fn(() => ({ delete: mockDelete }));
  const mockGetUser = vi.fn();

  return { mockGetUser, mockFrom, mockDeleteUser };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}));

// Mock for admin client (@supabase/supabase-js createClient)
const mockAdminEq = vi.fn().mockResolvedValue({ error: null });
const mockAdminDelete = vi.fn(() => ({ eq: mockAdminEq }));
const mockAdminFrom = vi.fn(() => ({ delete: mockAdminDelete }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockAdminFrom,
    auth: {
      admin: {
        deleteUser: mockDeleteUser,
      },
    },
  })),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("DELETE /api/account", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    };
    // Default: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    // Default: admin operations succeed
    mockAdminEq.mockResolvedValue({ error: null });
    mockDeleteUser.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // TC: Unauthenticated request → 401
  it("unauthenticated request → 401 Unauthorized", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const response = await DELETE();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  // TC: Successful deletion → 200 with { success: true }
  it("authenticated user → deletes all user data → returns { success: true }", async () => {
    const response = await DELETE();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true });
  });

  // TC: Deletion includes all required tables
  it("deletes from execution_logs, automations, connections, profiles", async () => {
    await DELETE();

    expect(mockAdminFrom).toHaveBeenCalledWith("execution_logs");
    expect(mockAdminFrom).toHaveBeenCalledWith("automations");
    expect(mockAdminFrom).toHaveBeenCalledWith("connections");
    expect(mockAdminFrom).toHaveBeenCalledWith("profiles");
  });

  // TC: Auth user deletion is called
  it("calls auth.admin.deleteUser with correct user id", async () => {
    await DELETE();

    expect(mockDeleteUser).toHaveBeenCalledWith("user-123");
  });

  // TC: Deletion failure (throw) → 500
  it("admin.from throws an error → 500 Internal Server Error", async () => {
    mockAdminFrom.mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    const response = await DELETE();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  // TC: Per-table deletion error → 500 with table name
  it("table deletion returns error → 500 with descriptive message", async () => {
    mockAdminEq.mockResolvedValueOnce({
      error: { message: "FK constraint violation" },
    });

    const response = await DELETE();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/Failed to delete/);
  });

  // TC: Auth user deletion error → 500
  it("auth.admin.deleteUser returns error → 500", async () => {
    mockDeleteUser.mockResolvedValueOnce({
      data: null,
      error: { message: "Auth deletion failed" },
    });

    const response = await DELETE();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/Failed to delete auth user/);
  });
});
