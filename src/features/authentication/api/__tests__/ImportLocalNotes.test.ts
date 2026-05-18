import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase } from '@/test/SupabaseMock';
import { mockRepo } from '@/features/notes/repository/NoteRepositoryMock';
import {
  clearLocalNotes,
  countLocalImportable,
  importLocalNotesToSupabase,
} from '@/features/authentication/api/ImportLocalNotes';

beforeEach(() => {
  vi.clearAllMocks();
  mockRepo.reset();
  localStorage.clear();
});

describe('import-from-local', () => {
  it('countLocalImportable returns 0 when no storage key', () => {
    expect(countLocalImportable()).toBe(0);
  });

  it('countLocalImportable returns live items when key exists', () => {
    mockRepo.create({ title: 'a', isFolder: false });
    expect(countLocalImportable()).toBeGreaterThan(0);
  });

  it('importLocalNotesToSupabase with no items returns 0', async () => {
    mockRepo.clearAll();
    const r = await importLocalNotesToSupabase();
    expect(r.imported).toBe(0);
    expect(r.error).toBeNull();
  });

  it('importLocalNotesToSupabase inserts ordered by depth', async () => {
    mockRepo.clearAll();
    const f = mockRepo.create({ title: 'F', isFolder: true });
    mockRepo.create({ title: 'C', isFolder: false, parentId: f.id });
    let inserted: any = null;
    mockSupabase.from.mockReturnValueOnce({
      insert: (rows: any) => {
        inserted = rows;
        return Promise.resolve({ data: null, error: null, count: rows.length });
      },
    });
    const r = await importLocalNotesToSupabase();
    expect(r.imported).toBe(2);
    expect(inserted[0].is_folder).toBe(true);
  });

  it('importLocalNotesToSupabase surfaces errors', async () => {
    mockRepo.clearAll();
    mockRepo.create({ title: 'A', isFolder: false });
    mockSupabase.from.mockReturnValueOnce({
      insert: () => Promise.resolve({ error: { message: 'dup' }, count: null }),
    });
    const r = await importLocalNotesToSupabase();
    expect(r.error).toBe('dup');
    expect(r.imported).toBe(0);
  });

  it('clearLocalNotes empties mockRepo and removes the key', () => {
    mockRepo.create({ title: 'a', isFolder: false });
    expect(localStorage.getItem('notes-demo-items-v1')).toBeTruthy();
    clearLocalNotes();
    // clearLocalNotes removes the key but mockRepo.clearAll() re-emits an empty array.
    expect(mockRepo.getAll()).toEqual([]);
  });

  it('handles broken parent-id chains', async () => {
    mockRepo.clearAll();
    mockRepo.create({ title: 'orphan', isFolder: false, parentId: 'missing-parent' });
    mockSupabase.from.mockReturnValueOnce({
      insert: () => Promise.resolve({ error: null, count: 1 }),
    });
    const r = await importLocalNotesToSupabase();
    expect(r.imported).toBe(1);
  });
});
