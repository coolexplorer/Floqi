/**
 * Error Boundary Tests — error.tsx components
 * Validates that error UI renders correctly and reset() is called on button click.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardError from "@/app/(dashboard)/error";
import AuthError from "@/app/(auth)/error";

// ─── DashboardError ───────────────────────────────────────────────────────────

describe("DashboardError", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Failed to load dashboard data");

  beforeEach(() => {
    mockReset.mockClear();
  });

  it("renders error heading", () => {
    render(<DashboardError error={mockError} reset={mockReset} />);

    expect(
      screen.getByRole("heading", { name: /something went wrong/i })
    ).toBeInTheDocument();
  });

  it("displays the error message", () => {
    render(<DashboardError error={mockError} reset={mockReset} />);

    expect(
      screen.getByText("Failed to load dashboard data")
    ).toBeInTheDocument();
  });

  it("renders Try again button", () => {
    render(<DashboardError error={mockError} reset={mockReset} />);

    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("calls reset() when Try again is clicked", async () => {
    const user = userEvent.setup();
    render(<DashboardError error={mockError} reset={mockReset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});

// ─── AuthError ────────────────────────────────────────────────────────────────

describe("AuthError", () => {
  const mockReset = vi.fn();
  const mockError = new Error("Authentication failed");

  beforeEach(() => {
    mockReset.mockClear();
  });

  it("renders error heading", () => {
    render(<AuthError error={mockError} reset={mockReset} />);

    expect(
      screen.getByRole("heading", { name: /something went wrong/i })
    ).toBeInTheDocument();
  });

  it("displays the error message", () => {
    render(<AuthError error={mockError} reset={mockReset} />);

    expect(screen.getByText("Authentication failed")).toBeInTheDocument();
  });

  it("calls reset() when Try again is clicked", async () => {
    const user = userEvent.setup();
    render(<AuthError error={mockError} reset={mockReset} />);

    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
