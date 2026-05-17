# Reviso UX/UI Redesign — Phased Rollout

> Companion to the design preview at `design-preview/index.html` and the master plan at `~/.claude/plans/consider-yourself-as-an-cheerful-quiche.md`.

## Principles

1. **Every phase ships independently.** No phase leaves the app in a half-state. Every PR can merge to `main` and deploy.
2. **CSS-only and additive changes first.** Foundational work (tokens, fonts, icons, scrollbars) lands before any layout restructure.
3. **One concern per PR.** A reviewer can audit a single dimension (typography OR icons OR shell) without context-switching.
4. **Verification gate between phases.** A phase is "done" only after the device matrix + Lighthouse + smoke checklist pass.
5. **Reversible by `git revert`.** No phase introduces a one-way migration (schema changes, irreversible storage moves). If we revert, users see the previous UI cleanly.
6. **Parallelizable where safe.** Phases marked **∥** in the table below can run on parallel branches and merge in any order.

## Risk legend

- 🟢 **Low** — CSS-only or additive code. Can't break user data; visual diff only.
- 🟡 **Medium** — touches layout / behavior. Manual test on the device matrix before merge.
- 🔴 **Higher** — gestures, multi-component coordination, or PWA install plumbing. Requires staged rollout (feature flag or canary).

## Device matrix (every phase tests these)

| Device        | Width              | Notes                                        |
| ------------- | ------------------ | -------------------------------------------- |
| iPhone SE     | 375×667            | smallest compact                             |
| iPhone 14 Pro | 393×852            | notch + dynamic island, portrait + landscape |
| Pixel 7       | 412×915            | Android Chrome PWA install path              |
| iPad Mini     | 768×1024           | medium portrait                              |
| iPad Pro 11"  | 834×1194           | medium landscape, expanded portrait          |
| Desktop       | 1280 / 1440 / 1920 | large / xlarge                               |

## Verification toolkit

- `npm run dev` — manual smoke on each viewport via Chrome DevTools device mode.
- **Lighthouse**: target PWA ≥ 95, A11y ≥ 95, Performance ≥ 90 after each shipping phase.
- **Bundle size**: `npm run build` — landing critical chunk stays < 200 KB gz.
- **Screenshot regression** _(optional, set up in Phase 0)_: Playwright captures landing + signed-in shell, compared with `pixelmatch` against baseline.
- **Manual smoke checklist** (run after every merge):
  1. Create note → edit → save → reload → confirm persistence.
  2. Star → unstar.
  3. Move to trash → restore → hard-delete.
  4. Toggle theme; reload — theme persists.
  5. Open command palette (⌘K) → search → open result.
  6. Demo route works without auth.
  7. Real route gated by auth.

---

## Phase table (at a glance)

| #   | Phase                                   | Risk | Effort | Parallelizable  | Ships? |
| --- | --------------------------------------- | ---- | ------ | --------------- | ------ |
| 0   | Foundation: tokens, fonts, icon wrapper | 🟢   | 1 d    | —               | yes    |
| 1   | Typography (rem scale + Inter)          | 🟢   | 1–2 d  | ∥ with 2, 3     | yes    |
| 2   | Themed scrollbars                       | 🟢   | 0.5 d  | ∥               | yes    |
| 3   | Iconography swap (Tabler stroke 1.75)   | 🟢   | 1 d    | ∥               | yes    |
| 4   | Color tokens + semantic colors          | 🟢   | 1 d    | depends on 0    | yes    |
| 5   | Viewport hook + safe-area + 100dvh      | 🟡   | 1 d    | depends on 0    | yes    |
| 6   | Tap targets + focus rings + a11y pass   | 🟡   | 1 d    | depends on 3    | yes    |
| 7   | Mobile bottom nav (compact only)        | 🔴   | 2–3 d  | depends on 5    | yes    |
| 8   | Tablet nav rail (medium only)           | 🟡   | 2–3 d  | depends on 5    | yes    |
| 9   | Bottom sheets + FAB + swipe gestures    | 🔴   | 2–3 d  | depends on 7    | yes    |
| 10  | i18n architecture + string extraction   | 🟡   | 2 d    | ∥ with 7–9      | yes    |
| 11  | Settings page redesign                  | 🟢   | 2 d    | depends on 1, 3 | yes    |
| 12  | PWA manifest + install + share-target   | 🟡   | 1–2 d  | depends on 11   | yes    |
| 13  | Command palette upgrade                 | 🟢   | 2 d    | ∥               | yes    |
| 14  | Landing polish + screenshot regen       | 🟢   | 1 d    | depends on 1, 3 | yes    |

