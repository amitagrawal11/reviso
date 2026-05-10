# Notes

A markdown notes PWA with a three-column shell: nested collections and notes on the left, markdown content in the center, and an auto-generated table of contents on the right. It includes live markdown preview, Mermaid diagrams, drag-and-drop organization, search, dark and light themes, a distraction-free read mode, and optional Supabase-backed auth and sync.

The app currently supports two runtime modes:
- `demo` mode at `/demo`, which is public and always uses the local mock repo
- `real` mode under `/`, which uses Supabase when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured, and otherwise falls back to the local mock repo

## Quick start

```bash
npm install
npm run dev
npm run build
npm run preview
```

Local development runs on Vite. Production output is written to `dist/`.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | React 19 + TypeScript |
| Build tool | Vite 6 |
| Routing | `react-router-dom` v7 |
| UI | Mantine v7 |
| Icons | `@tabler/icons-react` |
| Markdown | `@uiw/react-md-editor/nohighlight` + `remark-gfm` + `remark-breaks` |
| HTML transforms | `rehype-slug` + `rehype-autolink-headings` + `rehype-highlight` |
| Diagrams | `mermaid` |
| Drag and drop | `@dnd-kit/core` |
| PWA | `vite-plugin-pwa` |
| Auth and data | Supabase (`@supabase/supabase-js`) |
| Image pipeline | Playwright + Sharp for landing screenshots |

## How it works

### Real and demo trees

The router serves two parallel trees:

- `real` tree: `/`, `/recent`, `/starred`, `/trash`, `/profile`, `/settings`, `/c/:id`, `/n/:id`, `/n/:id/edit`
- `demo` tree: `/demo`, `/demo/recent`, `/demo/starred`, `/demo/trash`, `/demo/c/:id`, `/demo/n/:id`, `/demo/n/:id/edit`

The demo tree is always public and always uses the local mock repo.

The real tree is gated by auth when Supabase is configured:
- guests visiting `/` see the landing page
- signed-in users see the app shell
- guests visiting protected routes are redirected to `/`

If Supabase env vars are missing, the real tree falls back to the local mock repo so the app can still run without backend setup.

### Data layer

The UI talks to a `Repo` abstraction rather than calling storage directly:

- `mockRepo` stores items in `localStorage`
- `supabaseRepo` stores items in the Supabase `notes` table and applies optimistic UI updates

Items are a flat array with `parentId` pointers. Collections and notes share the same shape, and tree structure is derived by filtering children by `parentId`.

### Auth and sync

`AuthProvider` is mounted in `src/main.tsx`. It tracks the active Supabase session, loads the current profile, and exposes auth state to the router and account-related pages.

When Supabase is enabled, the repo layer:
- creates notes and collections optimistically
- persists changes to Postgres
- listens for auth changes
- subscribes to realtime note updates

## Key features

- Nested collections and notes with drag-and-drop reparenting
- Markdown editing with live preview
- Syntax-highlighted code blocks
- Mermaid diagram rendering
- Spotlight-style search
- Read mode for distraction-free reading
- Scroll-aware table of contents
- Dark and light themes with pre-paint color scheme handling
- Installable PWA with runtime caching
- Public demo mode and optional authenticated workspace mode

## Project structure

```text
src/
  App.tsx                   Route table for the real and demo trees
  main.tsx                  Mantine, notifications, router, auth bootstrap
  styles.css                Theme tokens and app-level styles
  components/
    Shell.tsx               Main app shell and toolbar
    Sidebar.tsx             Collection tree, drag-and-drop, navigation
    TocSidebar.tsx          Right-side outline with scroll spy
    SpotlightSearch.tsx     Lazy-mounted search UI
    LazyMarkdown.tsx        Lazy markdown editor and viewer wrappers
    CodeBlock.tsx           Code rendering and Mermaid detection
    MermaidBlock.tsx        Theme-aware Mermaid renderer
    LandingDemoFrame.tsx    Responsive screenshot frame for the landing page
    DemoBanner.tsx          Demo-mode banner shown above the shell
    dialogs.tsx             Create, rename, confirm dialogs
    dialogs-lazy.ts         Lazy dialog entrypoints and prefetch helpers
    EditorWithLineNumbers.tsx
    NotFoundCard.tsx
  pages/
    Landing.tsx             Public marketing page at `/`
    Home.tsx                In-app home screen for signed-in and demo users
    NoteView.tsx            Render a note
    NoteEdit.tsx            Edit a note
    CollectionView.tsx      Render a collection
    Recent.tsx
    Starred.tsx
    Trash.tsx
    Profile.tsx
    Settings.tsx
    Login.tsx
  lib/
    auth.tsx                Auth provider and session/profile state
    data-mode.tsx           Repo selection and mode-aware hooks
    repo.ts                 Repo interface
    notes.ts                Supabase-backed repo implementation
    supabase.ts             Supabase client
    profile.ts              Profile update helpers
    spotlight-bridge.ts     Deferred spotlight activation bridge
    inject-styles.ts        Inlines app styles
    hljs-theme.tsx          Highlight.js theme swapping
  store/
    mock-repo.ts            LocalStorage-backed repo implementation
  mock/
    data.ts                 Item types and seed data
supabase/
  schema.sql                Notes, profiles, RLS, and auth trigger schema
scripts/
  screenshot-landing.ts     Generates landing screenshots and WebP variants
public/
  landing/                  Generated landing screenshots
vite.config.ts              Vite + PWA config
index.html                  Pre-paint theme script, boot splash, preload logic
```

## Current status

What is live in the code today:

- `AuthProvider` is mounted
- login and signup UI exist
- the app supports both demo and real route trees
- the repo layer can use either local storage or Supabase
- profile and settings pages are routed
- the landing page, shell, markdown, Mermaid, TOC, and PWA flow are all wired

What to know before treating it like a production SaaS:

- without Supabase env vars, both trees run on local data only
- the demo tree always uses local mock data by design
- drag and drop changes `parentId`, not sibling ordering
- Trash retention text exists, but there is no scheduled 30-day purge job
- the real backend path is intended for personal-scale usage and still has room for hardening

## Environment variables

Supabase is optional. To enable the real authenticated workspace, set:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Without these variables, the app still runs using the mock repo.

## Deployment

This is a static Vite app, so deployment is straightforward.

Recommended frontend target:
- build command: `npm run build`
- output directory: `dist`

Good free hosting options:
- Cloudflare Pages
- Vercel
- Netlify

If you want authenticated sync, pair the frontend with a Supabase project and apply `supabase/schema.sql`.

## Notes for contributors

- Use `useItems()`, `useRepo()`, and `useModePath()` from `src/lib/data-mode.tsx` instead of reaching into a repo implementation directly.
- Keep route-building mode-aware so shared components work under both `/` and `/demo`.
- Be careful with bundle size on the landing path. The app intentionally lazy-loads shell, markdown, dialogs, and Supabase-backed data code.
- If you change landing screenshots, keep `index.html` preload settings and `LandingDemoFrame.tsx` image sources in sync.
