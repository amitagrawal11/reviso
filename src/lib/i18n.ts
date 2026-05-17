/**
 * i18next setup — single global instance, English bundled, future locales lazy.
 *
 * `useSuspense: false` so the landing chunk doesn't block on translation
 * loading. English is bundled directly (cheap, ~2 KB gz); future locales
 * will load via dynamic import.
 *
 * Locale persisted under `notes-locale`. First-visit detection reads
 * `navigator.language`.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enCommon from '../locales/en/common.json';

const LOCALE_KEY = 'notes-locale';

function detectInitialLocale(): string {
  if (typeof window === 'undefined') return 'en';
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (stored) return stored;
  } catch {
    // localStorage may be unavailable (private mode, embedded contexts) —
    // fall through to navigator detection.
  }
  const nav = navigator.language?.toLowerCase() ?? 'en';
  // Match major language (e.g. 'en-US' → 'en') against locales we ship.
  const major = nav.split('-')[0];
  return major === 'en' ? 'en' : 'en'; // only en for v1
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon },
  },
  lng: detectInitialLocale(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: ['common'],
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    // Avoid Suspense around translations so the landing chunk isn't blocked.
    useSuspense: false,
  },
  // Verbose debug only when the URL flag is set — useful for QA.
  debug: typeof window !== 'undefined' && window.location.search.includes('i18nDebug=1'),
});

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(LOCALE_KEY, lng);
  } catch {
    // Best-effort persistence; silent failure is fine.
  }
});

export default i18n;