**Total**: ~22 working days. Calendar time depends on parallel branches; a single-developer serial path is ~5 weeks.

---

## Phase 0 — Foundation (no visual change)

**Goal**: lay infrastructure for everything downstream. Nothing in the UI changes.

### Changes

- `index.html`: add Inter + JetBrains Mono via Google Fonts (`<link rel="preconnect">` + `<link href="...">` with `display=swap`). Defer mode = `optional` if we want zero-blocking; `swap` is fine for v1.
- New: `src/lib/design-tokens.ts` — exports a typed object of all tokens (`spacing`, `radius`, `text`, `letterSpacing`, `lineHeight`, `iconSize`, `header`, `breakpoints`). Source of truth shared between CSS and TS.
- New: `src/components/Icon.tsx` — thin wrapper around `@tabler/icons-react`. Exports a curated set (only the icons we use) with default `stroke={1.75}` and size variants `sm | md | lg | xl`. Replaces ad-hoc `<IconX size={16} />` calls.
- Optional: `scripts/visual-regression.ts` — Playwright + pixelmatch baseline capture. Wires into `npm run regression` (manual, not CI).

### Verification

- App boots, no visible diff.
- DevTools Network: Inter + JetBrains Mono load.
- `import { spacing } from './lib/design-tokens'` works in a sample component (delete after testing).

### Rollback

- `git revert`. No state changes.

---

## Phase 1 — Typography 🟢

**Goal**: rem-based type scale + Inter, with refined letter-spacing and weights.

### Changes

- `src/main.tsx`: extend Mantine `createTheme` with `fontSizes`, `lineHeights`, `headings`, `fontFamily: var(--font-ui)`, `fontFamilyMonospace: var(--font-mono)`.
- `src/styles.css`:
  - Define `--text-*`, `--lh-*`, `--ls-*`, `--fw-*` tokens (mirror of `design-tokens.ts`).
  - Replace heading rules under `.markdown` to use tokens + new H2 hairline underline + H3 anchor-on-hover pattern (from §3.3 of master plan).
  - Replace all `font-size: NN px` with rem-based equivalents.
  - Enable Inter feature settings: `font-feature-settings: 'cv11', 'ss01', 'ss03', 'cv02';`.

### Verification

- Lighthouse a11y score not lower than before.
- Manual diff: H1/H2/H3 in `NoteView` match the design-preview mockup.
- Confirm OS text-size scaling now affects UI (macOS: System Settings → Display → Larger Text; iOS: Settings → Display & Brightness → Text Size).
- Bundle: font network cost ≤ 60 KB gz (Inter Latin subset).

### Rollback

- `git revert`. All changes are in styles.css + main.tsx.

---

## Phase 2 — Themed scrollbars 🟢 ∥

**Goal**: replace default OS scrollbars with quiet, themed, thin variants.

### Changes

- `src/styles.css`: add the `*::-webkit-scrollbar` block + Firefox `scrollbar-color`/`scrollbar-width` from `design-preview/tokens.css`.
- Define `--scrollbar-thumb`, `--scrollbar-thumb-hover` per theme.

### Verification

- Scroll inside sidebar, main pane, code blocks, palette list. Thumb appears on hover, fades on idle. Firefox renders thin.
- No layout shift (10px width matches OS scrollbar gutter on macOS).

### Rollback

- `git revert`. Browser scrollbar reverts to default.

---

## Phase 3 — Iconography 🟢 ∥

**Goal**: every icon goes through `<Icon name="..." />`, stroke 1.75, consistent size per surface zone.

