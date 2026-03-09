/**
 * Logout & Middleware Tests — TC-1018, TC-1019
 *
 * Tests validate:
 * - Logout button in SidebarClient → signOut() called → redirect to /login
 * - Unauthenticated user accessing /dashboard → redirected to /login
 *
 * Note: DashboardLayout is an async Server Component and cannot be rendered
 * directly in a Vitest/jsdom environment. The logout button lives in SidebarClient,
 * which is tested directly here.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";
import { SidebarClient } from "@/components/layout/SidebarClient";
import { middleware } from "@/middleware";

const mockPush = vi.fn();
const mockPathname = vi.fn().mockReturnValue("/dashboard");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname(),
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
    // Arrange — render SidebarClient (contains the logout button)
    mockSignOut.mockResolvedValueOnce({ error: null });

    // Mock window.location.href (hard navigation)
    const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    const mockLocation = { ...window.location, href: '' };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    render(
      <SidebarClient
        userName="Test User"
        userEmail="test@example.com"
      />
    );

    // Act
    await userEvent.click(
      screen.getByRole("button", { name: /log out|sign out|logout/i })
    );

    // Assert — uses hard navigation (window.location.href) instead of router.push
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(window.location.href).toBe('/login');
    });

    // Restore
    if (locationDescriptor) {
      Object.defineProperty(window, 'location', locationDescriptor);
    }
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
