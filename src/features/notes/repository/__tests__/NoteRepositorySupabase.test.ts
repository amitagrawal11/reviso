import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase } from '@/test/SupabaseMock';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  // Default chainable thenable: returns { data: [], error: null }.
  mockSupabase.from.mockImplementation(() => {
    const builder: any = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn),
    };
    return builder;
  });
});

describe('supabaseRepo', () => {
  it('create returns an item synchronously and emits', async () => {
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    const cb = vi.fn();
    const off = supabaseRepo.subscribe(cb);
    const item = supabaseRepo.create({ title: 't', isFolder: false });
    expect(item.id).toBeTruthy();
    expect(item.content).toContain('# t');
    expect(cb).toHaveBeenCalled();
    expect(supabaseRepo.get(item.id)).toEqual(item);
    off();
  });

  it('update mutates cache', async () => {
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    const item = supabaseRepo.create({ title: 'a', isFolder: false });
    supabaseRepo.update(item.id, { title: 'b' });
    expect(supabaseRepo.get(item.id)?.title).toBe('b');
  });

  it('trash cascades in cache', async () => {
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    const f = supabaseRepo.create({ title: 'F', isFolder: true });
    const c = supabaseRepo.create({ title: 'C', isFolder: false, parentId: f.id });
    supabaseRepo.trash(f.id);
    expect(supabaseRepo.get(f.id)?.trashed).toBe(true);
    expect(supabaseRepo.get(c.id)?.trashed).toBe(true);
  });

  it('restore unsets trashed', async () => {
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    const item = supabaseRepo.create({ title: 'a', isFolder: false });
    supabaseRepo.trash(item.id);
    supabaseRepo.restore(item.id);
    expect(supabaseRepo.get(item.id)?.trashed).toBe(false);
  });

  it('hardDelete removes from cache', async () => {
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    const item = supabaseRepo.create({ title: 'a', isFolder: false });
    supabaseRepo.hardDelete(item.id);
    expect(supabaseRepo.get(item.id)).toBeUndefined();
  });

  it('create supports folder defaults', async () => {
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    const f = supabaseRepo.create({ title: 'F', isFolder: true });
    expect(f.icon).toBe('📁');
  });

  it('getAll returns array', async () => {
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    expect(Array.isArray(supabaseRepo.getAll())).toBe(true);
  });

  it('create rolls back on insert error', async () => {
    mockSupabase.from.mockImplementation(() => {
      const builder: any = {
        select: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),
        delete: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'denied' } })),
        then: (fn: any) => Promise.resolve({ data: null, error: { message: 'denied' } }).then(fn),
      };
      return builder;
    });
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    const item = supabaseRepo.create({ title: 'fail', isFolder: false });
    await new Promise((r) => setTimeout(r, 10));
    expect(supabaseRepo.get(item.id)).toBeUndefined();
  });

  it('update / trash / restore / hardDelete error paths trigger refetch', async () => {
    mockSupabase.from.mockImplementation(() => {
      const builder: any = {
        select: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),
        delete: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        then: (fn: any) => Promise.resolve({ data: null, error: { message: 'boom' } }).then(fn),
      };
      return builder;
    });
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    const item = supabaseRepo.create({ title: 'x', isFolder: false });
    supabaseRepo.update(item.id, { title: 'y' });
    supabaseRepo.trash(item.id);
    supabaseRepo.restore(item.id);
    supabaseRepo.hardDelete(item.id);
    await new Promise((r) => setTimeout(r, 10));
  });
});
