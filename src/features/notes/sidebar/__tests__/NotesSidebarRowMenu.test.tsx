import { describe, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import NotesSidebar from '@/features/notes/sidebar/NotesSidebar';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import { AdaptiveDialogHost } from '@/shared/components/AdaptiveDialog';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

beforeEach(() => {
  mockRepo.reset();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 400 });
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('hover: none') || q.includes('pointer: coarse'),
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

function Wrap() {
  return (
    <AuthProvider>
      <DataModeProvider mode="demo">
        <NotesSidebar />
        <AdaptiveDialogHost />
      </DataModeProvider>
    </AuthProvider>
  );
}

describe('NotesSidebar mobile RowMenu (compact drawer)', () => {
  it('opens the drawer with action rows', async () => {
    const { getAllByLabelText, findByText } = renderWithProviders(<Wrap />);
    const trig = getAllByLabelText(/Actions for /)[0]!;
    await userEvent.click(trig);
    await findByText('Rename');
    await findByText('Move to Trash');
  });

  it('renders folder-specific actions for a collection row', async () => {
    const { getAllByLabelText, findByText } = renderWithProviders(<Wrap />);
    const trig = getAllByLabelText(/Actions for Start here/)[0]!;
    await userEvent.click(trig);
    await findByText('New note inside');
    await findByText('New subfolder inside');
  });
});
