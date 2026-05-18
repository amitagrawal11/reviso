// Tiny shims that defer loading dialogs.tsx (forms + emoji grid + Mantine modals helpers)
// until the user actually triggers them.
//
// Note: `repo` and `path` MUST be captured by the caller (which has access to
// the DataModeProvider context) and threaded through. Mantine's ModalsProvider
// portals modals above the route tree, so the modal subtree cannot read the
// data-mode context itself.
import type { Item } from '@/mock/SeedData';
import type { Repo } from '@/features/notes/repository/NoteRepositoryTypes';

type PathTransform = (p: string) => string;

const load = () => import('./NotesDialogsImpl');

export async function openItemDialog(args: {
  isFolder: boolean;
  parentId?: string | null;
  repo: Repo;
  path: PathTransform;
}) {
  (await load()).openItemDialog(args);
}

export async function openRenameDialog(item: Item, repo: Repo) {
  (await load()).openRenameDialog(item, repo);
}

export async function openConfirm(item: Item, repo: Repo) {
  (await load()).openConfirm(item, repo);
}

let warmed = false;
export function prefetchDialogs(): void {
  if (warmed) return;
  warmed = true;
  load().catch(() => {
    warmed = false;
  });
}
