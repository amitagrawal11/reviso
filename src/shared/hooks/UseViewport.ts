/**
 * useViewport — adaptive layout primitive.
 *
 * Returns the current viewport class (Material 3-style adaptive breakpoints),
 * whether the user is on a touch device, and whether the app is running as
 * an installed PWA. Replaces scattered `useMediaQuery('(max-width: 48em)')`
 * call sites that don't capture tablet / landscape / install-state nuance.
 *
 * Breakpoints come from `design-tokens.ts`; mutations there propagate here
 * automatically.
 *
 * SSR-safe: returns sensible defaults when `window` is undefined.
 */

import { useSyncExternalStore } from 'react';
import { breakpoints, type ViewportClass } from '@/shared/lib/DesignTokens';

export interface Viewport {
  /** Material 3-style adaptive class. */
  class: ViewportClass;
  /** Width in CSS pixels (for fine-grained queries when class isn't enough). */
  width: number;
  /** True on touch-primary devices (no hover, coarse pointer). */
  isTouch: boolean;
  /** True when the app is launched from a home-screen / standalone PWA install. */
  isStandalone: boolean;
  /** True when device is in landscape. */
  isLandscape: boolean;
}

function classifyWidth(w: number): ViewportClass {
  if (w < breakpoints.compact) return 'compact';
  if (w < breakpoints.medium) return 'medium';
  if (w < breakpoints.expanded) return 'expanded';
  if (w < breakpoints.large) return 'large';
  return 'xlarge';
}

const SSR_VIEWPORT: Viewport = {
  class: 'expanded',
  width: breakpoints.expanded,
  isTouch: false,
  isStandalone: false,
  isLandscape: true,
};

function readViewport(): Viewport {
  if (typeof window === 'undefined') return SSR_VIEWPORT;
  const w = window.innerWidth;
  const isTouch =
    window.matchMedia('(hover: none) and (pointer: coarse)').matches || 'ontouchstart' in window;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari pre-iOS17 doesn't honor display-mode media query in PWAs.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return {
    class: classifyWidth(w),
    width: w,
    isTouch,
    isStandalone,
    isLandscape: w > window.innerHeight,
  };
}

// Cache the snapshot between subscribe events so React's referential-equality
// check in useSyncExternalStore short-circuits when nothing changed.
let cached: Viewport = readViewport();
let pending = false;

function subscribe(notify: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => {
    // Coalesce resize storms into a single rAF tick.
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      const next = readViewport();
      // Only notify if a tracked field actually changed.
      if (
        next.class !== cached.class ||
        next.width !== cached.width ||
        next.isTouch !== cached.isTouch ||
        next.isStandalone !== cached.isStandalone ||
        next.isLandscape !== cached.isLandscape
      ) {
        cached = next;
        notify();
      }
    });
  };
  window.addEventListener('resize', handler, { passive: true });
  window.addEventListener('orientationchange', handler, { passive: true });
  // display-mode can flip when user installs / launches as PWA.
  const standaloneMq = window.matchMedia('(display-mode: standalone)');
  standaloneMq.addEventListener?.('change', handler);
  return () => {
    window.removeEventListener('resize', handler);
    window.removeEventListener('orientationchange', handler);
    standaloneMq.removeEventListener?.('change', handler);
  };
}

const getSnapshot = () => cached;
const getServerSnapshot = () => SSR_VIEWPORT;

export function useViewport(): Viewport {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
