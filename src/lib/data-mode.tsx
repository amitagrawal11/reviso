// "Data mode" decides which repo the rest of the app talks to.
//
//   - real:  /, /n/:id, /c/:id, /trash, ... → Supabase if configured, otherwise the mock store
//   - demo:  /demo, /demo/n/:id, ...        → always the mock store (no auth required)
//
// IMPORTANT: the Supabase repo is dynamic-imported on demand. This keeps
// @supabase/supabase-js (~100 KB gz) out of the entry chunk so the landing
// page doesn't pay for it. The provider blocks rendering with a small
// loader during the brief "fetching real-repo chunk" window — only when the
// caller actually mounted in `mode="real"` AND Supabase is configured.

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSyncExternalStore } from 'react';
import { Center, Loader } from '@mantine/core';
import { mockRepo } from '../store/mock-repo';
import type { Repo } from './repo';

export type DataMode = 'real' | 'demo';

const supabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when the deployed app talks to a real Supabase backend. */
export const usingSupabase = supabaseConfigured;

// Lazy loader — only invoked the first time a "real" tree mounts.
let _realRepoPromise: Promise<Repo> | null = null;
function getRealRepo(): Promise<Repo> {
  if (!_realRepoPromise) {
    _realRepoPromise = supabaseConfigured
      ? import('./notes').then((m) => m.supabaseRepo)
      : Promise.resolve(mockRepo);
  }
  return _realRepoPromise;
}

type Ctx = { mode: DataMode; repo: Repo };

// Default context — used by `useRepo` calls that happen outside any provider
// (which shouldn't happen in practice, but the type system needs a default).
const DataModeCtx = createContext<Ctx>({ mode: 'real', repo: mockRepo });

export function DataModeProvider({ mode, children }: { mode: DataMode; children: ReactNode }) {
  // Demo always uses mockRepo synchronously (no async needed).
  // Real-with-no-Supabase also resolves synchronously to mockRepo.
  // Real-with-Supabase needs to load the supabaseRepo chunk.
  const [realRepo, setRealRepo] = useState<Repo | null>(
    !supabaseConfigured ? mockRepo : null,
  );

  useEffect(() => {
    if (mode !== 'real' || realRepo) return;
    let cancelled = false;
    void getRealRepo().then((repo) => {
      if (!cancelled) setRealRepo(repo);
    });
    return () => {
      cancelled = true;
    };
  }, [mode, realRepo]);

  const value = useMemo<Ctx | null>(() => {
    if (mode === 'demo') return { mode, repo: mockRepo };
    if (!realRepo) return null;
    return { mode, repo: realRepo };
  }, [mode, realRepo]);

  if (!value) {
    // Real-mode tree but the repo chunk hasn't loaded yet. Brief spinner —
    // typically a single network round-trip on first visit, cached afterward.
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  return <DataModeCtx.Provider value={value}>{children}</DataModeCtx.Provider>;
}

export function useDataMode(): Ctx {
  return useContext(DataModeCtx);
}

export function useRepo(): Repo {
  return useDataMode().repo;
}

/**
 * Returns a function that prefixes `/demo` to absolute app paths when the
 * current tree is the demo, and returns them unchanged for the real tree.
 *
 *   const path = useModePath();
 *   nav(path('/n/abc/edit'));   // demo → /demo/n/abc/edit, real → /n/abc/edit
 *   <Link to={path('/recent')}>Recent</Link>
 */
export function useModePath() {
  const { mode } = useDataMode();
  return useCallback(
    (p: string) => {
      if (mode !== 'demo') return p;
      if (p === '/' || p === '') return '/demo';
      return `/demo${p.startsWith('/') ? p : `/${p}`}`;
    },
    [mode],
  );
}

/** Convenience hook — same shape as the previous `useItems`, now mode-aware. */
export function useItems() {
  const repo = useRepo();
  return useSyncExternalStore(repo.subscribe, repo.getAll, repo.getAll);
}
