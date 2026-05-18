import { describe, it, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import NotesSidebar from '@/features/notes/sidebar/NotesSidebar';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { AuthProvider } from '@/features/authentication/context/AuthContext';
import { AdaptiveDialogHost } from '@/shared/components/AdaptiveDialog';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

// Force a compact viewport so the RowMenu renders its drawer variant.
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

function Wrapped() {
  return (
    <AuthProvider>
      <DataModeProvider mode="demo">
        <NotesSidebar />
        <AdaptiveDialogHost />
      </DataModeProvider>
    </AuthProvider>
  );
}

describe('NotesSidebar (compact viewport)', () => {
  it('renders without throwing on compact widths', () => {
    renderWithProviders(<Wrapped />);
  });

  it('opens row action menu', async () => {
    const { getAllByLabelText } = renderWithProviders(<Wrapped />);
    const actions = getAllByLabelText(/Actions for /);
    await userEvent.click(actions[0]!);
  });
});
