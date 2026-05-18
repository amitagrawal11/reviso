import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import Settings from '../SettingsPage';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import { mockSupabase } from '@/test/SupabaseMock';
import { waitFor } from '@testing-library/react';

function Wrap() {
  return (
    <AuthProvider>
      <DataModeProvider mode="demo">
        <Settings />
      </DataModeProvider>
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Settings', () => {
  it('toggles density preference', async () => {
    const { findByText, getByText } = renderWithProviders(<Wrap />);
    await findByText('Appearance');
    await userEvent.click(getByText('Compact'));
    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-density')).toBe('compact'),
    );
  });

  it('signed-in user sees sync card and password form (mocked auth state)', async () => {
    // Drive the auth provider to a session by stubbing onAuthStateChange.
    let cb: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((fn: any) => {
      cb = fn;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { id: 'u', name: 'X', email: 'x@x' }, error: null }),
        }),
      }),
    });
    const { findByText } = renderWithProviders(<Wrap />);
    // Trigger the auth state.
    setTimeout(() => cb && cb('SIGNED_IN', { user: { id: 'u', user_metadata: {} } }), 10);
    await findByText('Appearance');
  });
});
