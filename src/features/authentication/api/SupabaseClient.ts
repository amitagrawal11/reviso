import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Don't throw — the app still runs against the mock store. Just warn so
  // anyone touching `supabase` knows the client won't talk to a real backend.
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY missing — calls against this client will fail.',
  );
}

export const supabase = createClient(url ?? 'http://localhost:0', anonKey ?? 'anon', {
  auth: { persistSession: true, autoRefreshToken: true },
});
