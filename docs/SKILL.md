---
name: notes-app
description: Conventions, architecture cheats, and gotchas for the markdown notes PWA at this repo.
---

# Notes App — SKILL

## When to use

Triggers: paths under `/Users/amitagrawal/Documents/PersonalProjects/NotesApp` or any of: `src/App.tsx`, `src/components/Shell.tsx`, `Sidebar.tsx`, `TocSidebar.tsx`, `LazyMarkdown.tsx`, `CodeBlock.tsx`, `MermaidBlock.tsx`, `LandingDemoFrame.tsx`, `DemoBanner.tsx`, `EditorWithLineNumbers.tsx`, `dialogs.tsx`, `lib/data-mode.tsx`, `lib/auth.tsx`, `lib/notes.ts`, `store/mock-repo.ts`, `pages/Landing.tsx`, `pages/NoteEdit.tsx`, `pages/Profile.tsx`, `vite.config.ts`, `index.html`, `styles.css`, `scripts/screenshot-landing.ts`. Anything mentioning "markdown notes PWA", "data mode", "demo tree", "supabase repo", "spotlight ⌘K", "read mode", "TOC scroll-spy", "dnd-kit sidebar", "mermaid block", "boot splash", "LCP preload", "landing page", `nohighlight`, or `notes-color-scheme`.

## Stack

React 19 + TS + Vite 6 + Mantine v7 + react-router-dom v7. Markdown via `@uiw/react-md-editor/nohighlight` + `remark-gfm` + `remark-breaks` + `rehype-slug/autolink-headings/highlight`. Mermaid + dnd-kit + vite-plugin-pwa. Auth + sync via Supabase (`@supabase/supabase-js`, lazy-imported). State is a swappable `Repo` interface implemented by either `mockRepo` (localStorage) or `supabaseRepo` (Postgres + RLS + realtime). Screenshot pipeline: Playwright + Sharp generating responsive WebP variants.

## Two trees: real vs demo

The router serves two parallel sub-trees under `App.tsx`:

