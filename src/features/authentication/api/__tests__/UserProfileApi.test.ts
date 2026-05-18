import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockSupabase } from '@/test/SupabaseMock';
import {
  updateProfileName,
  updateUserPassword,
} from '@/features/authentication/api/UserProfileApi';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('profile', () => {
  it('updateProfileName returns profile data', async () => {
    mockSupabase.from.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () =>
              Promise.resolve({ data: { id: 'u', name: 'Bob', email: 'b@x' }, error: null }),
          }),
        }),
      }),
    });
    const result = await updateProfileName('u', 'Bob');
    expect(result?.name).toBe('Bob');
  });

  it('updateProfileName throws on error', async () => {
    mockSupabase.from.mockReturnValueOnce({
      update: () => ({
        eq: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: new Error('fail') }),
          }),
        }),
      }),
    });
    await expect(updateProfileName('u', 'Bob')).rejects.toThrow();
  });

  it('updateUserPassword resolves', async () => {
    mockSupabase.auth.updateUser.mockResolvedValueOnce({ error: null });
    await expect(updateUserPassword('newpass')).resolves.toBeUndefined();
  });

  it('updateUserPassword throws on error', async () => {
    mockSupabase.auth.updateUser.mockResolvedValueOnce({ error: new Error('bad') });
    await expect(updateUserPassword('newpass')).rejects.toThrow();
  });
});
