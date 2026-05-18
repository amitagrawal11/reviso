# Architecture

Reference for engineers making non-trivial changes. Verified against the source as of this commit.

## Big picture

```
                ┌─────────────────────────────────────────────────┐
                │ index.html                                      │
                │  (1) <script> sets data-mantine-color-scheme    │
                │      synchronously from localStorage / OS pref  │
                │      → no FOUC, sets html.style.background      │
                │  (2) On `/`, injects <link rel=preload as=image │
                │      imagesrcset=... fetchpriority=high>        │
                │      for the LCP screenshot (per-theme WebP).   │
                │  (3) Inline boot splash inside #root paints     │
                │      during HTML parse; ReactDOM swaps it on    │
                │      mount.                                     │
                └────────────────────┬────────────────────────────┘
                                     │
                                     ▼
              ┌─────────────────────────────────────────┐
              │ main.tsx                                │
              │  MantineProvider (localStorageColorScheme│
              │    Manager: 'notes-color-scheme')       │
              │   ├─ Notifications (bottom-center)      │
              │   ├─ AuthProvider  (lazy supabase)      │
              │   ├─ BrowserRouter                      │
              │   │   └─ ModalsProvider                 │
              │   │       └─ <App />                    │
              │   └─ inject-styles.ts (inlines styles.css)│
              └────────────────────┬────────────────────┘
                                   │
                                   ▼
                          App.tsx — two route trees
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        │                                                     │
        ▼                                                     ▼
  /demo  ─ DataModeProvider mode="demo"            /  ─ <RealRoot>
           (always mockRepo, no auth)                   - guests on / → <LandingPage />
           AppLayout + DemoModeBanner                           - signed-in    → DataModeProvider mode="real"
                                                                          (supabaseRepo if configured,
                                                                           else noteRepositoryMock)  → AppLayout
                                                       - other paths while !session → <Navigate to="/">
```

```
   ┌──────────────────── AppLayout.tsx (AppShell) ────────────────────┐
   │ DemoBanner (only when useDataMode().mode === 'demo')         │
   │ Header: brand · search trigger · sidebar / TOC / read / theme│
   │   uses CommandPaletteIntent.requestSpotlight                     │
   │   lazy-mounts <CommandPaletteSearch /> on first ⌘K                │
   │                                                              │
   │ Navbar: <NotesSidebar />                                          │
   │   - DndContext (pointerWithin, MouseSensor + TouchSensor)    │
   │   - useItems() from data-mode (mode-aware repo)              │
   │   - openItemDialog / openRenameDialog / openConfirm via      │
   │     dialogs-lazy (chunked)                                   │
   │   - prefetchMarkdown on hover of a note row                  │
   │                                                              │
   │ Main: <Outlet context={{ readMode, tocOpen, setTocOpen }} /> │
   │   ├ Home / Recent / Starred / Trash                          │
   │   ├ FolderPage (/c/:id and /demo/c/:id)                  │
   │   ├ NoteViewPage (/n/:id)  ── lazy <NoteTableOfContents/> when            │
   │   │                       tocOpen && !readMode               │
   │   ├ NoteEdit (/n/:id/edit) — mobile single-pane via          │
   │   │                          SegmentedControl                │
   │   └ Profile / Settings (real tree only)                      │
   └──────────────────────────────────────────────────────────────┘
```

## Data model

`src/mock/SeedData.ts`:

```ts
export type Item = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  isFolder: boolean;
  starred?: boolean;
  trashed?: boolean;
  updatedAt: string;
  content: string;
};
```

One flat array. The tree is implicit — children are computed as `items.filter(i => i.parentId === parent.id)`. Folders and notes share the same shape. There is no `position` field client-side; DnD only changes `parentId`.

The Supabase schema (`supabase/schema.sql`) mirrors this with snake_case (`parent_id`, `is_folder`, `updated_at`), a `position` int (currently unused), a `user_id` FK, and per-row RLS keyed on `auth.uid()`. A `profiles` table holds `{ id, name, email }` and is populated by a `handle_new_user` trigger that fires on `auth.users` insert and copies the signup name from raw user metadata.

## Repo abstraction (`src/features/notes/repository/NoteRepositoryTypes.ts`)

```ts
export interface Repo {
  getAll(): Item[];
  get(id: string): Item | undefined;
  create(input: CreateInput): Item;
  update(id: string, patch: Partial<Item>): void;
  trash(id: string): void; // soft-delete, cascades to descendants
  restore(id: string): void;
  hardDelete(id: string): void; // does NOT cascade
  subscribe(listener: () => void): () => void;
}
```

Two implementations:

| Impl                     | File                                                      | Backing store                             |
| ------------------------ | --------------------------------------------------------- | ----------------------------------------- |
| `noteRepositoryMock`     | `src/features/notes/repository/NoteRepositoryMock.ts`     | `localStorage['notes-demo-items-v1']`     |
| `noteRepositorySupabase` | `src/features/notes/repository/NoteRepositorySupabase.ts` | Supabase `notes` table + realtime channel |

`noteRepositoryMock` is synchronous (in-memory mutate → write localStorage → emit). `noteRepositorySupabase` is **optimistic**: every mutator updates the local cache + emits _first_, then fires a fire-and-forget supabase call; failures call `notifyError(action, error)` which surfaces a toast. Note creation uses `crypto.randomUUID()` client-side, so the id is stable from the first render and routing to `/n/<newId>` doesn't race the network.

Realtime: `noteRepositorySupabase` subscribes to a postgres_changes channel on `notes` for the current `user_id` and merges incoming events into the cache.

## Data-mode context (`src/features/notes/repository/NoteRepositoryContext.tsx`)

A small context that ties the chosen `Repo` to a route subtree.

- `<DataModeProvider mode="demo">` → always `noteRepositoryMock`.
- `<DataModeProvider mode="real">`:
  - If supabase env vars are missing → `noteRepositoryMock` synchronously.
  - If supabase env vars are present → lazy-import `@/features/notes/repository/NoteRepositorySupabase` (which pulls `@/features/authentication/api/SupabaseClient`, which pulls `@supabase/supabase-js` ~120 KB gz). While the chunk is loading, the provider renders a centered `<Loader />` instead of its children. Cached at module level after first load.

```tsx
const { repo, mode } = useDataMode();
const items = useItems(); // useSyncExternalStore over repo
const path = useModePath(); // demo: prefixes /demo, real: identity
```

This is the **only** correct way for components to acquire a repo — never `import { mockRepo }` or `import { supabaseRepo }` from a UI component.

## Auth (`src/features/authentication/context/AuthContext.tsx`)

`AuthProvider` mounted once in `app/main.tsx`. Lazy-imports `@/features/authentication/api/SupabaseClient` inside an effect (`getSupabase()` cached promise). Tracks `{ session, profile, loading, refreshProfile }`.

- On mount: subscribes to `onAuthStateChange` AND fetches the current session. The first event (whichever arrives first) flips `loading` to false.
- Profile is fetched after each session change via `select('id, name, email').from('profiles')`.
- Sign-out and sign-in are handled by `SignInModal` and `SignInPage`.

`RealRoot` in `App.tsx` reads `useAuth()`:

- `loading && pathname === '/'` → render `<LandingPage />` immediately (don't block on the auth round-trip).
- `loading && other path` → spinner.
- `!session && pathname === '/'` → `<LandingPage />`.
- `!session && other path` → `<Navigate to="/" replace />`.
- `session` → `<DataModeProvider mode="real"><AppLayout/></DataModeProvider>`.

## Routing

Defined in `src/app/App.tsx`. **All pages are lazy** (including `HomePage` and `LandingPage`). Two parallel route trees:

| Path                            | Page                  | Tree | Auth?        |
| ------------------------------- | --------------------- | ---- | ------------ |
| `/`                             | `LandingPage` or Home | real | guest/signed |
| `/recent` `/starred` `/trash`   | ...                   | real | signed       |
| `/profile` `/settings`          | ...                   | real | signed       |
| `/c/:id` `/n/:id` `/n/:id/edit` | ...                   | real | signed       |
| `/login`                        | `SignInPage`          | —    | public       |
| `/demo`                         | `HomePage`            | demo | public       |
| `/demo/recent` …                | mirror of real tree   | demo | public       |

`<Route path="*" element={<Navigate to="/" replace />}/>` catches everything else.

## Lazy-loading strategy

Goal: keep the **landing page** chunk minimal. AppLayout, NotesSidebar, DnD-kit, dialogs, markdown, mermaid, supabase — all deferred.

| Chunk                                                                           | Triggered by                                                                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `AppLayout` + `NotesSidebar` + DnD-kit                                          | First render of any signed-in or demo route                                                      |
| `HomePage`, `LandingPage`, every page                                           | `React.lazy()` in `App.tsx`                                                                      |
| `@supabase/supabase-js` (`@/features/authentication/api/SupabaseClient`)        | First `useAuth()` effect (in `AuthContext.tsx`)                                                  |
| `noteRepositorySupabase` (`@/features/notes/repository/NoteRepositorySupabase`) | First `<DataModeProvider mode="real">` mount (when configured)                                   |
| `@uiw/react-md-editor/nohighlight`                                              | `MarkdownViewer.tsx` / `MarkdownEditor.tsx`; warmed via `prefetchMarkdownViewer()` on note hover |
| `NotesDialogsImpl.tsx`                                                          | `NotesDialogs.ts` shims; warmed via `prefetchDialogs` on "+ New"                                 |
| `mermaid`                                                                       | `MermaidDiagramRenderer.tsx` first render — module-level `mermaidPromise`                        |
| `@mantine/spotlight` + `CommandPaletteSearch.tsx`                               | First ⌘K via `CommandPaletteIntent`                                                              |
| `NoteTableOfContents.tsx`                                                       | Lazy import inside `NoteViewPage.tsx`                                                            |
| `highlight.js/styles/github*.css`                                               | `useCodeHighlightTheme()` injects both as `<style>` tags, toggles `media`                        |

`CommandPaletteIntent.ts` exists so `AppLayout.tsx` and `NotesSidebar.tsx` can publish a "user wants to search" intent without statically importing `@mantine/spotlight`. Buffers a `pending` flag + subscriber list; once CommandPaletteSearch mounts, it drains pending intent.

## Theming

- `light` / `dark` schemes via Mantine's `localStorageColorSchemeManager({ key: 'notes-color-scheme' })`.
- Inline `<script>` in `index.html` reads the same key + sets `data-mantine-color-scheme` and inline `background` on `<html>` synchronously → no FOUC.
- `theme-color` meta `#1a1b1e`. PWA manifest `#0a0a0c` for both `theme_color` and `background_color`.
- Token overrides in `src/styles.css` under `[data-mantine-color-scheme='dark']` and `[data-mantine-color-scheme='light']`. Dark block defines a custom grayscale ramp and reassigns Mantine's `--mantine-color-dark-{0..9}`.
- Dimmed text contrast bumped for WCAG AA: dark `#a1a1aa` (was `#71717a`), light `#5b5953` (was `#787774`).
- `@uiw/react-md-editor` themed by mapping its `--color-*` tokens onto Mantine ones, scoped under the same `[data-mantine-color-scheme=...]` selectors.
- highlight.js theme via `@/shared/lib/CodeHighlightTheme` — both `github.css` and `github-dark.css` injected once each as `<style>` tags, toggled by setting `media="all"` on the active one.

## Landing page + LCP pipeline

- **Page**: `src/features/landing-page/LandingPage.tsx` — hero, demo frame, feature cards, why/how-it-works, CTA, footer. Wrapped in `<Box component="main">` for landmark accessibility.
- **Demo frame**: `src/features/landing-page/LandingPageDemoPreview.tsx` renders a `<picture>` with WebP `<source srcSet>` (800/1200/1600/2400 widths) + PNG fallback. The whole frame is a `<Link to="/demo">`. The "Try it" pill is a non-focusable decorative span (avoids nested focusable inside an aria-labelled link).
- **LCP preload**: the inline script in `index.html` writes `<link rel=preload as=image type=image/webp imagesrcset=... imagesizes=... fetchpriority=high>` matching the runtime srcset, **only when `pathname === '/'`**.
- **Screenshot pipeline**: `npm run screenshots` (`scripts/screenshot-landing.ts`) builds the app, spawns Playwright headless Chromium, navigates to `/demo` in each theme, snaps a 1600×1000 PNG, then pipes through Sharp → 4 WebP widths × 2 themes + a 1600 PNG fallback into `public/landing/`.
- **Boot splash**: inline `<style>` + markup inside `#root` in `index.html`. SVG logo + animated bar, theme-aware. Replaced when `ReactDOM.createRoot()` mounts.

## Demo banner

`src/shared/components/DemoModeBanner.tsx` — non-dismissable amber strip (44 px) with "Sign up" CTA. Rendered above AppShell by `AppLayout.tsx` only when `useDataMode().mode === 'demo'`. AppShell `header.offset` is bumped by `DEMO_BANNER_HEIGHT` so the sticky header sits below the banner.

## Drag and drop — `NotesSidebar.tsx`

- `@dnd-kit/core` with `MouseSensor` (5 px activation distance) + `TouchSensor` (250 ms delay) + `KeyboardSensor`. The touch delay distinguishes a drag from a tap on mobile.
- `collisionDetection={pointerWithin}` — required for nested droppables.
- Droppables: every folder + a `RootDropZone` keyed `'root'`. `overId === 'root'` resolves to `parentId: null`.
- Draggables: every row via `useDraggable({ id })`. Row chevron and `…` menu use `onPointerDown={e.stopPropagation()}` to remain clickable.
- Self-drop guard: `isDescendantOrSelf(items, draggedId, candidateParent)` walks descendants of the dragged folder.
- `DragOverlay` renders a styled snapshot; live row gets `opacity: 0.4`.
- Valid drop → `repo.update(draggedId, { parentId })` + Mantine notification.

## Markdown pipeline

`MarkdownViewer` from `MarkdownEditor.tsx` + `MarkdownViewer.tsx` loads `@uiw/react-md-editor/nohighlight` (strips Prism + ~80 lang defs).

```
remarkPlugins:  [remarkGfm, remarkBreaks]
rehypePlugins:  [rehypeSlug,
                 [rehypeAutolinkHeadings, { behavior: 'wrap' }],
                 [rehypeHighlight, { detect: true, ignoreMissing: true }]]
components:     { pre: CodeBlock }
```

`CodeBlock` (`CodeBlockRenderer.tsx`):

1. Recursively flattens children to text via `nodeText`.
2. Detects mermaid two ways: recursive className scan AND a regex on diagram keywords (rehype-highlight may relocate the className).
3. Mermaid → `<MermaidBlock source={text}/>`. Otherwise → `<pre>` with copy-code button overlay.

`MermaidBlock` lazy-imports `mermaid`, memoizes the promise, calls `mermaid.initialize({ startOnLoad: false, theme, securityLevel: 'loose', fontFamily: 'inherit' })` per theme change. **`securityLevel: 'loose'` is required** for foreignObject / HTML labels.

Heading anchors: `rehype-slug` + `rehype-autolink-headings` (`behavior: 'wrap'`). `styles.css` strips link decoration + `scroll-margin-top: 70px` keeps anchored headings clear of the header.

## Note editor — `NoteEditPage.tsx`

- Single-pane on mobile (`useMediaQuery('(max-width: 48em)')`) with a `SegmentedControl` toggling Edit / Preview.
- **No autosave.** Writes only on the "Create" / "Save" button. `beforeunload` warning fires while dirty.
- `NoteEditor.tsx` overlays a gutter on the textarea, syncs scroll, and dynamically measures the toolbar height. Hides the gutter under `@media (hover: none)` for touch devices.
- Cursor-desync fix: the `.w-md-editor textarea, .w-md-editor textarea *` universal selector forces identical font properties on Prism `.token` spans so widths match the textarea.

## TOC scroll-spy — `NoteTableOfContents.tsx`

- Queries `.markdown h1, h2, h3` on mount + on every `useLocation().pathname` change.
- Scoped `MutationObserver` rooted on `.markdown` (NOT document) with `childList: true, subtree: true`. Debounces via `setTimeout(150)` then `requestAnimationFrame`.
- `IntersectionObserver` with `rootMargin: '0px 0px -70% 0px'` selects the active heading.

## PWA / service worker

`vite.config.ts` configures `VitePWA`:

- `registerType: 'autoUpdate'`, `injectRegister: 'script-defer'`
- `workbox.globPatterns: []` — **nothing precached**. Avoids the stale-shell-after-deploy problem.
- `cleanupOutdatedCaches: true`, `clientsClaim: true`, `skipWaiting: true`
- `navigateFallback: '/index.html'` with denylist for `/api` and SW files

Runtime caching:

| Pattern                       | Strategy             | Cache name     | Notes                |
| ----------------------------- | -------------------- | -------------- | -------------------- |
| `request.mode === 'navigate'` | NetworkFirst, 3 s    | `pages`        | 20 entries, 30 days  |
| script / style / worker       | NetworkFirst, 3 s    | `assets`       | 100 entries, 30 days |
| image / font                  | StaleWhileRevalidate | `media`        | 60 entries, 30 days  |
| `*.supabase.co`               | NetworkFirst, 5 s    | `supabase-api` | 200 entries, 7 days  |

## Performance optimizations (summary)

- **LCP**: preload landing screenshot with `imagesrcset` matching runtime; WebP at 4 widths.
- **FCP**: inline boot splash in `#root` paints during HTML parse — no waiting on React compile.
- **TTI**: every page lazy; AppLayout/NotesSidebar/DnD lazy off the landing path; `@supabase/supabase-js` and `noteRepositorySupabase` lazy-imported.
- **Markdown**: `?nohighlight` build of `@uiw/react-md-editor` saves ~60 KB; rehype-highlight runs at render.
- **Spotlight**: only loads on first ⌘K (bridge buffers intent).
- **Prefetch on hover**: markdown + dialogs warmed before the click registers; both reset on import failure for retry.
- **CSS**: `InjectAppStyles.ts` inlines `styles.css` into `<head>` to skip a render-blocking roundtrip; Mantine CSS stays as `<link>` to stay cacheable.
- **TOC**: MutationObserver scoped to `.markdown` so toasts and sidebar updates don't trigger re-scans.
- **RowMenu**: defers mounting `<Menu>` until trigger is clicked.
- **Vite**: `cssCodeSplit: true`, `target: 'es2022'`.

## File size reference (approx., post-build, gzip)

Landing critical chunk (entry + Mantine core + router + LandingPage): well under 200 KB gz. AppLayout + NotesSidebar + DnD-kit + dialogs land on the first signed-in render. Supabase client (~120 KB gz) is its own chunk. Markdown editor (~80 KB gz with `nohighlight`) loads on first note view. Mermaid (~250 KB gz) only on diagram pages.