- **Real tree** at `/`, `/n/:id`, `/c/:id`, `/recent`, `/starred`, `/trash`, `/profile`, `/settings`. Gated by `RealRoot`: shows `Landing` to logged-out guests on `/`, `Shell` to logged-in users, redirects `Navigate to="/"` for any other path. `DataModeProvider mode="real"` wraps the Shell — repo is `supabaseRepo` if `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set, else `mockRepo`.
- **Demo tree** at `/demo`, `/demo/n/:id`, etc. Public — no auth required. `DataModeProvider mode="demo"` always wraps Shell with `mockRepo`. `DemoBanner` renders a non-dismissable amber strip + "Sign up" CTA above the AppShell.

`useModePath()` from `lib/data-mode.tsx` is the canonical way to build links — it auto-prefixes `/demo` when called inside the demo tree. Never hardcode `/n/:id` or `/c/:id` in shared components.

## File map (current)

- Bootstrap: `src/main.tsx` (Mantine + Modals + Notifications + AuthProvider + Router) → `src/App.tsx` (route table + `RealRoot` + `DataModeProvider`).
- Shell + chrome: `src/components/Shell.tsx`. Reads `useDataMode()` to know whether to render the demo banner.
- Sidebar tree + DnD + row menus + account footer: `src/components/Sidebar.tsx`.
- Right TOC: `src/components/TocSidebar.tsx` (lazy-imported by `NoteView`).
- Markdown wrappers + prefetch: `src/components/LazyMarkdown.tsx`.
- Code/mermaid renderers: `src/components/CodeBlock.tsx`, `MermaidBlock.tsx`.
- Editor with line numbers + mobile toggle: `src/components/EditorWithLineNumbers.tsx`.
- Demo banner: `src/components/DemoBanner.tsx` (`export const DEMO_BANNER_HEIGHT = 44`).
- 404 fallback: `src/components/NotFoundCard.tsx` — used by every page when an `:id` doesn't resolve.
- Landing page: `src/pages/Landing.tsx` + `src/components/LandingDemoFrame.tsx` (LCP image with WebP srcset).
- Modals: `src/components/dialogs.tsx`, lazy shims `dialogs-lazy.ts`.
- Spotlight + ⌘K bridge: `src/components/SpotlightSearch.tsx` (lazy), `src/lib/spotlight-bridge.ts`.
- Repo abstraction: `src/lib/repo.ts` (interface), `src/store/mock-repo.ts` (localStorage impl), `src/lib/notes.ts` (Supabase impl).
- Data-mode context + lazy supabase repo loader: `src/lib/data-mode.tsx`.
- Auth + lazy supabase client: `src/lib/auth.tsx`. Profiles helper: `src/lib/profile.ts`. Supabase client: `src/lib/supabase.ts`.
- Theming: `src/styles.css` (token overrides + boot-splash + demo-banner CSS), `src/lib/inject-styles.ts`, `src/lib/hljs-theme.tsx`.
- Pre-paint color-scheme + LCP preload + boot splash: `index.html`.
- Vite + PWA + Workbox config: `vite.config.ts`.
- Supabase schema (notes + profiles + RLS + handle_new_user trigger): `supabase/schema.sql`.
- Screenshot pipeline (Playwright + Sharp → 4 WebP widths × 2 themes): `scripts/screenshot-landing.ts`.

## Conventions

- **Mantine v7 styling.** Token overrides live in `src/styles.css` under `[data-mantine-color-scheme='dark']` and `[data-mantine-color-scheme='light']`. Reassign Mantine CSS vars (`--mantine-color-*`) — don't introduce per-component styles unless necessary.
- **Color scheme** is persisted under localStorage key `notes-color-scheme`. Mantine reads it via `localStorageColorSchemeManager` in `main.tsx`; the inline pre-paint script in `index.html` reads the same key AND writes a preload `<link>` for the LCP screenshot.
- **State.** Read items with `useItems()` from `src/lib/data-mode.tsx`. Mutate via `useRepo()` then `repo.create/update/trash/restore/hardDelete`. Never call `mockRepo` or `supabaseRepo` directly from a component.
- **Items shape** (`src/mock/data.ts`). `Item.parentId: string | null` — `null` means top-level. Folders and notes are the same shape; `isFolder` distinguishes. Children are computed by filter, not stored.
- **Routing inside Shell.** Always build paths via `useModePath()` so demo and real trees both work. `<Link to={path('/n/' + id)}>`, `nav(path('/n/' + id + '/edit'))`.
- **Lazy-load patterns.**
  - Every page is lazy in `App.tsx` (including `Home` and `Landing`).
  - Shell is lazy — it pulls in DnD-kit, dialogs, sidebar tree. Landing route never loads it.
  - Supabase client is lazy-imported inside `auth.tsx` (`getSupabase()`).
  - `supabaseRepo` (`./notes`) is lazy-imported inside `data-mode.tsx` (`getRealRepo()`).
  - Markdown via `LazyMarkdownView` / `LazyMarkdownEditor`. Call `prefetchMarkdown()` on hover of any link routing to a note.
  - Dialogs via `dialogs-lazy.ts`. Call `prefetchDialogs` on hover. Never import `dialogs.tsx` directly from non-modal code.
  - Spotlight via `requestSpotlight()` from `spotlight-bridge.ts`. Do NOT import `@mantine/spotlight` outside `SpotlightSearch.tsx`.
  - Mermaid loads itself on first `MermaidBlock` render.
  - TocSidebar is lazy from inside `NoteView.tsx`.
- **CSS injection.** `src/lib/inject-styles.ts` inlines `styles.css` via Vite's `?inline` import. Mantine's own CSS stays as normal `<link>`s.
- **Boot splash.** `index.html` has an inline `.boot-splash` block inside `#root` (SVG logo + animated bar) that paints during HTML parse and is replaced when React mounts. Theme-aware via `[data-mantine-color-scheme]`. Don't replace `#root` from a build step — `ReactDOM.createRoot()` does the swap.
- **LCP preload.** The inline script in `index.html` injects `<link rel="preload" as="image" imagesrcset="..." imagesizes="..." type="image/webp" fetchpriority="high">` for the landing screenshot — only on `/`. The runtime `<picture>` in `LandingDemoFrame.tsx` mirrors the same srcset so the preload matches the candidate the browser actually picks.
- **Hotkeys.** `useHotkeys` in `Shell.tsx`: `mod+\\` toggles sidebar, `mod+.` toggles read mode. ⌘K is a manual `keydown` listener that calls `requestSpotlight()`.
- **Outlet context.** `Shell.tsx` passes `{ readMode, tocOpen, setTocOpen }` via `<Outlet context={...}>`. Pages read it with `useOutletContext`.
- **Notifications.** Use `notifications.show({ message, color })` (`bottom-center`). Errors from supabase mutations are surfaced via `notifyError(action, error)` in `lib/notes.ts`.
- **404 / id-not-found.** When a route param doesn't resolve, render `<NotFoundCard label="…" />` instead of throwing or showing a blank screen.

