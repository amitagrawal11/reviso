// Single source of truth for the domain model + a swappable Repo interface.
// The mock store in src/store/store.ts implements this; a future supabase
// adapter (src/lib/repo-supabase.ts) will too.
//
// When migrating to Supabase the only files that need to change are:
//   - swap out the `repo` export below to point at supabaseRepo
//   - leave every page / component untouched (they call the same API)

import type { Item } from '../mock/data';
export type { Item } from '../mock/data';

export type CreateInput = Partial<Item> & { title: string; isFolder: boolean };

export interface Repo {
  /** Synchronous read of the current items list. Use only for derived data; for live UI use useItems(). */
  getAll(): Item[];
  get(id: string): Item | undefined;
  create(input: CreateInput): Item;
  update(id: string, patch: Partial<Item>): void;
  /** Soft-delete: marks the item and all descendants as trashed. */
  trash(id: string): void;
  restore(id: string): void;
  hardDelete(id: string): void;
  /** Subscribe to mutation events. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}
