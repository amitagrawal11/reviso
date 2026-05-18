---
name: reviso
description: Conventions, architecture cheats, and gotchas for the markdown notes PWA at this repo.
---

# Reviso Notes — SKILL

## When to use

Triggers: any path under `src/app/`, `src/features/`, `src/shared/`, or any of `index.html`, `styles.css`, `vite.config.ts`, `vitest.config.ts`, `scripts/screenshot-landing.ts`. Anything mentioning "markdown notes PWA", "data mode", "demo tree", "supabase repo", "command palette ⌘K", "read mode", "TOC scroll-spy", "dnd-kit sidebar", "mermaid", "boot splash", "LCP preload", "landing page", `nohighlight`, or `notes-color-scheme`.

## Stack

React 19 + TS + Vite 6 + Mantine v7 + react-router-dom v7. Markdown via `@uiw/react-md-editor/nohighlight` + `remark-gfm` + `remark-breaks` + `rehype-slug/autolink-headings/highlight`. Mermaid + dnd-kit + vite-plugin-pwa. Auth + sync via Supabase (`@supabase/supabase-js`, lazy-imported). State is a swappable `Repo` interface implemented by either `noteRepositoryMock` (localStorage) or `noteRepositorySupabase` (Postgres + RLS + realtime). Screenshot pipeline: Playwright + Sharp generating responsive WebP variants.

## Folder layout

```
src/
  app/                                main.tsx, App.tsx (route table), AppLayout.tsx
  features/
    notes/
      pages/                          HomePage, NoteViewPage, NoteEditPage, FolderPage,
                                      RecentNotesPage, StarredNotesPage, TrashPage
      sidebar/NotesSidebar.tsx        Tree + DnD + row menus + account footer
      editor/                         NoteEditor, NoteEditorLineGutter, MarkdownEditor
      viewer/                         MarkdownViewer, NoteTableOfContents,
                                      CodeBlockRenderer, MermaidDiagramRenderer,
                                      NoteNotFoundCard
      dialogs/                        NotesDialogs (lazy shims), NotesDialogsImpl
      quick-capture/                  NoteQuickCaptureButton, NoteQuickCapturePreview,
                                      NoteQuickCaptureIntent
      repository/                     NoteRepositoryTypes, NoteRepositoryMock,
                                      NoteRepositorySupabase, NoteRepositoryContext
    authentication/
      pages/                          SignInPage, UserProfilePage, SettingsPage
      modal/SignInModal.tsx
      context/AuthContext.tsx
      api/                            SupabaseClient, UserProfileApi, ImportLocalNotes
    command-palette/                  CommandPaletteSearch, CommandPaletteIntent
    landing-page/                     LandingPage, LandingPageDemoPreview
  shared/
    components/                       ItemIcon, BrandLogo, AdaptiveDialog,
                                      DemoModeBanner, MobileBottomNavigationBar,
                                      PwaInstallPrompt, OfflineStatusIndicator
    hooks/UseViewport.ts
    lib/                              UserPreferences, DesignTokens,
                                      CodeHighlightTheme, InjectAppStyles, I18n
  mock/SeedData.ts                    Item type + seed data
  styles.css
  test/                               Setup.ts, SupabaseMock.ts, Utils.tsx
```

**Naming rules:** every source file under `src/` is PascalCase. Components export PascalCase, modules export camelCase (`noteRepositorySupabase`), hooks export `useFoo`. Filename always matches the primary export. Cross-feature imports use the `@/*` alias.

## Two trees: real vs demo

The router serves two parallel sub-trees under `app/App.tsx`:

