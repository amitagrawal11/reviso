/**
 * Reviso design tokens — single source of truth shared between TS and CSS.
 *
 * The same values are mirrored as CSS custom properties in `styles.css` under
 * the `:root` block. When you change one, change both.
 *
 * Anything that needs to compute layout dimensions in JS (the viewport hook,
 * media-query checks, drag thresholds) should import from here rather than
 * hardcoding pixel literals.
 */

// 4-point spacing scale (px). Maps 1:1 to `--space-1` … `--space-8`.
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 24,
  6: 32,
  7: 48,
  8: 64,
} as const;
export type SpaceToken = keyof typeof spacing;

// Border radii (px).
export const radius = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 14,
  pill: 9999,
} as const;
export type RadiusToken = keyof typeof radius;

// Type scale (rem-based, 16px base). Use `text.body` etc. when configuring
// the Mantine theme; use the matching `--text-*` CSS var for plain CSS.
export const text = {
  display: '2.75rem', // 44
  h1: '1.875rem', // 30
  h2: '1.5rem', // 24
  h3: '1.125rem', // 18
  bodyLg: '1rem', // 16
  body: '0.9375rem', // 15
  sm: '0.8125rem', // 13
  xs: '0.75rem', // 12
  code: '0.875rem', // 14
} as const;
export type TextToken = keyof typeof text;

export const lineHeight = {
  display: 1.05,
  tight: 1.2,
  snug: 1.35,
  base: 1.55,
  relaxed: 1.7,
} as const;

// Negative for display weights, neutral for body.
export const letterSpacing = {
  display: '-0.028em',
  h1: '-0.022em',
  h2: '-0.015em',
  h3: '-0.01em',
  body: '-0.003em',
  label: '0.06em',
} as const;

// Inter variable axis. Static fonts loaded: 400 / 500 / 600 / 700.
export const fontWeight = {
  regular: 400,
  medium: 500,
  semi: 600,
  bold: 700,
} as const;

// Icon sizing per surface zone — see Phase 3 of docs/REDESIGN-PHASES.md.
//   sm: inline within text, chips, badges.
//   md: header / sidebar nav / row leading icons (the default).
//   lg: primary action, emphasized.
//   xl: empty-state / hero / feature card.
export const iconSize = {
  sm: 14,
  md: 18,
  lg: 20,
  xl: 24,
} as const;
export type IconSizeToken = keyof typeof iconSize;

export const iconStroke = 1.75;

// Layout dimensions.
export const headerHeight = {
  compact: 56,
  desktop: 60,
} as const;

export const bottomNavHeight = 56;

export const sidebarWidth = {
  medium: 260,
  expanded: 280,
} as const;

export const tocWidth = 220;

export const railWidth = 72;

// Material 3-style adaptive breakpoints. Used by `useViewport()` (Phase 5).
export const breakpoints = {
  compact: 600, // < 600px: phones
  medium: 840, // 600–839: small tablets, phone landscape
  expanded: 1200, // 840–1199: tablets, small laptops
  large: 1600, // 1200–1599: desktops; ≥1600: xlarge
} as const;
export type ViewportClass = 'compact' | 'medium' | 'expanded' | 'large' | 'xlarge';

// Font stacks.
export const fontFamily = {
  ui: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
} as const;
