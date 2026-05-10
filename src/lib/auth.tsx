import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

// NOTE: we do NOT static-import './supabase' here. The supabase-js bundle is
// large (~100 KB gz) and pulls in @supabase/postgrest-js, gotrue-js, etc. By
// dynamic-importing it from inside an effect, the landing page renders without
// blocking on auth network code; supabase loads in the background, then this
// provider fills in the session.

export type Profile = {
  id: string;
  name: string;
  email: string | null;
};

type AuthCtx = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
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
    supabasePromise = import('./supabase').then((m) => m.supabase);
  }
  return supabasePromise;
}

async function fetchProfile(client: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await client
    .from('profiles')
    .select('id, name, email')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error('[supabase] fetch profile failed', error);
    return null;
  }
  return data as Profile | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
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
        } else {
          setProfile(null);
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

export const useAuth = () => useContext(Ctx);