### Changes

- Migrate every `<IconXxx />` import to `<Icon name="xxx" />`.
- Establish size policy:
  - Header / sidebar nav / row leading icons: `md` (18px).
  - Inline-in-text, chips: `sm` (14px).
  - Editor toolbar: `md` but with 16px override.
  - Empty state / hero: `xl` (40px+).
- Files touched: `Shell.tsx`, `Sidebar.tsx`, `dialogs.tsx`, `NoteEdit.tsx`, `NoteView.tsx`, `Landing.tsx`, `LandingDemoFrame.tsx`, `EditorWithLineNumbers.tsx`, `TocSidebar.tsx`, `DemoBanner.tsx`.

### Verification

- Every icon renders. Click-through on every icon-only button works.
- Bundle size: tree-shaking should keep us flat (Tabler ships ~3500 icons; we import maybe ~40).
- Visual diff: stroke is visibly lighter, more elegant.

### Rollback

- `git revert`. Icons swap back.

---

## Phase 4 — Color tokens + semantic colors 🟢

**Goal**: replace single-accent overload with separate tokens for accent, success, warning, danger, info, focus-ring.

### Changes

- `src/styles.css`: define `--color-*` semantic tokens per §2 of the master plan. Update dark and light blocks.
- Find every hardcoded hex in component files; replace with `var(--color-*)`.
- `notifications.show({color: 'green'})` → keep Mantine semantic names; ensure Mantine color theme maps to our tokens.
- Focus rings: `:focus-visible` rule uses `--color-focus-ring`, not `--color-accent`.

### Verification

- Run WCAG contrast checker on every text/bg pair; record results in `docs/COLOR-CONTRAST.md` (new file).
- Tab through the app — focus ring is visibly distinct from selected/hover state.
- Demo banner amber bumped to the warning token; verify contrast against the banner background.

### Rollback

- `git revert`.

---

## Phase 5 — Viewport hook + safe-area + 100dvh 🟡

**Goal**: PWA-correct layout math on notched iPhones, landscape, and iOS Safari URL bar collapse.

### Changes

