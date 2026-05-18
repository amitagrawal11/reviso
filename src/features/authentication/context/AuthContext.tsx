import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  hydrateFromUpstream,
  setUpstreamSync,
  type Preferences,
} from '@/shared/lib/UserPreferences';

// NOTE: we do NOT static-import '@/features/authentication/api/SupabaseClient' here. The supabase-js bundle is
// large (~100 KB gz) and pulls in @supabase/postgrest-js, gotrue-js, etc. By
// dynamic-importing it from inside an effect, the landing page renders without
// blocking on auth network code; supabase loads in the background, then this
// provider fills in the session.

export type Profile = {
  id: string;
  name: string;
  email: string | null;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

// Cached promise so multiple consumers (auth provider + Login + Profile, etc.)
// don't re-import the module.
let supabasePromise: Promise<SupabaseClient> | null = null;
function getSupabase(): Promise<SupabaseClient> {
  if (!supabasePromise) {
    supabasePromise = import('@/features/authentication/api/SupabaseClient').then(
      (m) => m.supabase,
    );
  }
  return supabasePromise;
}

/**
 * Synchronously check whether Supabase persisted a session in localStorage.
 * Supabase-js stores the token under "sb-<project-ref>-auth-token".
 * Reading this before the async chunk loads lets us skip the Loading→Landing
 * flash for returning users: if the key exists we can start with loading=false
 * and render AppLayout immediately instead of showing Landing first.
 *
 * We only peek at the key's existence — we never parse or trust its value
 * for security decisions. The real session object arrives a moment later
 * via onAuthStateChange and replaces the sentinel.
 */
function hasStoredSession(): boolean {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    if (!url) return false;
    // Derive the project ref the same way supabase-js does:
    //   "https://<ref>.supabase.co" → ref is the hostname's first segment.
    const ref = new URL(url).hostname.split('.')[0];
    const key = `sb-${ref}-auth-token`;
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

async function fetchProfile(client: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, name, email')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[supabase] fetch profile failed', error);
    return null;
  }
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // If a Supabase session is stored locally, optimistically start as
  // "authenticated, not loading" so RealRoot renders AppLayout immediately on
  // refresh instead of flashing Landing → AppLayout. The real session object
  // arrives via onAuthStateChange and replaces this sentinel within ~200 ms.
  // If the stored token is expired/invalid, onAuthStateChange fires with
  // session=null and we fall back to the normal logged-out state.
  const supabaseConfigured =
    !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
  const hadStoredSession = supabaseConfigured && hasStoredSession();
  const [session, setSession] = useState<Session | null>(hadStoredSession ? ({} as Session) : null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!hadStoredSession);
  const [client, setClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    let initialized = false;
    let unsubscribe: () => void = () => {};

    (async () => {
      const supabase = await getSupabase();
      if (cancelled) return;
      setClient(supabase);

      const handleSession = async (s: Session | null) => {
        if (cancelled) return;
        setSession(s);
        if (s?.user.id) {
          const p = await fetchProfile(supabase, s.user.id);
          if (!cancelled) setProfile(p);
          // Hydrate local preferences from the server-side metadata blob if
          // present. If the metadata is empty (first sign-in) the local
          // state stays as-is — the next setPreference() call will push it
          // upstream via the sync registered below.
          hydrateFromUpstream(s.user.user_metadata?.preferences);
          // Attach the upstream-sync hook so subsequent setPreference() calls
          // mirror to user_metadata. Fire-and-forget; the preferences module
          // already updates local state + localStorage synchronously.
          setUpstreamSync(async (prefs: Preferences) => {
            await supabase.auth.updateUser({ data: { preferences: prefs } });
          });
        } else {
          setProfile(null);
          // Logged-out: detach the sync so preference writes don't try to
          // hit Supabase. They continue to persist to localStorage.
          setUpstreamSync(null);
        }
        if (!initialized) {
          initialized = true;
          if (!cancelled) setLoading(false);
        }
      };

      const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
        void handleSession(s);
      });
      unsubscribe = () => sub.subscription.unsubscribe();

      const { data } = await supabase.auth.getSession();
      if (cancelled || initialized) return;
      void handleSession(data.session);
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!client || !session?.user.id) return;
    const p = await fetchProfile(client, session.user.id);
    setProfile(p);
  };

  return (
    <Ctx.Provider value={{ session, profile, loading, refreshProfile }}>{children}</Ctx.Provider>
  );
}

export const useAuth = (): AuthContextValue => useContext(Ctx);
