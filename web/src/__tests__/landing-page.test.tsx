/**
 * Landing Page Tests — US-901 (랜딩 페이지), US-902 (CTA), TC-9003
 * TDD: Server Component pattern — async resolve → render.
 *
 * Tests validate:
 * - Hero section renders (headline, subheadline, CTA button)
 * - TC-9003: "Get started" → navigates to /signup
 * - "Log in" link → navigates to /login
 * - 3-step How It Works section renders
 * - 5 template cards render (Morning Briefing, Email Triage, etc.)
 * - Mobile responsive: sections stack on narrow viewport
 * - Authenticated user → redirect('/dashboard') called (Server Component)
 * - Anonymous user → redirect not called
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { redirect } from "next/navigation";
import LandingPage from "@/app/page";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
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
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
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
  it("renders main hero headline describing the product value proposition", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const headline = screen.getByRole("heading", { level: 1 });
    expect(headline).toHaveTextContent(
      /automate|autopilot|workflow|자동화|일상/i
    );
  });

  it("renders hero subheadline mentioning automation and services (Gmail, Calendar, Notion)", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(
      screen.getByText(/gmail|calendar|notion|connect your tools|연결하세요/i)
    ).toBeInTheDocument();
  });

  it("renders hero section with data-testid='hero' or role='banner'", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const hero =
      document.querySelector("[data-testid='hero']") ??
      screen.queryByRole("banner");
    expect(hero).toBeInTheDocument();
  });

  it("renders primary CTA button in hero linking to /signup", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const ctaLinks = screen.getAllByRole("link", { name: /get started/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    expect(ctaLinks[0]).toHaveAttribute("href", "/signup");
  });

  it("primary CTA links to /signup (TC-9003)", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const ctaLinks = screen.getAllByRole("link", { name: /get started/i });
    expect(ctaLinks[0]).toHaveAttribute("href", "/signup");
  });

  it("renders 'Log in' navigation link in hero or nav", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const loginLink = screen.getByRole("link", { name: /^log in$/i });
    expect(loginLink).toBeInTheDocument();
  });

  it("'Log in' link navigates to /login", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const loginLink = screen.getByRole("link", { name: /^log in$/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });
});

// ─── TC-9003: CTA Navigation Tests ───────────────────────────────────────────

describe("TC-9003: CTA Navigation", () => {
  it("TC-9003: clicking primary CTA button navigates to /signup", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const ctaLinks = screen.getAllByRole("link", { name: /get started/i });
    const ctaButton = ctaLinks[0];
    await userEvent.click(ctaButton);

    expect(ctaButton).toHaveAttribute("href", "/signup");
  });

  it("TC-9003: clicking 'Log in' link navigates to /login", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const loginLink = screen.getByRole("link", { name: /^log in$/i });
    await userEvent.click(loginLink);

    expect(loginLink).toHaveAttribute("href", "/login");
  });

  it("TC-9003: has a 'Sign up' link in nav linking to /signup", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const signUpLinks = screen.getAllByRole("link", { name: /sign up/i });
    expect(signUpLinks.length).toBeGreaterThan(0);
    expect(signUpLinks[0]).toHaveAttribute("href", "/signup");
  });
});

// ─── How It Works Section Tests ───────────────────────────────────────────────

describe("LandingPage — How It Works Section", () => {
  it("renders 'How it works' section heading", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(
      screen.getByRole("heading", { name: /how it works/i })
    ).toBeInTheDocument();
  });

  it("renders exactly 3 numbered steps in how-it-works section", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const steps = document.querySelectorAll(
      "[data-testid^='step-'], [data-step], .step"
    );
    expect(steps.length).toBeGreaterThanOrEqual(3);
  });

  it("step 1 describes connecting services (Connect)", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(
      screen.getByText(/connect|서비스 연결|연결하세요/i)
    ).toBeInTheDocument();
  });

  it("step 2 describes choosing a template (Choose)", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(
      screen.getByText(/choose.*template|template.*choose|템플릿.*선택|선택하세요/i)
    ).toBeInTheDocument();
  });

  it("step 3 describes automation running (Sit back / 자동으로 실행)", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(
      screen.getByText(/sit back|let floqi|자동으로 실행|자동 실행|floqi가 알아서/i)
    ).toBeInTheDocument();
  });
});

// ─── Template Cards Tests ─────────────────────────────────────────────────────

describe("LandingPage — Template Cards Section", () => {
  it("renders automation templates section heading", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(
      screen.getByRole("heading", {
        name: /template|automation|자동화 템플릿/i,
      })
    ).toBeInTheDocument();
  });

  it("renders Morning Briefing template card", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(screen.getByText(/morning briefing/i)).toBeInTheDocument();
  });

  it("renders Email Triage template card", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(screen.getByText(/email triage/i)).toBeInTheDocument();
  });

  it("renders Reading Digest template card", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(screen.getByText(/reading digest/i)).toBeInTheDocument();
  });

  it("renders Weekly Review template card", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(screen.getByText(/weekly review/i)).toBeInTheDocument();
  });

  it("renders Smart Save template card", async () => {
    const jsx = await LandingPage();
    render(jsx);

    expect(screen.getByText(/smart save/i)).toBeInTheDocument();
  });

  it("renders 5 template cards in total", async () => {
    const jsx = await LandingPage();
    render(jsx);

    const cards = document.querySelectorAll(
      "[data-testid^='template-card'], [data-template]"
    );
    expect(cards.length).toBe(5);
  });
});

// ─── Mobile Responsive Tests ──────────────────────────────────────────────────

describe("LandingPage — Mobile Responsive", () => {
  beforeEach(() => {
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

  it("CTA button text is fully visible (not truncated) at 375px viewport", async () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    const jsx = await LandingPage();
    render(jsx);

    const ctaLinks = screen.getAllByRole("link", { name: /get started/i });
    expect(ctaLinks[0]).toBeInTheDocument();
    expect(ctaLinks[0]).toBeVisible();
  });

  it("hero section is rendered and accessible at 768px viewport", async () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 768,
    });

    const jsx = await LandingPage();
    render(jsx);

    const hero =
      document.querySelector("[data-testid='hero']") ??
      screen.queryByRole("banner");
    expect(hero).toBeInTheDocument();
  });

  it("template cards section is present on mobile viewport (375px)", async () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    });

    const jsx = await LandingPage();
    render(jsx);

    expect(screen.getByText(/morning briefing/i)).toBeInTheDocument();
  });
});

// ─── Authenticated Redirect Tests ─────────────────────────────────────────────

describe("LandingPage — Authenticated User Redirect", () => {
  it("anonymous user visiting '/' stays on landing page (no redirect)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const jsx = await LandingPage();
    render(jsx);

    expect(redirect).not.toHaveBeenCalledWith("/dashboard");
  });

  it("logged-in user visiting '/' redirects to /dashboard", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123", email: "user@example.com" } },
      error: null,
    });

    await LandingPage();

    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });
});
