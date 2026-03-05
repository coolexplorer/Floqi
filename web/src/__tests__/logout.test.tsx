/**
 * Logout & Middleware Tests — TC-1018, TC-1019
 * TDD Red Phase:
 * - TC-1018 FAILS: DashboardLayout has no logout button yet
 * - TC-1019 tests middleware redirect (middleware already implemented)
 *
 * Tests validate:
 * - Logout button → signOut() called → redirect to /login
 * - Unauthenticated user accessing /dashboard → redirected to /login
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";
import DashboardLayout from "@/app/(dashboard)/layout";
import { middleware } from "@/middleware";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignOut = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

describe("Logout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TC-1018: logout button click → signOut() called → redirect to /login", async () => {
    // Arrange
    mockSignOut.mockResolvedValueOnce({ error: null });
    render(
      <DashboardLayout>
        <div>Dashboard Content</div>
      </DashboardLayout>
    );

    // Act
    await userEvent.click(
      screen.getByRole("button", { name: /log out|sign out|logout/i })
    );

    // Assert
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });
});

describe("Middleware", () => {
  it("TC-1019: unauthenticated user accessing /dashboard → redirected to /login", async () => {
    // Arrange — mock returns no user (unauthenticated)
    const request = new NextRequest(new URL("http://localhost/dashboard"));

    // Act
    const response = await middleware(request);

    // Assert — middleware should redirect to /login
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toMatch(/\/login/);
  });
});
