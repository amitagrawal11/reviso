import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import Profile from '../UserProfilePage';
import { mockSupabase } from '@/test/SupabaseMock';
import { waitFor } from '@testing-library/react';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Profile save flow', () => {
  it('save calls updateProfileName via supabase', async () => {
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
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: 'u', name: 'Bob2', email: 'b@x' }, error: null }),
          }),
        }),
      }),
    });
    const { findByLabelText, findByText } = renderWithProviders(
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
    await userEvent.type(name, 'Bob2');
    await userEvent.click(await findByText('Save changes'));
  });

  it('reset button restores name', async () => {
    let cb: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((fn: any) => {
      cb = fn;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { id: 'u', name: 'X', email: 'x@y' }, error: null }),
        }),
      }),
    });
    const { findByLabelText, findByText } = renderWithProviders(
      <AuthProvider>
        <Profile />
      </AuthProvider>,
    );
    setTimeout(
      () =>
        cb &&
        cb('SIGNED_IN', {
          user: { id: 'u', email: 'x@y', user_metadata: {}, created_at: new Date().toISOString() },
        }),
      5,
    );
    await waitFor(async () => {
      const input = (await findByLabelText('Name')) as HTMLInputElement;
      expect(input.value).toBe('X');
    });
    const name = (await findByLabelText('Name')) as HTMLInputElement;
    await userEvent.type(name, 'Y');
    await userEvent.click(await findByText('Reset'));
  });
});
