# Notes

A markdown notes PWA with a Docusaurus-style three-column shell: nested folder/note sidebar on the left, markdown content in the middle, auto-generated table of contents on the right. Includes a Kindle-like read mode, dark/light themes, drag-and-drop reorganization, command-palette search, mermaid diagrams, syntax highlighting, and offline support via a service worker. Currently demo-grade — state lives in `localStorage` via a tiny in-memory store; Supabase + auth are scaffolded but not wired into the running UI.

## Quick start

```bash
npm install
npm run dev      # vite dev server (basic-ssl plugin enables https locally)
npm run build    # tsc -b && vite build → dist/
npm run preview  # preview the production build
```

A `.env.example` exists for the future Supabase wiring; the app today does not require any env vars to run.

## Tech stack

| Concern         | Choice                                                                     |
| --------------- | -------------------------------------------------------------------------- |
| Framework       | React 19 + TypeScript                                                      |
| Routing         | react-router-dom v7                                                        |
| UI library      | Mantine v7 (`@mantine/core`, `hooks`, `modals`, `notifications`, `spotlight`) |
| Icons           | `@tabler/icons-react`                                                      |
| Markdown stack  | `@uiw/react-md-editor` (`/nohighlight` build) + `remark-gfm` + `rehype-slug` + `rehype-autolink-headings` + `rehype-highlight` (highlight.js) |
| Diagrams        | `mermaid` (lazy-loaded)                                                    |
| Drag and drop   | `@dnd-kit/core`                                                            |
| State           | Custom `useSyncExternalStore` store, persisted to `localStorage`           |
| Backend (stub)  | `@supabase/supabase-js` — client + types + SQL schema present, not used by the UI |
| Build           | Vite 6 (es2022, css code split, sourcemaps)                                |
| PWA             | `vite-plugin-pwa` (Workbox, autoUpdate, NetworkFirst on JS/CSS/nav)        |
| Hosting target  | Cloudflare Pages (build cmd `npm run build`, output `dist/`)               |

## Project structure

```
src/
  App.tsx              Routes: lazy-loaded pages under <Shell> outlet
  main.tsx             Mantine + ModalsProvider + Notifications + Router bootstrap
  styles.css           App stylesheet (inlined into <head> via inject-styles.ts)
  components/
    Shell.tsx          AppShell header + sidebar slot + outlet, hotkeys (⌘K, ⌘\, ⌘.)
    Sidebar.tsx        Tree view, dnd-kit DnD, row menus, account footer
    TocSidebar.tsx     Right-side outline with scroll-spy (IntersectionObserver)
    SpotlightSearch.tsx Mantine Spotlight, lazy-mounted on first ⌘K
    LazyMarkdown.tsx   Suspense wrappers around @uiw/react-md-editor/nohighlight
    CodeBlock.tsx      Custom <pre> renderer — copy button + mermaid detection
    MermaidBlock.tsx   Lazy mermaid import + theme-aware render
    dialogs.tsx        New-item, rename, confirm-trash forms (Mantine modals)
    dialogs-lazy.ts    Async shims so dialogs.tsx stays out of the critical chunk
    Layout.tsx         Older alternate shell (not currently routed; kept as a reference)
  pages/
    Home.tsx           Landing welcome cards
    NoteView.tsx       Render a note (markdown + TOC)
    NoteEdit.tsx       Edit note (live preview, autosave debounce 800ms)
    CollectionView.tsx Folder grid view (/c/:id)
    Recent.tsx         Last 20 notes by updatedAt
    Starred.tsx        Filtered list of starred notes
    Trash.tsx          Trashed items + restore / hard-delete
    Login.tsx          Supabase email/password form (NOT routed — orphan)
  store/
    store.ts           In-memory items array + emit, useSyncExternalStore hook
  mock/
    data.ts            Item type + seed items
  lib/
    auth.tsx           Supabase AuthProvider context (not mounted in the tree)
    supabase.ts        Supabase client + Note row type
    notes.ts           CRUD helpers for the (unused) notes table
    spotlight-bridge.ts Decouples ⌘K trigger from the spotlight chunk
    inject-styles.ts   Inlines styles.css into <head> at module init
    hljs-theme.tsx     Lazy-injects highlight.js github / github-dark CSS, toggles via media attr
supabase/schema.sql    Postgres schema (notes table + RLS, used only if you wire Supabase)
.github/workflows/keepalive.yml  Daily Supabase ping (only relevant once Supabase is wired)
index.html             Inline pre-paint script that sets data-mantine-color-scheme
vite.config.ts         Vite + VitePWA + basic-ssl + Workbox runtimeCaching rules
```

## Key features

- Nested folders ("collections") and notes — single self-referencing `parentId` model
- Markdown CRUD with live-preview editor and 800ms debounced autosave
- Drag-and-drop in the sidebar to reparent items, with descendant-loop guard
- Read mode (⌘.) collapses both sidebars and centers content (max ~1100px)
- Right-side auto-generated TOC with scroll-spy, defaults open above 1100px
- Spotlight search (⌘K, ⌘P) over notes and collections
- Mermaid diagrams rendered from ```` ```mermaid ```` blocks (lazy-loaded, theme-aware)
- Syntax highlighting via highlight.js with theme-swapped CSS
- Per-block copy-code button on rendered code
- Soft-delete to Trash with restore and permanent-delete
- Star / unstar notes
- Dark / light theming with localStorage persistence and a synchronous pre-paint script that prevents FOUC
- Installable PWA, NetworkFirst service worker so deploys never serve stale code
- Custom emoji pickers (separate sets for notes vs collections)
- Keyboard shortcuts: ⌘K search, ⌘\ toggle sidebar, ⌘. read mode

## Status — what's real vs stub

Production-shaped:
- The whole UI shell, routing, sidebar tree + DnD, dialogs, TOC, read mode, theming, code/mermaid rendering, PWA config.

Stubbed / not wired:
- **Persistence is `localStorage` only.** `src/store/store.ts` holds an in-memory `Item[]` seeded from `src/mock/data.ts`. There is no network call.
- **Supabase is not wired into the app.** `src/lib/supabase.ts`, `lib/notes.ts`, `lib/auth.tsx` exist and compile, but no component imports `AuthProvider` and no page calls `listNotes`/`getNote`/etc. `pages/Login.tsx` is not registered in `App.tsx`.
- **Account footer is decorative** — the avatar/name/email and Sign out item are hard-coded; they don't call `supabase.auth.signOut()`.
- **Layout.tsx** is an older two-sidebar shell, kept around but not routed; `Shell.tsx` is what actually renders.
- **30-day Trash retention** is just copy in the dialogs — no scheduled purge exists.
- **Realtime cross-tab sync** mentioned in the old README is not implemented (the store fires only within one tab).
- There is no `register-sw.ts` — the previous explicit registration file has been removed; `vite-plugin-pwa` handles registration via `injectRegister: 'script-defer'`.

## Roadmap / TODO

- Wire `AuthProvider` into `main.tsx` and gate the app on session
- Replace `store.ts` with a Supabase-backed implementation (see `lib/notes.ts` for the shape — note the `parent_id` / `parentId` casing difference)
- Route `pages/Login.tsx` and a `RequireAuth` wrapper
- Hook the sidebar account footer up to real auth state and `signOut`
- Implement actual 30-day trash purge (server-side cron or client-side sweep)
- Realtime sync via Supabase channels on the notes table
- Drag-and-drop ordering (currently DnD only changes parent, not `position`)
- Decide whether `components/Layout.tsx` should be deleted or restored
