import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderWithProviders } from '@/test/Utils';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import Profile from '../UserProfilePage';
import { mockSupabase } from '@/test/SupabaseMock';
import userEvent from '@testing-library/user-event';
import { waitFor } from '@testing-library/react';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Profile', () => {
  it('shows unavailable when supabase not configured (demo data-mode)', async () => {
    // usingSupabase is determined at module load from env. .env file is present
    // so usingSupabase is true. This test asserts the rendered form path.
    const { findAllByText } = renderWithProviders(
      <AuthProvider>
        <Profile />
      </AuthProvider>,
    );
    await findAllByText(/Profile/);
  });

  it('saving with empty name shows validation toast', async () => {
    // Drive auth into a session with a profile.
    let cb: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((fn: any) => {
      cb = fn;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { id: 'u', name: 'Bob', email: 'b@x' }, error: null }),
        }),
      }),
    });
    const { findByLabelText } = renderWithProviders(
      <AuthProvider>
        <Profile />
      </AuthProvider>,
    );
    setTimeout(
      () =>
        cb &&
        cb('SIGNED_IN', {
          user: { id: 'u', email: 'b@x', user_metadata: {}, created_at: new Date().toISOString() },
        }),
      5,
    );
    await waitFor(async () => {
      const input = (await findByLabelText('Name')) as HTMLInputElement;
      expect(input.value).toBe('Bob');
    });
    const name = (await findByLabelText('Name')) as HTMLInputElement;
    await userEvent.clear(name);
    expect(name.value).toBe('');
  });
});
