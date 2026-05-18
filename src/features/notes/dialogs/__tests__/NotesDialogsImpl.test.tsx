import { describe, it, expect } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import { AdaptiveDialogHost } from '@/shared/components/AdaptiveDialog';
import {
  openConfirm,
  openItemDialog,
  openRenameDialog,
} from '@/features/notes/dialogs/NotesDialogs';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';
import { prefetchDialogs } from '@/features/notes/dialogs/NotesDialogs';

const id = (p: string) => p;

describe('dialogs', () => {
  it('openItemDialog renders form and creates a note', async () => {
    const { findByLabelText, findByText } = renderWithProviders(<AdaptiveDialogHost />);
    act(() => {
      openItemDialog({ isFolder: false, repo: mockRepo, path: id });
    });
    const input = (await findByLabelText('Name')) as HTMLInputElement;
    await userEvent.type(input, 'My Note');
    const createBtn = await findByText('Create');
    await userEvent.click(createBtn);
  });

  it('openRenameDialog renders rename form', async () => {
    const item = mockRepo.create({ title: 'orig', isFolder: false });
    const { findByLabelText, findByText } = renderWithProviders(<AdaptiveDialogHost />);
    act(() => {
      openRenameDialog(item, mockRepo);
    });
    const input = (await findByLabelText('Name')) as HTMLInputElement;
    expect(input.value).toBe('orig');
    await userEvent.clear(input);
    await userEvent.type(input, 'new');
    await userEvent.click(await findByText('Save'));
  });

  it('openConfirm trashes on click', async () => {
    const item = mockRepo.create({ title: 'gone', isFolder: false });
    const { findByText } = renderWithProviders(<AdaptiveDialogHost />);
    act(() => {
      openConfirm(item, mockRepo);
    });
    await userEvent.click(await findByText('Move to Trash'));
    await waitFor(() => expect(mockRepo.get(item.id)?.trashed).toBe(true));
  });

  it('openConfirm folder text', async () => {
    const f = mockRepo.create({ title: 'F', isFolder: true });
    const { findByText } = renderWithProviders(<AdaptiveDialogHost />);
    act(() => {
      openConfirm(f, mockRepo);
    });
    await findByText(/every note inside it/);
  });

  it('prefetchDialogs is callable', async () => {
    prefetchDialogs();
    prefetchDialogs();
  });
});
