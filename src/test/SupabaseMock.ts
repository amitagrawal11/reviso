import { vi } from 'vitest';

// A flexible chainable thenable for the postgrest builder pattern.
function makeThenable(result: any = { data: [], error: null, count: 0 }) {
  const obj: any = {
    select: vi.fn(() => makeThenable(result)),
    insert: vi.fn(() => makeThenable(result)),
    update: vi.fn(() => makeThenable(result)),
    delete: vi.fn(() => makeThenable(result)),
    upsert: vi.fn(() => makeThenable(result)),
    eq: vi.fn(() => makeThenable(result)),
    in: vi.fn(() => makeThenable(result)),
    order: vi.fn(() => makeThenable(result)),
    limit: vi.fn(() => makeThenable(result)),
    single: vi.fn(() => makeThenable({ ...result, data: result.data?.[0] ?? null })),
    maybeSingle: vi.fn(() => makeThenable({ ...result, data: result.data?.[0] ?? null })),
    then: (fn: any) => Promise.resolve(result).then(fn),
    catch: (fn: any) => Promise.resolve(result).catch(fn),
  };
  return obj;
}

export const channelMock = {
  on: vi.fn(function (this: any) {
    return this;
  }),
  subscribe: vi.fn(function (this: any) {
    return this;
  }),
};

export const mockSupabase: any = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
  },
  from: vi.fn(() => makeThenable()),
  channel: vi.fn(() => channelMock),
  removeChannel: vi.fn().mockResolvedValue(undefined),
};

export function resetSupabaseMock() {
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockSupabase.from.mockImplementation(() => makeThenable());
}