- **Real tree** at `/`, `/n/:id`, `/c/:id`, `/recent`, `/starred`, `/trash`, `/profile`, `/settings`. Gated by `RealRoot`: shows `LandingPage` to logged-out guests on `/`, `AppLayout` to logged-in users, redirects `Navigate to="/"` for any other path. `DataModeProvider mode="real"` wraps `AppLayout` — repo is `noteRepositorySupabase` if `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set, else `noteRepositoryMock`.
- **Demo tree** at `/demo`, `/demo/n/:id`, etc. Public — no auth required. `DataModeProvider mode="demo"` always wraps `AppLayout` with `noteRepositoryMock`. `DemoModeBanner` renders a non-dismissable amber strip + "Sign up" CTA above the AppShell.

`useModePath()` from `@/features/notes/repository/NoteRepositoryContext` is the canonical way to build links — it auto-prefixes `/demo` when called inside the demo tree. Never hardcode `/n/:id` or `/c/:id` in shared components.

## Conventions

- **Mantine v7 styling.** Token overrides live in `src/styles.css` under `[data-mantine-color-scheme='dark']` and `[data-mantine-color-scheme='light']`. Reassign Mantine CSS vars (`--mantine-color-*`) — don't introduce per-component styles unless necessary.
- **Color scheme** is persisted under localStorage key `notes-color-scheme`. Mantine reads it via `localStorageColorSchemeManager` in `app/main.tsx`; the inline pre-paint script in `index.html` reads the same key AND writes a preload `<link>` for the LCP screenshot.
- **State.** Read items with `useItems()` from `@/features/notes/repository/NoteRepositoryContext`. Mutate via `useRepo()` then `repo.create/update/trash/restore/hardDelete`. Never call `noteRepositoryMock` or `noteRepositorySupabase` directly from a component.
- **Items shape** (`@/mock/SeedData`). `Item.parentId: string | null` — `null` means top-level. Folders and notes are the same shape; `isFolder` distinguishes. Children are computed by filter, not stored.
- **Routing inside AppLayout.** Always build paths via `useModePath()` so demo and real trees both work. `<Link to={path('/n/' + id)}>`, `nav(path('/n/' + id + '/edit'))`.
- **Lazy-load patterns.**
  - Every page is lazy in `app/App.tsx` (including `HomePage` and `LandingPage`).
  - `AppLayout` is lazy — it pulls in DnD-kit, dialogs, the sidebar tree. The landing route never loads it.
  - Supabase client is lazy-imported inside `AuthContext.tsx` (`getSupabase()`).
  - `noteRepositorySupabase` is lazy-imported inside `NoteRepositoryContext.tsx` (`getRealRepo()`).
  - Markdown via `MarkdownViewer` / `MarkdownEditor`. Call `prefetchMarkdownViewer()` on hover of any link routing to a note.
  - Dialogs via `@/features/notes/dialogs/NotesDialogs`. Call `prefetchDialogs` on hover. Never import `NotesDialogsImpl.tsx` directly from non-modal code.
  - Command palette via `requestSpotlight()` from `@/features/command-palette/CommandPaletteIntent`. Do NOT import `@mantine/spotlight` outside `CommandPaletteSearch.tsx`.
  - Mermaid loads itself on first `MermaidDiagramRenderer` render.
  - `NoteTableOfContents` is lazy from inside `NoteViewPage.tsx`.
- **CSS injection.** `@/shared/lib/InjectAppStyles` inlines `styles.css` via Vite's `?inline` import. Mantine's own CSS stays as normal `<link>`s.
- **Boot splash.** `index.html` has an inline `.boot-splash` block inside `#root` (SVG logo + animated bar) that paints during HTML parse and is replaced when React mounts. Theme-aware via `[data-mantine-color-scheme]`. Don't replace `#root` from a build step — `ReactDOM.createRoot()` does the swap.
- **LCP preload.** The inline script in `index.html` injects `<link rel="preload" as="image" imagesrcset="..." imagesizes="..." type="image/webp" fetchpriority="high">` for the landing screenshot — only on `/`. The runtime `<picture>` in `LandingPageDemoPreview.tsx` mirrors the same srcset so the preload matches the candidate the browser actually picks.
- **Hotkeys.** `useHotkeys` in `AppLayout.tsx`: `mod+\\` toggles sidebar, `mod+.` toggles read mode. ⌘K is a manual `keydown` listener that calls `requestSpotlight()`.
- **Outlet context.** `AppLayout.tsx` passes `{ readMode, tocOpen, setTocOpen }` via `<Outlet context={...}>`. Pages read it with `useOutletContext`.
- **Notifications.** Use `notifications.show({ message, color })` (`bottom-center`). Errors from supabase mutations are surfaced via `notifyError(action, error)` in `NoteRepositorySupabase.ts`.
- **404 / id-not-found.** When a route param doesn't resolve, render `<NoteNotFoundCard label="…" />` instead of throwing or showing a blank screen.

## Common tasks → recipe

### Add a new page (visible on both real + demo trees)

1. Create `src/features/notes/pages/FooPage.tsx`. Read items via `useItems()`; build links/nav via `useModePath()`.
2. In `src/app/App.tsx`, add `const FooPage = lazy(() => import('@/features/notes/pages/FooPage'))` and mirror `<Route path="foo" element={...}/>` inside BOTH the `/demo` route block and the `/` route block.
3. If the page should be real-only (auth-gated, like Profile/Settings), add it only under `/` and place it in `features/authentication/pages/`.
4. If you want a sidebar nav row, add a `<NavRow to={path('/foo')} .../>` block in `NotesSidebar.tsx`.

### Add a new sidebar action (top-right "+ ..." button)

1. In `@/features/notes/sidebar/NotesSidebar.tsx`'s top `<Group>`, add another `ActionIcon`.
2. Hook it to a handler that calls something from `@/features/notes/dialogs/NotesDialogs` (or write a new dialog in `NotesDialogsImpl.tsx` and add a lazy shim).
3. Add `onMouseEnter={prefetchDialogs}` on the trigger.

### Add a per-row context-menu action

1. In `NotesSidebar.tsx`, edit the `RowMenu` memo. Add a `<Menu.Item leftSection={<IconX/>} onClick={...}>`.
2. For destructive actions, route through `modals.openConfirmModal` (see `openConfirm` in `NotesDialogsImpl.tsx`).
3. Gate folder-only / note-only with `item.isFolder`.

