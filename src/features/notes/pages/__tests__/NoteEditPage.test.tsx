import { describe, it, expect, beforeEach } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import NoteEdit from '../NoteEditPage';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

function Wrap() {
  return (
    <Routes>
      <Route
        element={
          <DataModeProvider mode="demo">
            <NoteEdit />
          </DataModeProvider>
        }
        path="/n/:id/edit"
      />
    </Routes>
  );
}

beforeEach(() => {
  mockRepo.reset();
});

describe('NoteEdit interactions', () => {
  it('changing title flips dirty and Save persists', async () => {
    const { findByDisplayValue, findByText } = renderWithProviders(<Wrap />, {
      initialEntries: ['/n/n-welcome/edit'],
    });
    const titleInput = (await findByDisplayValue('Welcome to the demo')) as HTMLInputElement;
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'New Title');
    const save = await findByText('Save');
    await userEvent.click(save);
    expect(mockRepo.get('n-welcome')?.title).toBe('New Title');
  });

  it('cancel on ?new=1 hard-deletes the note', async () => {
    const item = mockRepo.create({ title: 'temp', isFolder: false });
    const { findByText } = renderWithProviders(<Wrap />, {
      initialEntries: [`/n/${item.id}/edit?new=1`],
    });
    await userEvent.click(await findByText('Cancel'));
    expect(mockRepo.get(item.id)).toBeUndefined();
  });
});
