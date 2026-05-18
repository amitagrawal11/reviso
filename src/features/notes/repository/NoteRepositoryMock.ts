// In-memory + localStorage Repo. Used when Supabase env vars aren't set OR as
// a dev/demo fallback. The active repo is chosen in src/store/store.ts.
import { type Item, seedItems } from '@/mock/SeedData';
import type { CreateInput, Repo } from '@/features/notes/repository/NoteRepositoryTypes';

const KEY = 'notes-demo-items-v1';

function load(): Item[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Item[];
    }
  } catch {
    // Corrupt localStorage — fall through to seed.
  }
  return structuredClone(seedItems);
}

let items: Item[] = load();
const listeners = new Set<() => void>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded / private mode — listeners still fire.
  }
  listeners.forEach((l) => l());
}

export const mockRepo: Repo & { reset: () => void; clearAll: () => void } = {
  getAll: () => items,
  get: (id) => items.find((i) => i.id === id),
  create: (input: CreateInput) => {
    const item: Item = {
      id: crypto.randomUUID(),
      parentId: input.parentId ?? null,
      title: input.title,
      icon: input.icon ?? (input.isFolder ? '📁' : '📄'),
      isFolder: input.isFolder,
      starred: false,
      trashed: false,
      updatedAt: new Date().toISOString(),
      content: input.content ?? (input.isFolder ? '' : `# ${input.title}\n\n`),
    };
    items = [...items, item];
    emit();
    return item;
  },
  update: (id, patch) => {
    items = items.map((i) =>
      i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i,
    );
    emit();
  },
  trash: (id) => {
    const ids = new Set<string>();
    const collect = (rootId: string) => {
      ids.add(rootId);
      items.filter((i) => i.parentId === rootId).forEach((c) => collect(c.id));
    };
    collect(id);
    items = items.map((i) => (ids.has(i.id) ? { ...i, trashed: true } : i));
    emit();
  },
  restore: (id) => {
    items = items.map((i) => (i.id === id ? { ...i, trashed: false } : i));
    emit();
  },
  hardDelete: (id) => {
    items = items.filter((i) => i.id !== id);
    emit();
  },
  subscribe: (l) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  reset: () => {
    items = structuredClone(seedItems);
    emit();
  },
  // Clears to empty (not seed) — used after a successful import to signed-in
  // account so the local copy doesn't re-appear as "importable".
  clearAll: () => {
    items = [];
    emit();
  },
};
