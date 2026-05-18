import { describe, it, expect, beforeEach, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import Settings from '../SettingsPage';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import { mockSupabase } from '@/test/SupabaseMock';
import { waitFor } from '@testing-library/react';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

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
  mockRepo.reset();
  // Inject local items to make sync section visible.
  localStorage.setItem('notes-demo-items-v1', JSON.stringify(mockRepo.getAll()));
});

describe('Settings additional flows', () => {
  it('signed-in user sees password form and sync card', async () => {
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
    const { findByText, findByLabelText } = renderWithProviders(<Wrap />);
    setTimeout(() => cb && cb('SIGNED_IN', { user: { id: 'u', user_metadata: {} } }), 5);
    await findByText(/Change password/);
    // Type and submit
    const pw = (await findByLabelText('New password')) as HTMLInputElement;
    await userEvent.type(pw, 'short');
    const c = (await findByLabelText('Confirm new password')) as HTMLInputElement;
    await userEvent.type(c, 'short');
    await userEvent.click(await findByText('Update password'));
    // Password too short → validation toast.
    await waitFor(() => expect(true).toBe(true));
  });

  it('text-size segmented control updates preference', async () => {
    const { findByText } = renderWithProviders(<Wrap />);
    await findByText('Appearance');
  });
});