## Common tasks → recipe

### Add a new page (visible on both real + demo trees)

1. Create `src/pages/Foo.tsx`. Read items via `useItems()`; build links/nav via `useModePath()`.
2. In `src/App.tsx`, add `const Foo = lazy(() => import('./pages/Foo'))` and mirror `<Route path="foo" element={...}/>` inside BOTH the `/demo` route block and the `/` route block.
3. If the page should be real-only (auth-gated, like Profile/Settings), add it only under `/`.
4. If you want a sidebar nav row, add a `<NavRow to={path('/foo')} .../>` block in `src/components/Sidebar.tsx`.

### Add a new sidebar action (top-right "+ ..." button)

1. In `src/components/Sidebar.tsx`'s top `<Group>`, add another `ActionIcon`.
2. Hook it to a handler that calls something from `dialogs-lazy.ts` (or write a new dialog in `dialogs.tsx` and add a lazy shim).
3. Add `onMouseEnter={prefetchDialogs}` on the trigger.

### Add a per-row context-menu action

1. In `Sidebar.tsx`, edit the `RowMenu` memo. Add a `<Menu.Item leftSection={<IconX/>} onClick={...}>`.
2. For destructive actions, route through `modals.openConfirmModal` (see `openConfirm` in `dialogs.tsx`).
3. Gate folder-only / note-only with `item.isFolder`.

### Tweak the dark theme

1. Edit the custom ramp at the top of the `[data-mantine-color-scheme='dark']` block in `src/styles.css`.
2. The Mantine `--mantine-color-dark-{0..9}` reassignments below ensure third-party Mantine components stay in the ramp.
3. If you change the shell background, also update the inline `<script>` in `index.html` so the pre-paint matches.
4. If you change `theme_color`, update both `<meta name="theme-color">` and the manifest in `vite.config.ts`.

### Regenerate landing screenshots

1. `npm run screenshots` — runs `vite build`, starts a Playwright headless Chromium, navigates to `/demo`, takes a 1600×1000 screenshot in each theme, and pipes through Sharp to emit `public/landing/screenshot-{light,dark}-{800,1200,1600,2400}.webp` plus a PNG fallback.
2. `index.html` preload AND `LandingDemoFrame.tsx` `<source srcSet>` BOTH reference the same widths — keep them in sync if you change the set.

### Add a new markdown plugin

1. Add the plugin to BOTH `NoteView.tsx`'s `<LazyMarkdownView>` AND `NoteEdit.tsx`'s `previewOptions` so view and editor preview agree.
2. If it adds DOM the TOC should pick up, you don't need changes — `TocSidebar` debounces on a MutationObserver scoped to `.markdown`.

### Add a new repo method

1. Add the signature to `Repo` in `src/lib/repo.ts`.
2. Implement it in `src/store/mock-repo.ts` (synchronous, localStorage).
3. Implement it in `src/lib/notes.ts` (optimistic local update + fire-and-forget supabase call + `notifyError` on failure). Use `crypto.randomUUID()` for ids — do NOT use a temp-id-then-swap pattern; it breaks navigation immediately after create.
4. Components call `useRepo().yourMethod(...)`.

