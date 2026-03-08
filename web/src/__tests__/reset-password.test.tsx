/**
 * Reset Password Page Tests
 * TDD Red Phase: These tests FAIL until ResetPasswordPage is implemented.
 *
 * Tests validate:
 * - Initial render shows "Verifying your reset link..."
 * - PASSWORD_RECOVERY event fires → password form shown
 * - 10s timeout without event → expired error shown
 * - Password too short → validation error
 * - Passwords don't match → validation error
 * - Valid submission → updateUser() called → redirect to /dashboard
 * - updateUser() error → error message shown in Toast
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPasswordPage from '@/app/(auth)/reset-password/page';

let authStateCallback: ((event: string) => void) | null = null;
const mockUnsubscribe = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: vi.fn((cb: (event: string) => void) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
      }),
      updateUser: mockUpdateUser,
    },
  }),
}));

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial render shows "Verifying your reset link..."', () => {
    // Arrange & Act
    render(<ResetPasswordPage />);

    // Assert
    expect(screen.getByText(/verifying your reset link/i)).toBeInTheDocument();
  });

  it('PASSWORD_RECOVERY event fires → shows password form', async () => {
    // Arrange
    render(<ResetPasswordPage />);
    expect(screen.getByText(/verifying/i)).toBeInTheDocument();

    // Act — simulate Supabase PASSWORD_RECOVERY event
    act(() => {
      authStateCallback!('PASSWORD_RECOVERY');
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /update password/i })
    ).toBeInTheDocument();
  });

  it('shows expired error after 10s timeout without PASSWORD_RECOVERY event', async () => {
    // Arrange
    vi.useFakeTimers();
    render(<ResetPasswordPage />);
    expect(screen.getByText(/verifying/i)).toBeInTheDocument();

    // Act — advance time past the 10s timeout
    await act(async () => {
      vi.advanceTimersByTime(10001);
    });

    // Assert
    expect(screen.getByText(/expired|invalid/i)).toBeInTheDocument();
  });

  it('password too short → shows validation error', async () => {
    // Arrange
    render(<ResetPasswordPage />);
    act(() => {
      authStateCallback!('PASSWORD_RECOVERY');
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    // Act
    await userEvent.type(screen.getByLabelText(/new password/i), 'short');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'short');
    await userEvent.click(
      screen.getByRole('button', { name: /update password/i })
    );

    // Assert
    expect(
      screen.getByText(/at least 8 characters/i)
    ).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('passwords do not match → shows validation error', async () => {
    // Arrange
    render(<ResetPasswordPage />);
    act(() => {
      authStateCallback!('PASSWORD_RECOVERY');
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    // Act
    await userEvent.type(screen.getByLabelText(/new password/i), 'password123');
    await userEvent.type(
      screen.getByLabelText(/confirm password/i),
      'different123'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /update password/i })
    );

    // Assert
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('valid submission → calls updateUser → redirects to /dashboard', async () => {
    // Arrange
    mockUpdateUser.mockResolvedValueOnce({ error: null });
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });

    render(<ResetPasswordPage />);
    act(() => {
      authStateCallback!('PASSWORD_RECOVERY');
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    // Act
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword1');
    await userEvent.type(
      screen.getByLabelText(/confirm password/i),
      'newpassword1'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /update password/i })
    );

    // Assert
    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newpassword1' });
    });
    await waitFor(() => {
      expect(window.location.href).toBe('/dashboard');
    });

    // Cleanup
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('updateUser error → shows error message in Toast', async () => {
    // Arrange
    mockUpdateUser.mockResolvedValueOnce({
      error: { message: 'Password update failed' },
    });

    render(<ResetPasswordPage />);
    act(() => {
      authStateCallback!('PASSWORD_RECOVERY');
    });
    await waitFor(() => {
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    // Act
    await userEvent.type(screen.getByLabelText(/new password/i), 'newpassword1');
    await userEvent.type(
      screen.getByLabelText(/confirm password/i),
      'newpassword1'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /update password/i })
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/password update failed/i)).toBeInTheDocument();
    });
  });
});