### Tweak the dark theme

1. Edit the custom ramp at the top of the `[data-mantine-color-scheme='dark']` block in `src/styles.css`.
2. The Mantine `--mantine-color-dark-{0..9}` reassignments below ensure third-party Mantine components stay in the ramp.
3. If you change the shell background, also update the inline `<script>` in `index.html` so the pre-paint matches.
4. If you change `theme_color`, update both `<meta name="theme-color">` and the manifest in `vite.config.ts`.

### Regenerate landing screenshots

1. `npm run screenshots` — runs `vite build`, starts a Playwright headless Chromium, navigates to `/demo`, takes a 1600×1000 screenshot in each theme, and pipes through Sharp to emit `public/landing/screenshot-{light,dark}-{800,1200,1600,2400}.webp` plus a PNG fallback.
2. `index.html` preload AND `LandingPageDemoPreview.tsx` `<source srcSet>` BOTH reference the same widths — keep them in sync if you change the set.

### Add a new markdown plugin

1. Add the plugin to BOTH `NoteViewPage.tsx`'s `<MarkdownViewer>` AND `NoteEditPage.tsx`'s `previewOptions` so view and editor preview agree.
2. If it adds DOM the TOC should pick up, you don't need changes — `NoteTableOfContents` debounces on a MutationObserver scoped to `.markdown`.

### Add a new repo method

1. Add the signature to `Repo` in `@/features/notes/repository/NoteRepositoryTypes`.
2. Implement it in `NoteRepositoryMock.ts` (synchronous, localStorage).
3. Implement it in `NoteRepositorySupabase.ts` (optimistic local update + fire-and-forget supabase call + `notifyError` on failure). Use `crypto.randomUUID()` for ids — do NOT use a temp-id-then-swap pattern; it breaks navigation immediately after create.
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
- **No FOUC.** The synchronous `<script>` in `index.html` sets `data-mantine-color-scheme` before paint. If you change theme keys, update both the script AND `localStorageColorSchemeManager({ key })` in `app/main.tsx`.
- **LCP preload vs runtime srcset.** The inline preload in `index.html` and the `<source srcSet>` in `LandingPageDemoPreview.tsx` MUST list identical widths and `imagesizes`/`sizes` — otherwise the preload downloads a candidate the browser then re-fetches.
- **Supabase imports must stay lazy.** Both `AuthContext.tsx` (`getSupabase()`) and `NoteRepositoryContext.tsx` (`getRealRepo()`) use dynamic import. Adding a static `import` of `@/features/authentication/api/SupabaseClient` or `@/features/notes/repository/NoteRepositorySupabase` anywhere on the entry path puts ~120 KB gz back on landing's critical chunk.
- **`crypto.randomUUID()` for note creation.** `NoteRepositorySupabase.ts` generates the id client-side and sends it in the `INSERT`. Do not introduce a tmp-id → real-id swap; it breaks `nav(path('/n/' + newId))` because the cache entry is replaced before the route resolves.
- **DataModeProvider blocks render with a Loader** while the supabase repo chunk is loading. Don't try to render `AppLayout` without a provider — `useRepo()` will fall back to the default `noteRepositoryMock` and silently lose user data on real routes.
- **Demo banner height.** `AppLayout.tsx` adds `DEMO_BANNER_HEIGHT` to AppShell `header.offset` only when `useDataMode().mode === 'demo'`. If you change banner height, update the constant export from `@/shared/components/DemoModeBanner` — don't hardcode 44 elsewhere.
- **Mobile editor.** `NoteEditPage.tsx` switches to single-pane via `useMediaQuery('(max-width: 48em)')` + a `SegmentedControl` for "Edit / Preview". `NoteEditor.tsx` hides the gutter via `@media (hover: none)` because the gutter doesn't make sense on touch.
- **No autosave in editor.** `NoteEditPage.tsx` only writes on the "Create"/"Save" button; a `beforeunload` warning fires while dirty.
- **Highlight.js theme swap** uses two `<style>` tags with toggled `media` attributes — don't replace with a single tag swap; current approach avoids re-fetching CSS.
- **Lazy md component types.** `MarkdownViewer` accepts `ComponentProps<typeof Markdown>` and `MarkdownEditor` accepts `ComponentProps<typeof Editor>`. Use `prefetchMarkdownViewer` / `prefetchMarkdownEditor` separately — they back their own chunks.
- **`prefetchMarkdown*` / `prefetchDialogs` reset on failure** so retries are possible.
- **Profile page is real-only.** Guarded with `if (!usingSupabase) return <unavailable card>`. The mock repo has no user accounts.
- **Trash 30-day retention** is dialog copy. There is no purge job (would need a Supabase scheduled function).
- **Vite dev server uses `basicSsl()`** — dev URL is `https://`, browsers prompt about the self-signed cert.
- **Boot splash must stay inline.** Moving its CSS to `styles.css` defeats the purpose — it has to render before the JS bundle parses.