## Gotchas

- **Service worker history.** `globPatterns: []` (no precache) + NetworkFirst on JS/CSS/navigations with 3s timeout. Don't switch back to CacheFirst — stale code on every deploy.
- **There is no `src/register-sw.ts`.** PWA registration is via `vite-plugin-pwa`'s `injectRegister: 'script-defer'`.
- **`@uiw/react-md-editor/nohighlight`** import path is required — the default export bundles ~60 KB of Prism. Colors come from `rehype-highlight` instead.
- **Mermaid `securityLevel: 'loose'`** — required for foreignObject / HTML labels.
- **DnD collision strategy is `pointerWithin`.** `closestCenter` mis-targets nested folders.
- **DnD doesn't change order**, only `parentId`. There is no `position` field on `Item` (Supabase schema has one but it's unused — drops only update parent).
- **`store.hardDelete` does not cascade descendants.** Reachable only from Trash where descendants are already trashed.
- **Self-drop guard.** Always go through `isDescendantOrSelf(items, rootId, candidateId)`.
- **TOC MutationObserver is scoped to `.markdown`**, not `document`.
- **No FOUC.** The synchronous `<script>` in `index.html` sets `data-mantine-color-scheme` before paint. If you change theme keys, update both the script AND `localStorageColorSchemeManager({ key })` in `main.tsx`.
- **LCP preload vs runtime srcset.** The inline preload in `index.html` and the `<source srcSet>` in `LandingDemoFrame.tsx` MUST list identical widths and `imagesizes`/`sizes` — otherwise the preload downloads a candidate the browser then re-fetches.
- **Supabase imports must stay lazy.** Both `auth.tsx` (`getSupabase()`) and `data-mode.tsx` (`getRealRepo()`) use dynamic import. Adding a static `import { supabase } from './supabase'` anywhere on the entry path puts ~120 KB gz back on landing's critical chunk.
- **`crypto.randomUUID()` for note creation.** `lib/notes.ts` generates the id client-side and sends it in the `INSERT`. Do not introduce a tmp-id → real-id swap; it breaks `nav(path('/n/' + newId))` because the cache entry is replaced before the route resolves.
- **DataModeProvider blocks render with a Loader** while the supabase repo chunk is loading. Don't try to render Shell without a provider — `useRepo()` will fall back to the default `mockRepo` and silently lose user data on real routes.
- **Demo banner height.** `Shell.tsx` adds `DEMO_BANNER_HEIGHT` to AppShell `header.offset` only when `useDataMode().mode === 'demo'`. If you change banner height, update the constant export — don't hardcode 44 elsewhere.
- **Mobile editor.** `NoteEdit.tsx` switches to single-pane via `useMediaQuery('(max-width: 48em)')` + a `SegmentedControl` for "Edit / Preview". `EditorWithLineNumbers.tsx` hides the gutter via `@media (hover: none)` because the gutter doesn't make sense on touch.
- **No autosave in editor.** `NoteEdit.tsx` only writes on the "Create"/"Save" button; a `beforeunload` warning fires while dirty.
- **Highlight.js theme swap** uses two `<style>` tags with toggled `media` attributes — don't replace with a single tag swap; current approach avoids re-fetching CSS.
- **Lazy md editor types.** `LazyMarkdownView` accepts `ComponentProps<typeof Markdown>` and `LazyMarkdownEditor` accepts `ComponentProps<typeof Editor>`.
- **`prefetchMarkdown` / `prefetchDialogs` reset on failure** so retries are possible.
- **Profile page is real-only.** Guarded with `if (!usingSupabase) return <unavailable card>`. The mock repo has no user accounts.
- **Trash 30-day retention** is dialog copy. There is no purge job (would need a Supabase scheduled function).
- **Vite dev server uses `basicSsl()`** — dev URL is `https://`, browsers prompt about the self-signed cert.
- **Boot splash must stay inline.** Moving its CSS to `styles.css` defeats the purpose — it has to render before the JS bundle parses.
