# Reviso Notes

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

| Concern         | Choice                                                              |
| --------------- | ------------------------------------------------------------------- |
| Framework       | React 19 + TypeScript                                               |
| Build tool      | Vite 6                                                              |
| Routing         | `react-router-dom` v7                                               |
| UI              | Mantine v7                                                          |
| Icons           | `@tabler/icons-react`                                               |
| Markdown        | `@uiw/react-md-editor/nohighlight` + `remark-gfm` + `remark-breaks` |
| HTML transforms | `rehype-slug` + `rehype-autolink-headings` + `rehype-highlight`     |
| Diagrams        | `mermaid`                                                           |
| Drag and drop   | `@dnd-kit/core`                                                     |
| PWA             | `vite-plugin-pwa`                                                   |
| Auth and data   | Supabase (`@supabase/supabase-js`)                                  |
| Image pipeline  | Playwright + Sharp for landing screenshots                          |

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

`AuthProvider` (from `@/features/authentication/context/AuthContext`) is mounted in `src/app/main.tsx`. It tracks the active Supabase session, loads the current profile, and exposes auth state to the router and account-related pages.

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

The source is organized by **domain feature** under `src/features/`, with cross-feature primitives in `src/shared/` and the entry point + route table in `src/app/`. Cross-feature imports use the `@/*` alias (mapped to `src/`).

```text
src/
  app/
    main.tsx                          Mantine, notifications, router, auth bootstrap
    App.tsx                           Route table for the real and demo trees
    AppLayout.tsx                     Three-column shell + header chrome
  features/
    notes/
      pages/                          HomePage, NoteViewPage, NoteEditPage, FolderPage,
                                      RecentNotesPage, StarredNotesPage, TrashPage
      sidebar/NotesSidebar.tsx        Collection tree + drag-and-drop + row menus + account
      editor/
        NoteEditor.tsx                Editor pane with synced line-number gutter
        NoteEditorLineGutter.tsx      Gutter sub-component
        MarkdownEditor.tsx            Lazy markdown editor wrapper
      viewer/
        MarkdownViewer.tsx            Lazy markdown viewer wrapper
        NoteTableOfContents.tsx       Right-side outline with scroll spy
        CodeBlockRenderer.tsx         Code rendering + Mermaid detection
        MermaidDiagramRenderer.tsx    Theme-aware Mermaid renderer
        NoteNotFoundCard.tsx          404 fallback
      dialogs/
        NotesDialogs.ts               Lazy dialog entrypoints + prefetch
        NotesDialogsImpl.tsx          Create / rename / confirm dialog implementations
      quick-capture/                  NoteQuickCaptureButton + Preview + intent module
      repository/
        NoteRepositoryTypes.ts        Repo interface + Item type
        NoteRepositoryMock.ts         LocalStorage-backed repo
        NoteRepositorySupabase.ts     Supabase-backed repo (optimistic, realtime)
        NoteRepositoryContext.tsx     DataModeProvider + useRepo / useItems / useModePath
    authentication/
      pages/                          SignInPage, UserProfilePage, SettingsPage
      modal/SignInModal.tsx           Embedded sign-in modal
      context/AuthContext.tsx         AuthProvider + useAuth
      api/                            SupabaseClient, UserProfileApi, ImportLocalNotes
    command-palette/
      CommandPaletteSearch.tsx        Lazy-mounted ⌘K search UI
      CommandPaletteIntent.ts         Deferred-activation bridge
    landing-page/
      LandingPage.tsx                 Public marketing page at `/`
      LandingPageDemoPreview.tsx      Responsive screenshot frame
  shared/
    components/                       ItemIcon, BrandLogo, AdaptiveDialog,
                                      DemoModeBanner, MobileBottomNavigationBar,
                                      PwaInstallPrompt, OfflineStatusIndicator
    hooks/UseViewport.ts              Responsive breakpoint hook
    lib/                              UserPreferences, DesignTokens,
                                      CodeHighlightTheme, InjectAppStyles, I18n
  mock/SeedData.ts                    Item types + seed items
  styles.css                          Theme tokens and app-level styles
  test/                               Vitest setup, supabase mock, render helper
supabase/schema.sql                   Notes, profiles, RLS, and auth trigger schema
scripts/screenshot-landing.ts         Generates landing screenshots + WebP variants
public/landing/                       Generated landing screenshots
vite.config.ts                        Vite + PWA + @/* alias config
index.html                            Pre-paint theme script, boot splash, preload logic
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

- File naming: PascalCase for every source file under `src/` (components, modules, hooks, contexts, types). Filename matches the primary export.
- Cross-feature imports: use the `@/*` alias (e.g. `import { useAuth } from '@/features/authentication/context/AuthContext'`). Within-feature imports may stay relative.
- Use `useItems()`, `useRepo()`, and `useModePath()` from `@/features/notes/repository/NoteRepositoryContext` instead of reaching into a repo implementation directly.
- Keep route-building mode-aware so shared components work under both `/` and `/demo`.
- Be careful with bundle size on the landing path. The app intentionally lazy-loads `AppLayout`, the markdown editor + viewer, dialogs, the command palette, and Supabase-backed data code.
- If you change landing screenshots, keep `index.html` preload settings and `LandingPageDemoPreview.tsx` image sources in sync.
