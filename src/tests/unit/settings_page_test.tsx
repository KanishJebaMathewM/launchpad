import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/features/auth/hooks/useAuth';
import SettingsPage from '@/features/settings/pages/SettingsPage';
import { api } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  api: {
    listSubscriptions: vi.fn().mockResolvedValue({}),
    inspect: vi.fn().mockResolvedValue([]),
    listSubscriptionsDeploys: vi.fn().mockResolvedValue([]),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

// Exposes the auth state that ProtectedRoute relies on
function AuthProbe() {
  const { user } = useAuth();
  return <div data-testid="auth-user">{user ? user.email : 'signed-out'}</div>;
}

describe('SettingsPage delete account', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('faas_token', 'token-1');
    localStorage.setItem('faas_user_email', 'alice@example.com');
    localStorage.setItem('faas_vat_id', 'ES123');
    // logout() redirects with window.location.href, which jsdom cannot navigate
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: 'http://localhost/settings' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    vi.restoreAllMocks();
  });

  const renderPage = async () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>
          <AuthProbe />
          <SettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.listSubscriptionsDeploys).toHaveBeenCalled());
  };

  it('signs the user out and redirects to /login when confirmed and deletion succeeds', async () => {
    vi.mocked(api.deleteAccount).mockResolvedValueOnce(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    await waitFor(() => expect(api.deleteAccount).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('auth-user')).toHaveTextContent('signed-out');
    expect(localStorage.getItem('faas_token')).toBeNull();
    expect(localStorage.getItem('faas_user_email')).toBeNull();
    expect(localStorage.getItem('faas_vat_id')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('keeps the session and shows an error when server deletion fails', async () => {
    vi.mocked(api.deleteAccount).mockRejectedValueOnce(new Error('Account deletion failed'));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    expect(await screen.findByText('Account deletion failed')).toBeInTheDocument();
    expect(screen.getByTestId('auth-user')).toHaveTextContent('alice@example.com');
    expect(localStorage.getItem('faas_token')).toBe('token-1');
    expect(localStorage.getItem('faas_vat_id')).toBe('ES123');
    expect(window.location.href).toBe('http://localhost/settings');
  });

  it('keeps the session when the dialog is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    expect(screen.getByTestId('auth-user')).toHaveTextContent('alice@example.com');
    expect(localStorage.getItem('faas_token')).toBe('token-1');
    expect(localStorage.getItem('faas_user_email')).toBe('alice@example.com');
    expect(localStorage.getItem('faas_vat_id')).toBe('ES123');
    expect(api.deleteAccount).not.toHaveBeenCalled();
    expect(window.location.href).toBe('http://localhost/settings');
  });
});

describe('SettingsPage password update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('faas_token', 'token-1');
    localStorage.setItem('faas_user_email', 'alice@example.com');
  });

  const renderPage = async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <AuthProvider>
          <SettingsPage />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(api.listSubscriptionsDeploys).toHaveBeenCalled());
    // The labels have no htmlFor, so take the inputs in order: current, new, confirm
    const [current, next, confirmation] = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="password"]'),
    );
    return { current, next, confirmation };
  };

  const submitPasswordForm = async () => {
    const fields = await renderPage();
    fireEvent.change(fields.current, { target: { value: 'oldpass123' } });
    fireEvent.change(fields.next, { target: { value: 'newpass123' } });
    fireEvent.change(fields.confirmation, { target: { value: 'newpass123' } });
    fireEvent.click(screen.getByRole('button', { name: /update password/i }));
    return fields;
  };

  it('shows the error and keeps the fields when the update fails', async () => {
    vi.mocked(api.changePassword).mockRejectedValueOnce(
      new Error('Password change is not available on this server.'),
    );
    const fields = await submitPasswordForm();

    expect(
      await screen.findByText('Password change is not available on this server.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/updated successfully/i)).not.toBeInTheDocument();
    expect(fields.current).toHaveValue('oldpass123');
    expect(fields.next).toHaveValue('newpass123');
    expect(fields.confirmation).toHaveValue('newpass123');
  });

  it('shows success and clears the fields when the update succeeds', async () => {
    vi.mocked(api.changePassword).mockResolvedValueOnce(true);
    const fields = await submitPasswordForm();

    expect(await screen.findByText(/updated successfully/i)).toBeInTheDocument();
    expect(api.changePassword).toHaveBeenCalledWith('oldpass123', 'newpass123');
    expect(fields.current).toHaveValue('');
    expect(fields.next).toHaveValue('');
    expect(fields.confirmation).toHaveValue('');
  });
});
