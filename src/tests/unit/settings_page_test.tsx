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

  it('signs the user out and redirects to /login when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    expect(screen.getByTestId('auth-user')).toHaveTextContent('signed-out');
    expect(localStorage.getItem('faas_token')).toBeNull();
    expect(localStorage.getItem('faas_user_email')).toBeNull();
    expect(localStorage.getItem('faas_vat_id')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('keeps the session when the dialog is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /delete account/i }));

    expect(screen.getByTestId('auth-user')).toHaveTextContent('alice@example.com');
    expect(localStorage.getItem('faas_token')).toBe('token-1');
    expect(localStorage.getItem('faas_user_email')).toBe('alice@example.com');
    expect(localStorage.getItem('faas_vat_id')).toBe('ES123');
    expect(window.location.href).toBe('http://localhost/settings');
  });
});
