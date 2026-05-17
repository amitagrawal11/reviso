/**
 * Import notes from the local mock store into the signed-in user's Supabase
 * account.
 *
 * Use case: a user takes notes anonymously in the demo (or in local-only mode
 * before Supabase env vars were set), then signs up. Their previous work
 * lives in `notes-demo-items-v1` (localStorage) but the real tree is empty.
 * This helper migrates them in one shot.
 *
 * Implementation notes:
 *   - We preserve ids so parent_id references stay intact. The DB has an
 *     ON-DELETE-CASCADE FK from notes.parent_id → notes.id, so inserting a
 *     child before its parent would violate the FK. We sort by depth and
 *     insert top-down to satisfy the constraint per row.
 *   - The supabaseRepo is lazy-imported in normal app flow, so we use the
 *     supabase client directly here. Settings is itself a lazy route, so the
 *     supabase dependency only loads when the user opens it.
 *   - user_id is filled by the existing `set_user_id_on_notes` DB trigger
 *     based on auth.uid(); we don't pass it.
 */

import { supabase } from './supabase';
import { mockRepo } from '../store/mock-repo';
import type { Item } from '../mock/data';

export interface ImportResult {
  /** Number of items the helper attempted to insert (live, non-trashed). */
  attempted: number;
  /** Number of items the server accepted. */
  imported: number;
  /** First error message, if any. */
  error: string | null;
}

const LOCAL_STORAGE_ITEMS_KEY = 'notes-demo-items-v1';

/** Count items that would be imported — drives the "X items" label in
 *  Settings. Returns 0 if the user has never stored anything locally
 *  (i.e. no localStorage key exists) so the seed data used by the demo
 *  never appears as "items to import" for a fresh signed-in user. */
export function countLocalImportable(): number {
  // If the key doesn't exist the user has no local data — the in-memory
  // mockRepo may still hold the demo seed, but that isn't importable.
  if (!localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY)) return 0;
  return getImportableItems().length;
}

function getImportableItems(): Item[] {
  return mockRepo.getAll().filter((i) => !i.trashed);
}

/** Topological sort: roots first, then by ascending depth. Guarantees that
 *  each child's `parent_id` references a row that's already been inserted. */
function sortByDepth(items: Item[]): Item[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const depthCache = new Map<string, number>();

  function depthOf(id: string, seen: Set<string> = new Set()): number {
    const cached = depthCache.get(id);
    if (cached !== undefined) return cached;
    // Cycle guard — should be impossible in a well-formed tree, but a
    // corrupted localStorage payload could trip this.
    if (seen.has(id)) return 0;
    seen.add(id);
    const item = byId.get(id);
    if (!item || !item.parentId || !byId.has(item.parentId)) {
      depthCache.set(id, 0);
      return 0;
    }
    const d = depthOf(item.parentId, seen) + 1;
    depthCache.set(id, d);
    return d;
  }

  return [...items].sort((a, b) => depthOf(a.id) - depthOf(b.id));
}

/** Migrate every live local item into the signed-in user's Supabase notes.
 *  Returns an ImportResult with counts and the first error message (if any).
 *  Realtime subscription in `supabaseRepo` will surface the new rows in the
 *  UI within seconds of insert — no manual refresh needed. */
export async function importLocalNotesToSupabase(): Promise<ImportResult> {
  const items = getImportableItems();
  if (items.length === 0) {
    return { attempted: 0, imported: 0, error: null };
  }
  const ordered = sortByDepth(items);

  // Bulk insert as a single statement. Supabase's REST API will run the
  // inserts in order, satisfying the parent_id FK row-by-row.
  const rows = ordered.map((i) => ({
    id: i.id,
    title: i.title,
    content: i.content,
    icon: i.icon,
    is_folder: i.isFolder,
    parent_id: i.parentId,
    starred: i.starred ?? false,
    trashed: i.trashed ?? false,
  }));

  const { error, count } = await supabase.from('notes').insert(rows, { count: 'exact' });

  if (error) {
    // FK violations or unique-id collisions land here. Common case: user
    // already imported once and is trying again — id collisions on the
    // primary key throw 23505. Tell the caller; the UI surfaces a toast.
    return {
      attempted: items.length,
      imported: 0,
      error: error.message,
    };
  }

  return {
    attempted: items.length,
    imported: count ?? items.length,
    error: null,
  };
}

/** Wipe the local mock store. Used after a successful import to avoid the
 *  user re-importing the same notes on subsequent visits. Clears both the
 *  localStorage key AND the in-memory cache so the count immediately drops
 *  to 0 without requiring a page reload. */
export function clearLocalNotes() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_ITEMS_KEY);
  } catch {
    // ignore
  }
  mockRepo.clearAll();
}
