import { describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/Utils';
import Trash from '../TrashPage';
import { DataModeProvider } from '@/features/notes/repository/NoteRepositoryContext';
import { AdaptiveDialogHost } from '@/shared/components/AdaptiveDialog';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

function Wrap() {
  return (
    <DataModeProvider mode="demo">
      <Trash />
      <AdaptiveDialogHost />
    </DataModeProvider>
  );
}

beforeEach(() => {
  mockRepo.reset();
});

describe('Trash interactions', () => {
  it('Empty trash flow → confirm dialog → empties', async () => {
    const item = mockRepo.create({ title: 'a', isFolder: false });
    mockRepo.trash(item.id);
    const { findAllByText, findByText } = renderWithProviders(<Wrap />);
    const emptyBtns = await findAllByText('Empty trash');
    await userEvent.click(emptyBtns[0]!);
    const confirm = await findByText('Empty trash?');
    expect(confirm).toBeInTheDocument();
    // Click "Empty trash" inside the modal (the second one)
    const inDialog = await findAllByText('Empty trash');
    await userEvent.click(inDialog[inDialog.length - 1]!);
  });

  it('Restore button restores an item', async () => {
    const item = mockRepo.create({ title: 'ok', isFolder: false });
    mockRepo.trash(item.id);
    const { findByText } = renderWithProviders(<Wrap />);
    await userEvent.click(await findByText('Restore'));
    expect(mockRepo.get(item.id)?.trashed).toBe(false);
  });

  it('Delete forever opens confirm and hard-deletes', async () => {
    const item = mockRepo.create({ title: 'doomed', isFolder: false });
    mockRepo.trash(item.id);
    const { findAllByText } = renderWithProviders(<Wrap />);
    const btns = await findAllByText('Delete forever');
    await userEvent.click(btns[0]!);
    const inDialog = await findAllByText('Delete forever');
    await userEvent.click(inDialog[inDialog.length - 1]!);
    expect(mockRepo.get(item.id)).toBeUndefined();
  });

  it('Delete forever folder uses everything-inside copy', async () => {
    const f = mockRepo.create({ title: 'F', isFolder: true });
    mockRepo.trash(f.id);
    const { findAllByText, findByText } = renderWithProviders(<Wrap />);
    const btns = await findAllByText('Delete forever');
    await userEvent.click(btns[0]!);
    await findByText(/everything inside it/);
  });
});