- New: `src/lib/use-viewport.ts` — returns `{ class, isTouch, isStandalone }` where `class` ∈ `compact | medium | expanded | large | xlarge`. Single `matchMedia` subscription, debounced, SSR-safe (no `window` access until effect).
- `index.html`: viewport meta becomes `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
- `Shell.tsx`: header gets `padding-top: env(safe-area-inset-top)`.
- `DemoBanner.tsx`: gets `padding-top: env(safe-area-inset-top)` (additive).
- `NoteEdit.tsx`: `height: calc(100vh - 60px)` → `height: calc(100dvh - var(--header-h))`. Test on iOS Safari and landscape.
- Existing `useMediaQuery('(max-width: 48em)')` calls get replaced incrementally — first call site can adopt `useViewport()` without forcing all of them.

### Verification

- Install as PWA on iPhone 14 Pro, open landscape — header doesn't sit under the notch.
- iOS Safari: scroll content, URL bar collapses, editor height fills cleanly.
- Android Chrome PWA: nothing regresses.
- Existing `useMediaQuery` consumers still work (we haven't removed them, just augmented).

### Rollback

- `git revert`. The old `calc(100vh - 60px)` returns; iOS landscape issue returns but no new bugs.

---

## Phase 6 — Tap targets + focus rings + a11y pass 🟡

**Goal**: hit WCAG 2.5.5 (44×44 hit area) and 2.4.7 (visible focus) on every interactive element.

### Changes

- `Sidebar.tsx`:
  - Row min-height bumped 28 → 40px on touch (`useViewport().isTouch`).
  - Row menu trigger (`IconDots`) wrapped in a 32×32 ActionIcon on hover-capable, 44×44 on touch.
  - Profile avatar bumped from `size="md"` (32) → `size="lg"` (44) on touch.
- All icon-only `ActionIcon` get an `aria-label` derived from a planned i18n string (interim: English literal).
- Add skip-to-content `<a href="#main">` in `Shell.tsx`, visible on focus only.
- Add `@media (prefers-reduced-motion: reduce)` block disabling transitions site-wide.

### Verification

- Use axe DevTools on every page — 0 critical issues.
- Tab through every screen — focus ring visible on every focusable element, never invisible.
- VoiceOver / TalkBack smoke: navigate sidebar by swiping.
- Compare sidebar row visual density before/after — should feel slightly more breathable, not unbalanced.

### Rollback

- `git revert`.

---

## Phase 7 — Mobile bottom nav (compact only) 🔴

**Goal**: add bottom navigation as primary nav on phones; profile relocates to header avatar on compact.

### Changes

- New: `src/components/BottomNav.tsx` — four items (Home / Starred / Search / More).
- `Shell.tsx`: conditional render `<BottomNav />` when `viewport.class === 'compact'`; AppShell `footer.height` set accordingly; `padding-bottom: env(safe-area-inset-bottom)`.
- Profile menu on compact: moves out of `Sidebar.tsx` footer; new `<HeaderProfileMenu />` in `Shell.tsx` (header right).
- Search trigger on compact: icon-only, opens command palette (no inline field).
- "More" tab opens the drawer sidebar (existing `Sidebar.tsx` rendered as `<Drawer position="left">` on compact).
- `NoteEdit.tsx`: status indicator + Save button move to a sticky bottom save bar on compact (above BottomNav).

### Feature flag

Add `useViewport().class === 'compact'` gate. If we need to roll back without reverting, we can override the hook to return `expanded` and the new components stop rendering.

### Verification

- iPhone SE 375px — BottomNav fits, labels don't truncate.
- Drawer opens/closes; outside-tap dismisses.
- Profile menu in header → sign-out / settings still reachable.
- Bottom-area safe-area inset fills correctly on iPhone 14 Pro PWA.
- Regression: desktop and tablet untouched.

### Rollback

- `git revert`, or feature-flag override in `use-viewport.ts` to bypass compact.

---

## Phase 8 — Tablet nav rail (medium only) 🟡

**Goal**: 72px rail replaces cramped sidebar on iPad portrait.

### Changes

- New: `src/components/NavRail.tsx` — vertical icon stack with labels.
- `Shell.tsx`: render `<NavRail />` when `viewport.class === 'medium'`.
- New: `<NotesOverlay />` — slides over content when the rail's "Notes" icon is tapped; uses existing `Sidebar.tsx` folder-tree content.
- `TocSidebar.tsx`: at medium / expanded, render as right-side overlay sheet triggered by floating `ⓘ` button instead of always-on column.

### Verification

- iPad Mini portrait — rail visible, content readable, no horizontal scroll.
- Notes overlay opens on rail tap, closes on outside-tap / ESC.
- TOC accessible from `ⓘ` button at content top-right.
- Desktop (≥1200px): rail does NOT render; original sidebar + TOC layout intact.

### Rollback

- `git revert` (BottomNav phase remains untouched).

---

## Phase 9 — Bottom sheets + FAB + swipe 🔴

**Goal**: touch-native interaction patterns replacing hover-only affordances.

### Changes

- New: `src/components/BottomSheet.tsx` — thin wrapper around Mantine `Drawer position="bottom"` with grabber, focus trap, and `radius="lg"` top corners.
- New: `src/components/QuickCaptureFab.tsx` — 56×56 FAB visible only on `compact`. Tap opens BottomSheet with title input + collection picker.
- `Sidebar.tsx`: row long-press (touch) or `…` menu opens a BottomSheet on compact instead of a Mantine `Menu`.
- Destructive confirms (`modals.openConfirmModal`): wrap with viewport check — render as BottomSheet on compact, modal on others.
- Swipe gestures on note rows: right = star toggle, left = trash with undo toast. Implement via `pointermove` on existing dnd-kit row container; threshold 80px; never triggers while dragging.

### Risk mitigations

- Swipe vs. scroll vs. drag conflict: reuse the 250ms `TouchSensor` activation delay from dnd-kit; swipe handler short-circuits if `dndStarted === true`.
- Add a Settings toggle: "Swipe gestures on rows" (default on, on a kill switch if reports come in).

### Verification

- Long-press a row on iPhone — sheet opens; pages don't scroll behind it.
- Swipe right → star toggles + haptic; swipe left → trash + toast w/ Undo.
- Drag a row to a folder — swipe doesn't activate.
- Bottom sheet dismisses via grabber swipe-down, outside-tap, ESC, back gesture.
- Modals on desktop unchanged.

### Rollback

- `git revert`.

---

## Phase 10 — i18n architecture + string extraction 🟡 ∥

**Goal**: every user-facing string passes through `t(key)`.

### Changes

- Add `react-i18next` + `i18next` to deps.
- New: `src/lib/i18n.ts` — init with `react.useSuspense: false`, `fallbackLng: 'en'`, `defaultNS: 'common'`. Lazy locale chunks (`/locales/{lng}/common.json` loaded via dynamic import).
- New: `src/locales/en/common.json` — single namespace v1.
- Touch every `Shell.tsx`, `Sidebar.tsx`, `dialogs.tsx`, `NoteEdit.tsx`, `NoteView.tsx`, `Landing.tsx`, `pages/Profile.tsx`, etc. — replace literals with `t('group.key')`.
- Date / number formatting → `Intl.DateTimeFormat` keyed off `i18n.language`. Replaces hardcoded `5/17/26` in note metadata.
- Settings: language picker (English only; other locales listed as "coming soon").

### Verification

- Grep `src/**/*.tsx` for `>[A-Z][^<]+<` (rough heuristic for hardcoded English) — manually triage hits.
- Bundle: critical landing chunk grows by < 8 KB gz (i18next core + react bindings).
- App renders identically with `lng=en`.
- Dev hack: switch `lng=cimode` (debug) — every string is replaced with its key, no English visible. Validates coverage.

### Rollback

- `git revert`. All strings revert to literals.

---

## Phase 11 — Settings page redesign 🟢

**Goal**: full settings page per §15.16 of the master plan.

### Changes

- `src/pages/Settings.tsx`: rebuild as scrollable form with sections (Appearance, Language, Editor, App).
- Density toggle: writes `data-density` attribute on `<html>`; CSS reads it to switch row heights (Cozy = 40px, Compact = 32px).
- Text-size slider: writes `--text-scale` CSS var on `<html>`; UI tokens multiply by it.
- Install button: integrated with `beforeinstallprompt` from Phase 12; placeholder until then.
- Storage used: counts `localStorage` size (mock repo) or runs a `SELECT count(*) FROM notes` (supabase repo) via existing repo abstraction.

### Verification

- Toggle each setting → persists across reload.
- Density change instantly updates sidebar row height.
- Text-size slider visibly scales UI but not markdown content.

### Rollback

- `git revert`. Old (sparse) Settings page returns.

---

## Phase 12 — PWA enhancements 🟡

**Goal**: production-quality PWA — installable, shareable target, with shortcuts.

### Changes

- `vite.config.ts` manifest: add `shortcuts`, `share_target`, `screenshots`, `maskable` icons, `display_override`, `description`, `categories`.
- New icon assets: `public/icons/maskable-192.png`, `maskable-512.png` (designed with 80% safe zone). Designer task: ensure the wordmark "R" stays inside the safe zone.
- New: `src/components/InstallPrompt.tsx` — listens for `beforeinstallprompt`, surfaces a chip in the header on first eligible session (dismissible, remembered in `localStorage`).
- New: `src/components/OfflineIndicator.tsx` — small chip in header when `navigator.onLine === false`.
- New: route `/share-target` (or a tiny handler in `App.tsx`) — accepts `POST` with `title`, `text`, `url`; creates a note from the payload. If unauthenticated, stash in `sessionStorage` and redirect to login.
- Update `index.html`: theme-color uses `media` queries to switch between light/dark.
- Pre-paint script also updates `<meta theme-color>` when scheme changes.

### Verification

- **Lighthouse PWA score ≥ 95** on production build.
- Install on Android Chrome — appears in app drawer; manifest shortcuts visible on long-press.
- Install on iOS Safari — A2HS works; PWA opens fullscreen with safe-area respected.
- Install on desktop Chrome — installs as standalone window.
- From Android share sheet (any text-share app), pick Reviso → lands on a "New note" pre-filled with the shared text.
- Offline indicator shows on `navigator.onLine === false` simulation.

### Rollback

- Revert manifest changes in `vite.config.ts`. Existing manifest is still valid; uninstall/reinstall by users to pick up the older manifest.

### Caveat

- **Manifest changes propagate slowly** — browsers cache manifests for ~24h. If we ship a broken manifest, users see the broken one until cache expires. Mitigation: verify in Lighthouse Production Profile before merging.

---

## Phase 13 — Command palette upgrade 🟢 ∥

**Goal**: Linear-style ⌘K with grouped sections (Actions / Recent / Collections).

### Changes

- `SpotlightSearch.tsx`: extend existing `@mantine/spotlight` config with action items (`New note`, `Toggle theme`, `Star this`) sourced from a registry.
- New: `src/lib/command-registry.ts` — components register actions; spotlight reads from registry.
- Keyboard hints (⌘N, ⌘D, ⌘J) rendered in items.

### Verification

- ⌘K opens; arrow keys navigate; Enter executes.
- All existing search behavior (notes, collections) preserved.
- New actions appear at the top; recents below.

### Rollback

- `git revert`. The current SpotlightSearch returns.

---

## Phase 14 — Landing polish + screenshot regen 🟢

**Goal**: refresh landing visuals to match the new system.

### Changes

- `src/pages/Landing.tsx`: hero typography migrates to `--text-display`; feature grid uses new `feature-icon` tile pattern; install CTA chip when eligible.
- `npm run screenshots`: regenerate `public/landing/screenshot-{light,dark}-{800,1200,1600,2400}.{webp,png}` with the new design.
- Update `index.html` LCP preload `imagesrcset` only if widths change (they shouldn't).

### Verification

- **LCP unchanged or better** on a throttled "Slow 4G" Lighthouse run. Target < 1.0s on /, < 2.5s on /demo.
- Visual review against `design-preview/index.html` Landing mockup.
- New screenshots committed to `public/landing/`.

### Rollback

- `git revert`.

---

## Sign-off criteria (every phase)

A phase is **ready to merge** when ALL of these are green:

- [ ] Manual smoke checklist passes (see top of doc).
- [ ] Device matrix tested for the phase's relevant viewports.
- [ ] Lighthouse PWA / A11y / Performance scores not regressed.
- [ ] Bundle-size budget met (`npm run build` chunks reported in PR description).
- [ ] No new TypeScript or ESLint errors.
- [ ] All `useMediaQuery` / `useViewport` consumers tested at the boundary widths.
- [ ] Optional: visual-regression diff reviewed (Phase 0+).
- [ ] Reviewer has the design-preview gallery open for visual cross-reference.

A phase is **ready to deploy** when:

- [ ] Merged to `main`.
- [ ] Smoke-tested on staging/preview deploy.
- [ ] No PWA-cached-manifest blocking issues (Phase 12 only).

---

## Open questions before kickoff

1. **Branching strategy** — one long-lived `redesign/v2` branch with phase PRs into it, or each phase straight to `main` behind feature gates? _Recommend: straight to `main`. Phases are small and shippable; long-lived branches drift._
2. **Feature flags** — do we want a real flag system (e.g. GrowthBook, LaunchDarkly), or is `useViewport()`-class-based gating sufficient? _Recommend: viewport gates only — most phases are CSS or compact-only, naturally gated._
3. **Visual regression** — set up Phase 0 (Playwright + pixelmatch), or skip and rely on manual review? _Recommend: set up; cheap insurance against later phases._
4. **Inter via Google Fonts or self-host?** Self-host saves DNS + privacy. _Recommend: self-host the woff2 in `public/fonts/`; Google's terms are fine but self-hosting is faster._
5. **Maskable icon design** — do we have a logo asset that survives the 80% safe zone? If not, add a pre-Phase-12 design task.
