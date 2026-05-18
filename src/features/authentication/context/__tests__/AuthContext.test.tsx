import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, renderHook, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/features/authentication/context/AuthContext';
import { mockSupabase } from '@/test/SupabaseMock';
import { ReactNode } from 'react';

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSupabase.auth.onAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
});

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthProvider', () => {
  it('starts loading then resolves to null session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
  });

  it('refreshProfile is a no-op without session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.refreshProfile();
    expect(result.current.profile).toBeNull();
  });

  it('renders children', () => {
    const { getByText } = render(
      <AuthProvider>
        <div>hello</div>
      </AuthProvider>,
    );
    expect(getByText('hello')).toBeInTheDocument();
  });

  it('handles session via onAuthStateChange', async () => {
    let listener: any;
    mockSupabase.auth.onAuthStateChange.mockImplementation((cb: any) => {
      listener = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockSupabase.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({ data: { id: 'u', name: 'A', email: 'a@x' }, error: null }),
        }),
      }),
    });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(typeof listener).toBe('function'));
    listener('SIGNED_IN', { user: { id: 'u', user_metadata: {} } });
    await waitFor(() => expect(result.current.session).not.toBeNull());
  });
});
