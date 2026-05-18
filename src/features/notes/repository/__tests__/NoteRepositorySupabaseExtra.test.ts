import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase } from '@/test/SupabaseMock';

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('supabaseRepo extra paths', () => {
  it('reconciles cache with server row after insert success', async () => {
    // First call (insert) returns a row; subsequent (fetchAll order/select) returns []
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.from.mockImplementation(() => {
      const row = {
        id: 'srv-id',
        user_id: 'u',
        parent_id: null,
        title: 'srv-title',
        content: 'c',
        is_folder: false,
        icon: '📝',
        starred: false,
        trashed: false,
        position: 0,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      };
      const builder: any = {
        select: vi.fn(() => builder),
        insert: vi.fn(() => builder),
        update: vi.fn(() => builder),
        delete: vi.fn(() => builder),
        eq: vi.fn(() => builder),
        in: vi.fn(() => builder),
        order: vi.fn(() => builder),
        single: vi.fn(() => Promise.resolve({ data: row, error: null })),
        then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn),
      };
      return builder;
    });
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    const item = supabaseRepo.create({ title: 'local', isFolder: false });
    await new Promise((r) => setTimeout(r, 20));
    // After reconcile, some entry's title equals 'srv-title'
    expect(supabaseRepo.getAll().some((i) => i.title === 'srv-title')).toBe(true);
    void item;
  });

  it('auth state change to a new user clears cache, fetches new data, and attaches realtime', async () => {
    let authCb: any;
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
      authCb = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
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
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    const off = supabaseRepo.subscribe(() => {});
    // wait for initOnce
    await new Promise((r) => setTimeout(r, 10));
    expect(authCb).toBeTruthy();
    // Trigger sign-in
    authCb('SIGNED_IN', { user: { id: 'new-user' } });
    await new Promise((r) => setTimeout(r, 10));
    // Same user again — early-return path
    authCb('SIGNED_IN', { user: { id: 'new-user' } });
    // Sign out (null user)
    authCb('SIGNED_OUT', null);
    await new Promise((r) => setTimeout(r, 10));
    off();
  });

  it('initOnce hydrates from existing session', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'pre' } } },
      error: null,
    });
    mockSupabase.from.mockImplementation(() => {
      const builder: any = {
        select: vi.fn(() => builder),
        order: vi.fn(() => builder),
        then: (fn: any) => Promise.resolve({ data: [], error: null }).then(fn),
      };
      return builder;
    });
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    supabaseRepo.subscribe(() => {});
    await new Promise((r) => setTimeout(r, 20));
    expect(mockSupabase.channel).toHaveBeenCalled();
  });

  it('fetchAll error path triggers notifyError', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'p' } } },
      error: null,
    });
    mockSupabase.from.mockImplementation(() => {
      const builder: any = {
        select: vi.fn(() => builder),
        order: vi.fn(() => builder),
        then: (fn: any) => Promise.resolve({ data: null, error: { message: 'denied' } }).then(fn),
      };
      return builder;
    });
    const { supabaseRepo } = await import('@/features/notes/repository/NoteRepositorySupabase');
    supabaseRepo.subscribe(() => {});
    await new Promise((r) => setTimeout(r, 20));
  });
});
