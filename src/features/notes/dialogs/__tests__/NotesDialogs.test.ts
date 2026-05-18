import { describe, it } from 'vitest';
import {
  openConfirm,
  openItemDialog,
  openRenameDialog,
  prefetchDialogs,
} from '@/features/notes/dialogs/NotesDialogs';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';

describe('NotesDialogs', () => {
  it('all lazy shims are callable', async () => {
    const item = mockRepo.getAll()[0]!;
    prefetchDialogs();
    await openItemDialog({ isFolder: false, repo: mockRepo, path: (p) => p });
    await openRenameDialog(item, mockRepo);
    await openConfirm(item, mockRepo);
  });
});
