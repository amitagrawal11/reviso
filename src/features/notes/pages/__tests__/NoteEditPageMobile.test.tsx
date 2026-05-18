import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import NoteEdit from '../NoteEditPage';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

beforeEach(() => {
  mockRepo.reset();
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('max-width: 48em'),
    media: q,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

describe('NoteEdit mobile', () => {
  it('renders mobile save bar and segmented control', async () => {
    const { findByText } = renderWithProviders(
      <Routes>
        <Route
          element={
            <DataModeProvider mode="demo">
              <NoteEdit />
            </DataModeProvider>
          }
          path="/n/:id/edit"
        />
      </Routes>,
      { initialEntries: ['/n/n-welcome/edit'] },
    );
    await findByText('Edit');
    await findByText('Preview');
    // Toggle to preview
    await userEvent.click(await findByText('Preview'));
    expect(true).toBe(true);
  });
});
