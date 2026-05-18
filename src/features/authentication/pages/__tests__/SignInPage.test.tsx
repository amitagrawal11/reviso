import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import Login from '../SignInPage';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import { mockSupabase } from '@/test/SupabaseMock';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Login form', () => {
  it('submits sign-in', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });
    const onSuccess = vi.fn();
    const { findByLabelText, findByRole } = renderWithProviders(
      <AuthProvider>
        <Login embedded initialMode="signin" onSuccess={onSuccess} />
      </AuthProvider>,
    );
    await userEvent.type(await findByLabelText(/Email/), 'a@b.com');
    await userEvent.type(await findByLabelText(/Password/), 'password1');
    await userEvent.click(await findByRole('button', { name: /Sign in/i }));
    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalled();
  });

  it('shows error from sign-in', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'bad creds' } as any,
    });
    const { findByLabelText, findByRole, findByText } = renderWithProviders(
      <AuthProvider>
        <Login embedded />
      </AuthProvider>,
    );
    await userEvent.type(await findByLabelText(/Email/), 'a@b.com');
    await userEvent.type(await findByLabelText(/Password/), 'password1');
    await userEvent.click(await findByRole('button', { name: /Sign in/i }));
    await findByText('bad creds');
  });

  it('sign-up name field required by browser', async () => {
    const { findByLabelText } = renderWithProviders(
      <AuthProvider>
        <Login embedded initialMode="signup" />
      </AuthProvider>,
    );
    const nameInput = (await findByLabelText(/Name/)) as HTMLInputElement;
    expect(nameInput.required).toBe(true);
  });

  it('sign-up submits with name', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({ data: {}, error: null });
    const { findByLabelText, findByRole } = renderWithProviders(
      <AuthProvider>
        <Login embedded initialMode="signup" />
      </AuthProvider>,
    );
    await userEvent.type(await findByLabelText(/Name/), 'Bob');
    await userEvent.type(await findByLabelText(/Email/), 'a@b.com');
    await userEvent.type(await findByLabelText(/Password/), 'password1');
    await userEvent.click(await findByRole('button', { name: /Sign up/i }));
    expect(mockSupabase.auth.signUp).toHaveBeenCalled();
  });

  it('toggles between sign-in and sign-up', async () => {
    const { findByText } = renderWithProviders(
      <AuthProvider>
        <Login embedded />
      </AuthProvider>,
    );
    await userEvent.click(await findByText('Create one'));
    await findByText('Create your free account');
  });
});
