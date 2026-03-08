/**
 * Forgot Password Page Tests
 * TDD Red Phase: These tests FAIL until ForgotPasswordPage is implemented.
 *
 * Tests validate:
 * - Email input and submit button render
 * - Empty email → "Email is required" validation error
 * - Valid email → resetPasswordForEmail() called → success message shown
 * - Supabase error → error message shown in Toast
 * - "Sign In" link exists pointing to /login
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPasswordPage from '@/app/(auth)/forgot-password/page';

const mockResetPasswordForEmail = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { resetPasswordForEmail: mockResetPasswordForEmail },
  }),
}));

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email input and submit button', () => {
    // Arrange & Act
    render(<ForgotPasswordPage />);

    // Assert
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /send reset link/i })
    ).toBeInTheDocument();
  });

  it('empty email submission → shows "Email is required" error', async () => {
    // Arrange
    render(<ForgotPasswordPage />);

    // Act — submit without filling email
    await userEvent.click(
      screen.getByRole('button', { name: /send reset link/i })
    );

    // Assert
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('valid email → calls resetPasswordForEmail → shows success message', async () => {
    // Arrange
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });
    render(<ForgotPasswordPage />);

    // Act
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.click(
      screen.getByRole('button', { name: /send reset link/i })
    );

    // Assert
    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ redirectTo: expect.any(String) })
      );
    });
    await waitFor(() => {
      expect(
        screen.getByText(/check your email for a password reset link/i)
      ).toBeInTheDocument();
    });
  });

  it('Supabase error → shows error message in Toast', async () => {
    // Arrange
    mockResetPasswordForEmail.mockResolvedValueOnce({
      error: { message: 'Unable to send reset email' },
    });
    render(<ForgotPasswordPage />);

    // Act
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.click(
      screen.getByRole('button', { name: /send reset link/i })
    );

    // Assert
    await waitFor(() => {
      expect(
        screen.getByText(/unable to send reset email/i)
      ).toBeInTheDocument();
    });
  });

  it('"Sign In" link exists and points to /login', () => {
    // Arrange & Act
    render(<ForgotPasswordPage />);

    // Assert
    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/login');
  });
});
