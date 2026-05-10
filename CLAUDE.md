# Notes App — Claude entry point

Project docs live in `docs/`. Read these when working in this repo:

- @docs/SKILL.md — conventions, file map, common-task recipes, gotchas
- @docs/ARCHITECTURE.md — big-picture diagrams, lazy-load strategy, data model, repo abstraction, theming, PWA config

Quick orientation:

- React 19 + Vite 6 + Mantine v7 + Supabase + react-router v7. Markdown via `@uiw/react-md-editor/nohighlight`.
- Two parallel route trees in `src/App.tsx`: `/` (real, gated by `RealRoot` + auth) and `/demo` (public, always `mockRepo`).
- Components acquire a `Repo` via `useRepo()` / `useItems()` from `src/lib/data-mode.tsx`. **Never** static-import `mockRepo` or `supabaseRepo` from a UI component.
- Always build internal links via `useModePath()` so they work in both real and demo trees.
- Supabase client + `supabaseRepo` are dynamic-imported. Don't add a static `import` from `./supabase` or `./notes` to the entry path.

Build / scripts:

- `npm run dev` — Vite dev server (HTTPS via `basicSsl()`).
- `npm run build` — `tsc -b && vite build`.
- `npm run screenshots` — regenerates `public/landing/screenshot-*.{webp,png}` (Playwright + Sharp).
