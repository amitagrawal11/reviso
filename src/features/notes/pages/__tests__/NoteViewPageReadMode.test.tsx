import { describe, it, beforeEach } from 'vitest';
import { Routes, Route, Outlet } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import NoteView from '../NoteViewPage';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

function Layout({ readMode }: { readMode: boolean }) {
  return (
    <DataModeProvider mode="demo">
      <Outlet
        context={{
          readMode,
          setReadMode: () => {},
          tocOpen: false,
          setTocOpen: () => {},
        }}
      />
    </DataModeProvider>
  );
}

beforeEach(() => {
  mockRepo.reset();
});

describe('NoteView read mode', () => {
  it('renders read-mode exit button', async () => {
    const { findAllByLabelText } = renderWithProviders(
      <Routes>
        <Route element={<Layout readMode={true} />}>
          <Route path="/n/:id" element={<NoteView />} />
        </Route>
      </Routes>,
      { initialEntries: ['/n/n-mermaid'] },
    );
    const btn = await findAllByLabelText('Exit read mode');
    await userEvent.click(btn[0]!);
  });
});
