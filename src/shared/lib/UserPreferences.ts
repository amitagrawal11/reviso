/**
 * preferences — single source of truth for per-user UI prefs.
 *
 * Layers:
 *   1. localStorage (per device, available before auth resolves).
 *   2. Supabase auth.user_metadata.preferences (synced across devices for
 *      signed-in users). Loaded into local state once auth resolves; writes
 *      go to both layers.
 *
 * The store is a useSyncExternalStore-backed external store so all
 * subscribers re-render on change. CSS-driven prefs (density, textScale)
 * also write to <html> so styling responds without React updates.
 *
 * Pre-paint bootstrap: `applyDomPrefs(load())` runs in main.tsx before the
 * first React render so density + text scale + line numbers + spellcheck
 * don't flash defaults.
 */

import { useSyncExternalStore } from 'react';

export type Density = 'cozy' | 'compact';
export type DefaultView = 'edit' | 'split' | 'preview';

export interface Preferences {
  density: Density;
  /** UI text scale percent; 100 = default 16px root. Applied as
   *  --text-scale CSS variable; root font-size = 16 * scale / 100. */
  textScale: number;
  lineNumbers: boolean;
  spellcheck: boolean;
  defaultView: DefaultView;
}

export const DEFAULT_PREFERENCES: Preferences = {
  density: 'cozy',
  textScale: 100,
  lineNumbers: true,
  spellcheck: true,
  defaultView: 'split',
};

const STORAGE_KEY = 'notes-preferences-v1';

const isDensity = (v: unknown): v is Density => v === 'cozy' || v === 'compact';
const isView = (v: unknown): v is DefaultView => v === 'edit' || v === 'split' || v === 'preview';

/** Coerce a partial / untrusted object into a valid Preferences, falling
 *  back to defaults for any malformed field. Used both on load and when
 *  Supabase hands back user_metadata that may be empty or malformed. */
function coerce(raw: unknown): Preferences {
  const d = DEFAULT_PREFERENCES;
  if (!raw || typeof raw !== 'object') return { ...d };
  const r = raw as Record<string, unknown>;
  const ts = typeof r.textScale === 'number' ? r.textScale : Number(r.textScale);
  return {
    density: isDensity(r.density) ? r.density : d.density,
    textScale: Number.isFinite(ts) && ts >= 85 && ts <= 130 ? ts : d.textScale,
    lineNumbers: typeof r.lineNumbers === 'boolean' ? r.lineNumbers : d.lineNumbers,
    spellcheck: typeof r.spellcheck === 'boolean' ? r.spellcheck : d.spellcheck,
    defaultView: isView(r.defaultView) ? r.defaultView : d.defaultView,
  };
}

/** Read from localStorage. Falls back to defaults on any failure. */
export function load(): Preferences {
  if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return coerce(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function persistLocal(prefs: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / private-mode errors
  }
}

/** Apply CSS-driven prefs to <html> so styling responds without React. */
export function applyDomPrefs(prefs: Preferences) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-density', prefs.density);
  root.style.setProperty('--text-scale', String(prefs.textScale / 100));
}

// ── External store ────────────────────────────────────────────────────────
let state: Preferences = load();
applyDomPrefs(state);

const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
const getSnapshot = () => state;
const getServerSnapshot = () => DEFAULT_PREFERENCES;

/** Read the current preferences as a React-subscribed value. */
export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Imperative read (e.g. inside event handlers, non-React code paths). */
export function getPreferences(): Preferences {
  return state;
}

// ── Mutations ─────────────────────────────────────────────────────────────
// Supabase sync is opt-in: setUpstreamSync is wired from AuthProvider once
// the session resolves. When the user signs out, the caller passes null to
// detach. Sync writes are fire-and-forget (we don't await them) — the local
// state and localStorage update synchronously so the UI feels instant; the
// network write resolves in the background.
type UpstreamSync = (prefs: Preferences) => void | Promise<void>;
let upstreamSync: UpstreamSync | null = null;

export function setUpstreamSync(sync: UpstreamSync | null) {
  upstreamSync = sync;
}

/** Hydrate from a fresh Supabase user_metadata.preferences blob. Used by
 *  AuthProvider on session change so a user who set prefs on device A gets
 *  them on device B without re-doing the choices. */
export function hydrateFromUpstream(raw: unknown) {
  const next = coerce(raw);
  if (shallowEqual(state, next)) return;
  state = next;
  persistLocal(state);
  applyDomPrefs(state);
  emit();
}

/** Update one or more preference fields. Persists locally + emits to
 *  subscribers immediately; fires the Supabase sync in the background
 *  (if attached). */
export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  if (state[key] === value) return;
  const next = { ...state, [key]: value };
  state = next;
  persistLocal(state);
  applyDomPrefs(state);
  emit();
  if (upstreamSync) {
    try {
      void Promise.resolve(upstreamSync(state)).catch(() => {
        // Sync failures are non-fatal — local pref persists; will sync on
        // next change. We don't surface a toast because most failures are
        // transient (offline) and the user shouldn't see noise.
      });
    } catch {
      // ignore synchronous throws from the sync impl
    }
  }
}

function shallowEqual(a: Preferences, b: Preferences) {
  return (
    a.density === b.density &&
    a.textScale === b.textScale &&
    a.lineNumbers === b.lineNumbers &&
    a.spellcheck === b.spellcheck &&
    a.defaultView === b.defaultView
  );
}
