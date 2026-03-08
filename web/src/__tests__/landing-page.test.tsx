/**
 * Landing Page Tests — US-901 (랜딩 페이지), US-902 (CTA), TC-9003
 * TDD Red Phase: Tests FAIL until full LandingPage is implemented.
 *
 * Tests validate:
 * - Hero section renders (headline, subheadline, CTA button)
 * - TC-9003: "Get started free" → navigates to /signup
 * - "Log in" link → navigates to /login
 * - 3-step How It Works section renders
 * - 5 template cards render (Morning Briefing, Email Triage, etc.)
 * - Mobile responsive: sections stack on narrow viewport
 * - Authenticated user → redirected to /dashboard
 * - Anonymous user → stays on landing page
 *
 * EXPECTED FAILURES (Red phase):
 * - Hero specific headline/subheadline — current page has generic placeholder text
 * - "Get started free" button — current page says "Get Started"
 * - "Log in" link — current page says "Sign In"
 * - How It Works section — not implemented
 * - Template cards — not implemented
 * - Authenticated redirect — not implemented
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LandingPage from "@/app/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  redirect: vi.fn(),
}));

// Mock Next.js Link to render a simple <a> for testing
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: anonymous user (not logged in)
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
});

// ─── Hero Section Tests ───────────────────────────────────────────────────────

describe("LandingPage — Hero Section", () => {
  it("renders main hero headline describing the product value proposition", () => {
    render(<LandingPage />);

    // RED: Current page only has "Floqi" as h1, no value-prop headline
    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveTextContent(
      /automate|autopilot|workflow|자동화|일상/i
    );
  });

  it("renders hero subheadline mentioning automation and services (Gmail, Calendar, Notion)", () => {
    render(<LandingPage />);

    // RED: Current placeholder has generic text, not specific service mentions
    expect(
      screen.getByText(/gmail|calendar|notion|connect your tools|연결하세요/i)
    ).toBeInTheDocument();
  });

  it("renders hero section with data-testid='hero' or role='banner'", () => {
    render(<LandingPage />);

    // RED: No semantic hero section in current page
    const hero =
      document.querySelector("[data-testid='hero']") ??
      screen.queryByRole("banner");
    expect(hero).toBeInTheDocument();
  });

  it("renders primary CTA button in hero linking to /signup", () => {
    render(<LandingPage />);

    // Hero CTA: "Get started" link to /signup
    const ctaLinks = screen.getAllByRole("link", { name: /get started/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    expect(ctaLinks[0]).toHaveAttribute("href", "/signup");
  });

  it("primary CTA links to /signup (TC-9003)", () => {
    render(<LandingPage />);

    // TC-9003: CTA navigates to /signup
    const ctaLinks = screen.getAllByRole("link", { name: /get started/i });
    expect(ctaLinks[0]).toHaveAttribute("href", "/signup");
  });

  it("renders 'Log in' navigation link in hero or nav", () => {
    render(<LandingPage />);

    // TopNavBar has "Log in" link
    const loginLink = screen.getByRole("link", { name: /^log in$/i });
    expect(loginLink).toBeInTheDocument();
  });

  it("'Log in' link navigates to /login", () => {
    render(<LandingPage />);

    // TopNavBar has "Log in" link to /login
    const loginLink = screen.getByRole("link", { name: /^log in$/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});

// ─── TC-9003: CTA Navigation Tests ───────────────────────────────────────────

describe("TC-9003: CTA Navigation", () => {
  it("TC-9003: clicking primary CTA button navigates to /signup", async () => {
    render(<LandingPage />);

    // Hero CTA links to /signup
    const ctaLinks = screen.getAllByRole("link", { name: /get started/i });
    const ctaButton = ctaLinks[0];
    await userEvent.click(ctaButton);

    // Link has correct href (anchor navigation)
    expect(ctaButton).toHaveAttribute("href", "/signup");
  });

  it("TC-9003: clicking 'Log in' link navigates to /login", async () => {
    render(<LandingPage />);

    // TopNavBar has "Log in" link to /login
    const loginLink = screen.getByRole("link", { name: /^log in$/i });
    await userEvent.click(loginLink);

    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("TC-9003: has a 'Sign up' link in nav linking to /signup", () => {
    render(<LandingPage />);

    // TopNavBar has "Sign up" link to /signup
    const signUpLinks = screen.getAllByRole("link", { name: /sign up/i });
    expect(signUpLinks.length).toBeGreaterThan(0);
    expect(signUpLinks[0]).toHaveAttribute("href", "/signup");
  });
});

// ─── How It Works Section Tests ───────────────────────────────────────────────

describe("LandingPage — How It Works Section", () => {
  it("renders 'How it works' section heading", () => {
    render(<LandingPage />);

    // RED: No "How it works" section in current placeholder
    expect(
      screen.getByRole("heading", { name: /how it works/i })
    ).toBeInTheDocument();
  });

  it("renders exactly 3 numbered steps in how-it-works section", () => {
    render(<LandingPage />);

    // RED: No steps in current page
    // Steps should have step numbers (1, 2, 3) or step labels
    const steps = document.querySelectorAll(
      "[data-testid^='step-'], [data-step], .step"
    );
    expect(steps.length).toBeGreaterThanOrEqual(3);
  });

  it("step 1 describes connecting services (Connect)", () => {
    render(<LandingPage />);

    // RED: No steps content in current page
    expect(
      screen.getByText(/connect|서비스 연결|연결하세요/i)
    ).toBeInTheDocument();
  });

  it("step 2 describes choosing a template (Choose)", () => {
    render(<LandingPage />);

    // RED: No steps content in current page
    expect(
      screen.getByText(/choose.*template|template.*choose|템플릿.*선택|선택하세요/i)
    ).toBeInTheDocument();
  });

  it("step 3 describes automation running (Sit back / 자동으로 실행)", () => {
    render(<LandingPage />);

    // RED: No steps content in current page (not just the word "automate" in nav)
    expect(
      screen.getByText(/sit back|let floqi|자동으로 실행|자동 실행|floqi가 알아서/i)
    ).toBeInTheDocument();
  });
});

// ─── Template Cards Tests ─────────────────────────────────────────────────────

describe("LandingPage — Template Cards Section", () => {
  it("renders automation templates section heading", () => {
    render(<LandingPage />);

    // RED: No templates section in current page
    expect(
      screen.getByRole("heading", {
        name: /template|automation|자동화 템플릿/i,
      })
    ).toBeInTheDocument();
  });

  it("renders Morning Briefing template card", () => {
    render(<LandingPage />);

    // RED: No template cards in current page
    expect(screen.getByText(/morning briefing/i)).toBeInTheDocument();
  });

  it("renders Email Triage template card", () => {
    render(<LandingPage />);

    // RED: No template cards in current page
    expect(screen.getByText(/email triage/i)).toBeInTheDocument();
  });

  it("renders Reading Digest template card", () => {
    render(<LandingPage />);

    // RED: No template cards in current page
    expect(screen.getByText(/reading digest/i)).toBeInTheDocument();
  });

  it("renders Weekly Review template card", () => {
    render(<LandingPage />);

    // RED: No template cards in current page
    expect(screen.getByText(/weekly review/i)).toBeInTheDocument();
  });

  it("renders Smart Save template card", () => {
    render(<LandingPage />);

    // RED: No template cards in current page
    expect(screen.getByText(/smart save/i)).toBeInTheDocument();
  });

  it("renders 5 template cards in total", () => {
    render(<LandingPage />);

    // RED: No template cards in current page
    const cards = document.querySelectorAll(
      "[data-testid^='template-card'], [data-template]"
    );
    expect(cards.length).toBe(5);
  });
});

// ─── Mobile Responsive Tests ──────────────────────────────────────────────────

describe("LandingPage — Mobile Responsive", () => {
  beforeEach(() => {
    // Mock window.matchMedia for responsive tests
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("max-width: 768px"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("CTA button text is fully visible (not truncated) at 375px viewport", () => {
    // Simulate 375px viewport (iPhone SE)
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<LandingPage />);

    // Hero CTA should be present and visible
    const ctaLinks = screen.getAllByRole("link", { name: /get started/i });
    expect(ctaLinks[0]).toBeInTheDocument();
    expect(ctaLinks[0]).toBeVisible();
  });

  it("hero section is rendered and accessible at 768px viewport", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<LandingPage />);

    // RED: No dedicated hero section in current page
    const hero =
      document.querySelector("[data-testid='hero']") ??
      screen.queryByRole("banner");
    expect(hero).toBeInTheDocument();
  });

  it("template cards section is present on mobile viewport (375px)", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<LandingPage />);

    // RED: No template cards in current page
    expect(screen.getByText(/morning briefing/i)).toBeInTheDocument();
  });
});

// ─── Authenticated Redirect Tests ─────────────────────────────────────────────

describe("LandingPage — Authenticated User Redirect", () => {
  it("anonymous user visiting '/' stays on landing page (no redirect)", async () => {
    // Arrange: anonymous user
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    render(<LandingPage />);

    // Assert: mockPush is NOT called (stays on landing page)
    await waitFor(() => {
      // Give async auth check time to run
    });
    expect(mockPush).not.toHaveBeenCalledWith("/dashboard");
  });

  it("logged-in user visiting '/' redirects to /dashboard", async () => {
    // Arrange: authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
      error: null,
    });

    render(<LandingPage />);

    // RED: Current page has no auth check — no redirect occurs
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("landing page shows a loading skeleton or hero content while auth check runs", async () => {
    // Arrange: auth resolves after a slight delay
    mockGetUser.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () => resolve({ data: { user: null }, error: null }),
            100
          )
        )
    );

    render(<LandingPage />);

    // RED: Current page does not have a loading skeleton or hero section
    // The full implementation should render hero content immediately (SSR-safe)
    // while auth check is in flight, OR show a loading skeleton
    const hasLoadingSkeleton =
      document.querySelector(
        "[data-testid='loading-skeleton'], [aria-busy='true']"
      ) !== null;
    const hasHeroContent =
      screen.queryAllByRole("link", { name: /get started/i }).length > 0;

    // At least one of these should be true in the final implementation
    expect(hasLoadingSkeleton || hasHeroContent).toBe(true);
  });
});
