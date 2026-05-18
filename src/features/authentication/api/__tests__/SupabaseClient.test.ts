import { describe, it, expect } from 'vitest';
import { supabase } from '@/features/authentication/api/SupabaseClient';
import * as repo from '@/features/notes/repository/NoteRepositoryTypes';

describe('repo (types module)', () => {
  it('re-exports Item type at runtime as no-op', () => {
    expect(repo).toBeDefined();
  });
});

describe('supabase client', () => {
  it('is a mocked client object', () => {
    expect(supabase).toBeTruthy();
    expect(typeof supabase.from).toBe('function');
    expect(typeof supabase.auth.signOut).toBe('function');
  });
});
