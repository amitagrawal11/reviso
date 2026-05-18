# Notes App — Claude entry point

Project docs live in `docs/`. Read these when working in this repo:

- @docs/SKILL.md — conventions, file map, common-task recipes, gotchas
- @docs/ARCHITECTURE.md — big-picture diagrams, lazy-load strategy, data model, repo abstraction, theming, PWA config

Quick orientation:

- React 19 + Vite 6 + Mantine v7 + Supabase + react-router v7. Markdown via `@uiw/react-md-editor/nohighlight`.
- Source is organized by **feature folder** under `src/features/` (`notes/`, `authentication/`, `command-palette/`, `landing-page/`), with cross-feature primitives in `src/shared/` and the route + entry point in `src/app/`.
- Two parallel route trees in `src/app/App.tsx`: `/` (real, gated by `RealRoot` + auth) and `/demo` (public, always `mockRepo`).
- Components acquire a `Repo` via `useRepo()` / `useItems()` from `@/features/notes/repository/NoteRepositoryContext`. **Never** static-import `noteRepositoryMock` or `noteRepositorySupabase` from a UI component.
- Always build internal links via `useModePath()` so they work in both real and demo trees.
- Supabase client + `noteRepositorySupabase` are dynamic-imported. Don't add a static `import` from `@/features/authentication/api/SupabaseClient` or `@/features/notes/repository/NoteRepositorySupabase` to the entry path.
- File naming: PascalCase everywhere in `src/` (components, modules, hooks, contexts, types). Cross-feature imports use the `@/*` alias.

Build / scripts:

- `npm run dev` — Vite dev server (HTTPS via `basicSsl()`).
- `npm run build` — `tsc -b && vite build`.
- `npm run screenshots` — regenerates `public/landing/screenshot-*.{webp,png}` (Playwright + Sharp).
