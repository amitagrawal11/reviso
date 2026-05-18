import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route, Outlet } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import NoteView from '../NoteViewPage';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';
import { AdaptiveDialogHost } from '@/shared/components/AdaptiveDialog';

function Layout() {
  return (
    <DataModeProvider mode="demo">
      <Outlet
        context={{
          readMode: false,
          setReadMode: () => {},
          tocOpen: true,
          setTocOpen: () => {},
        }}
      />
      <AdaptiveDialogHost />
    </DataModeProvider>
  );
}

beforeEach(() => {
  mockRepo.reset();
});

describe('NoteView interactions', () => {
  it('star toggle', async () => {
    const { findAllByLabelText } = renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/n/:id" element={<NoteView />} />
        </Route>
      </Routes>,
      { initialEntries: ['/n/n-mermaid'] },
    );
    const starBtns = await findAllByLabelText(/Star note|Unstar note/);
    await userEvent.click(starBtns[0]!);
    expect(mockRepo.get('n-mermaid')?.starred).toBe(true);
  });

  it('trash button opens confirm', async () => {
    const { findAllByLabelText, findByText } = renderWithProviders(
      <Routes>
        <Route element={<Layout />}>
          <Route path="/n/:id" element={<NoteView />} />
        </Route>
      </Routes>,
      { initialEntries: ['/n/n-mermaid'] },
    );
    const buttons = await findAllByLabelText('Move note to Trash');
    await userEvent.click(buttons[0]!);
    await findByText('Move to Trash?');
  });
});
