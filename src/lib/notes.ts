// Supabase-backed Repo implementation. The schema lives in supabase/schema.sql.
// This module:
//   - keeps an in-memory cache of the current user's items (UI expects sync reads)
//   - subscribes to auth state — refreshes the cache on sign-in, clears on sign-out
//   - subscribes to a realtime channel — reflects changes from other tabs/devices
//   - applies optimistic updates locally, then reconciles after server round-trip

import { supabase } from './supabase';
import type { Item } from '../mock/data';
import type { CreateInput, Repo } from './repo';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { notifications } from '@mantine/notifications';

function notifyError(action: string, err: unknown) {
  console.error(`[supabase] ${action} failed`, err);
  const msg =
    (err as { message?: string } | undefined)?.message ??
    (typeof err === 'string' ? err : 'Something went wrong');
  notifications.show({
    title: `Couldn't ${action}`,
    message: msg,
    color: 'red',
    autoClose: 6000,
  });
}

type NoteRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  content: string;
  is_folder: boolean;
  icon: string;
  starred: boolean;
  trashed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

function rowToItem(row: NoteRow): Item {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    icon: row.icon ?? (row.is_folder ? '📁' : '📄'),
    isFolder: row.is_folder,
    starred: row.starred,
    trashed: row.trashed,
    updatedAt: row.updated_at,
    content: row.content,
  };
}

function itemPatchToRowPatch(patch: Partial<Item>): Partial<NoteRow> {
  const out: Partial<NoteRow> = {};
  if ('title' in patch) out.title = patch.title;
  if ('content' in patch) out.content = patch.content;
  if ('icon' in patch) out.icon = patch.icon;
  if ('isFolder' in patch) out.is_folder = patch.isFolder!;
  if ('parentId' in patch) out.parent_id = patch.parentId ?? null;
  if ('starred' in patch) out.starred = patch.starred ?? false;
  if ('trashed' in patch) out.trashed = patch.trashed ?? false;
  return out;
}

// ── Cache + subscribers ──────────────────────────────────────────────────────
let cache: Item[] = [];
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

let currentUserId: string | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let initialized = false;

async function fetchAll() {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) {
    notifyError('load notes', error);
    return;
  }
  cache = (data ?? []).map(rowToItem);
  emit();
}

function attachRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = supabase
    .channel('notes-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => {
      // Coarse refresh — fine for personal scale; optimize to per-row
      // upsert/delete if/when this becomes hot.
      void fetchAll();
    })
    .subscribe();
}

function detachRealtime() {
  if (realtimeChannel) {
    void supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

async function initOnce() {
  if (initialized) return;
  initialized = true;

  // Hydrate from current session (if any) before wiring listeners so the
  // first emit reflects the right user immediately.
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    currentUserId = data.session.user.id;
    await fetchAll();
    attachRealtime();
  }

  // React to subsequent auth state changes.
  supabase.auth.onAuthStateChange((_event, session) => {
    const newId = session?.user.id ?? null;
    if (newId === currentUserId) return;
    currentUserId = newId;
    cache = [];
    emit();
    detachRealtime();
    if (currentUserId) {
      void fetchAll();
      attachRealtime();
    }
  });
}

// ── Repo implementation ──────────────────────────────────────────────────────
export const supabaseRepo: Repo = {
  getAll: () => cache,
  get: (id) => cache.find((i) => i.id === id),

  create: (input: CreateInput) => {
    // Generate the UUID client-side so the local cache id and the server row
    // id match — avoids the "tmp-id → real-id" swap that broke navigation
    // when callers nav('/n/<id>/edit') immediately after create().
    const id = crypto.randomUUID();
    const item: Item = {
      id,
      parentId: input.parentId ?? null,
      title: input.title,
      icon: input.icon ?? (input.isFolder ? '📁' : '📄'),
      isFolder: input.isFolder,
      starred: false,
      trashed: false,
      updatedAt: new Date().toISOString(),
      content: input.content ?? (input.isFolder ? '' : `# ${input.title}\n\n`),
    };
    cache = [item, ...cache];
    emit();

    // user_id is set by the DB trigger (set_user_id_on_notes) — we don't pass it.
    void supabase
      .from('notes')
      .insert({
        id,
        title: item.title,
        content: item.content,
        icon: item.icon,
        is_folder: item.isFolder,
        parent_id: item.parentId,
      })
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          notifyError(input.isFolder ? 'create collection' : 'create note', error);
          // Rollback optimistic insert.
          cache = cache.filter((i) => i.id !== id);
          emit();
          return;
        }
        if (data) {
          // Reconcile any server-set fields (created_at, position, etc.) but
          // keep the same id so any open URL/edit page remains valid.
          cache = cache.map((i) => (i.id === id ? rowToItem(data as NoteRow) : i));
          emit();
        }
      });

    return item;
  },

  update: (id, patch) => {
    cache = cache.map((i) =>
      i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i,
    );
    emit();
    void supabase
      .from('notes')
      .update(itemPatchToRowPatch(patch))
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          notifyError('save changes', error);
          void fetchAll();
        }
      });
  },

  trash: (id) => {
    // Mark the subtree trashed locally; server cascade is handled per-row.
    const ids = new Set<string>();
    const collect = (rootId: string) => {
      ids.add(rootId);
      cache.filter((i) => i.parentId === rootId).forEach((c) => collect(c.id));
    };
    collect(id);
    cache = cache.map((i) => (ids.has(i.id) ? { ...i, trashed: true } : i));
    emit();
    void supabase
      .from('notes')
      .update({ trashed: true })
      .in('id', Array.from(ids))
      .then(({ error }) => {
        if (error) {
          notifyError('move to trash', error);
          void fetchAll();
        }
      });
  },

  restore: (id) => {
    cache = cache.map((i) => (i.id === id ? { ...i, trashed: false } : i));
    emit();
    void supabase
      .from('notes')
      .update({ trashed: false })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          notifyError('restore item', error);
          void fetchAll();
        }
      });
  },

  hardDelete: (id) => {
    cache = cache.filter((i) => i.id !== id);
    emit();
    void supabase
      .from('notes')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          notifyError('delete forever', error);
          void fetchAll();
        }
      });
  },

  subscribe: (l) => {
    listeners.add(l);
    void initOnce();
    return () => {
      listeners.delete(l);
    };
  },
};
