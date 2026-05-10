// Domain type used everywhere. The mock store seeds itself with the items
// below; in the real (Supabase) app this seed is never used because the repo
// is `supabaseRepo`, not `mockRepo`.
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

const now = new Date().toISOString();

// ─── Demo seed ────────────────────────────────────────────────────────────
// These are the notes a visitor sees when they open /demo (or run the app
// without Supabase configured). The set is intentionally rich: it exercises
// every renderer feature — headings, lists, GFM tables, task lists, blockquote,
// code with syntax highlighting, mermaid diagrams, links, bold/italic, nested
// collections, starred notes — so a curious visitor can scan around and see
// what the app can do without writing anything themselves.

export const seedItems: Item[] = [
  // ── Collections ────────────────────────────────────────────────────────
  {
    id: 'c-welcome',
    parentId: null,
    title: 'Start here',
    icon: '👋',
    isFolder: true,
    updatedAt: now,
    content: '',
  },
  {
    id: 'c-work',
    parentId: null,
    title: 'Work',
    icon: '💼',
    isFolder: true,
    updatedAt: now,
    content: '',
  },
  {
    id: 'c-personal',
    parentId: null,
    title: 'Personal',
    icon: '🌱',
    isFolder: true,
    updatedAt: now,
    content: '',
  },
  {
    id: 'c-recipes',
    parentId: null,
    title: 'Recipes',
    icon: '🍳',
    isFolder: true,
    updatedAt: now,
    content: '',
  },
  {
    id: 'c-projx',
    parentId: 'c-work',
    title: 'Project X',
    icon: '📦',
    isFolder: true,
    updatedAt: now,
    content: '',
  },

  // ── Welcome / Start here ───────────────────────────────────────────────
  {
    id: 'n-welcome',
    parentId: 'c-welcome',
    title: 'Welcome to the demo',
    icon: '👋',
    isFolder: false,
    starred: true,
    updatedAt: now,
    content: `# Welcome to the demo

This is a working copy of the Notes app, running entirely in your browser.
Your changes here are stored in **localStorage only** — nothing is sent to a
server. Sign up to keep your notes synced across devices.

## What's interesting in here

- **Markdown rendering** — see _Markdown cheatsheet_ for everything supported.
- **Mermaid diagrams** — flowcharts, sequence diagrams, etc. Open _Mermaid examples_.
- **Syntax highlighting** — fenced code blocks colorize automatically.
- **Nested collections + drag-and-drop** — try dragging this note onto another
  collection in the sidebar.
- **Read mode** — top-right toolbar; collapses sidebars for distraction-free reading.
- **Outline (right side)** — generated from your headings, scroll-spies as you read.
- **Search** — \`⌘K\` / \`Ctrl+K\` opens a quick switcher.

## Quick tour

1. Open **Markdown cheatsheet** to see all the formatting that's supported.
2. Open **Mermaid examples** to see live diagrams.
3. Open **Q2 Roadmap** under Work — a real-looking note with code, lists, and a table.
4. Click the ✏️ icon on any note to enter the editor and try writing your own.
5. Click \`+\` in the sidebar to create a new note in this demo workspace.

> Tip: nothing here is precious. Edit, delete, drag around — break it freely.
`,
  },

  {
    id: 'n-cheatsheet',
    parentId: 'c-welcome',
    title: 'Markdown cheatsheet',
    icon: '📋',
    isFolder: false,
    updatedAt: now,
    content: `# Markdown cheatsheet

## Headings

\`\`\`
# H1   ## H2   ### H3   #### H4
\`\`\`

## Inline

**Bold**, _italic_, ~~strikethrough~~, \`inline code\`, and [a link](https://example.com).

## Lists

- Apples
- Pears
  - Bartlett
  - Anjou
- Plums

1. Wash
2. Dry
3. Slice

### Task list

- [x] Wire auth
- [x] Wire CRUD
- [ ] Wire sharing
- [ ] Mobile polish

## Quote

> Make it work. Make it right. Make it fast.
> — Kent Beck

## Code

Inline: \`const ship = () => "🚀";\`

\`\`\`ts
type Item = {
  id: string;
  title: string;
  isFolder: boolean;
};

function buildTree(items: Item[]): Item[] {
  return items.filter((i) => !i.isFolder);
}
\`\`\`

\`\`\`python
def fib(n: int) -> int:
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
\`\`\`

## Table

| Feature                | Demo | Real |
|------------------------|:----:|:----:|
| Markdown rendering     |  ✅  |  ✅  |
| Mermaid                |  ✅  |  ✅  |
| Syntax highlighting    |  ✅  |  ✅  |
| Sync across devices    |  ❌  |  ✅  |
| Persistent across browsers | ❌ | ✅ |

## Horizontal rule

---

That's it.
`,
  },

  {
    id: 'n-mermaid',
    parentId: 'c-welcome',
    title: 'Mermaid examples',
    icon: '📊',
    isFolder: false,
    updatedAt: now,
    content: `# Mermaid examples

Three different diagram types, all live-rendered.

## Flowchart

\`\`\`mermaid
flowchart TD
  A[User clicks +] --> B{Form valid?}
  B -- yes --> C[repo.create]
  B -- no  --> D[Show error]
  C --> E[Optimistic local insert]
  E --> F[Async POST to Supabase]
  F -->|ok| G[Reconcile cache]
  F -->|err| H[Rollback + toast]
\`\`\`

## Sequence diagram

\`\`\`mermaid
sequenceDiagram
  participant User
  participant App
  participant Supabase
  User->>App: Type new note
  User->>App: Click "Create Note"
  App->>App: Optimistic insert
  App->>Supabase: INSERT notes
  Supabase-->>App: row { id, created_at }
  App->>App: Reconcile cache
  App-->>User: "Note saved"
\`\`\`

## Gantt

\`\`\`mermaid
gantt
  dateFormat  YYYY-MM-DD
  title       Q2 Roadmap
  section Build
  Auth + CRUD     :a1, 2026-04-01, 14d
  Sharing         :a2, after a1, 14d
  Mobile polish   :a3, after a2, 14d
\`\`\`
`,
  },

  // ── Work ───────────────────────────────────────────────────────────────
  {
    id: 'n-roadmap',
    parentId: 'c-work',
    title: 'Q2 Roadmap',
    icon: '🗺️',
    isFolder: false,
    starred: true,
    updatedAt: now,
    content: `# Q2 Roadmap

## Goals

- Ship the notes PWA to **10 beta users**
- Collect structured feedback (what / why / would-you-recommend)
- Decide whether to invest further or pivot

## Milestones

| Month | Theme            | Status      |
|-------|------------------|-------------|
| April | Auth + CRUD      | ✅ done     |
| May   | Sharing          | 🟡 in flight |
| June  | Mobile polish    | ⚪ not started |

## Stretch

- [ ] Import from Notion
- [ ] Realtime collaborative editing
- [ ] Folder sharing with read-only links

## Sample code

\`\`\`ts
const ship = () => "🚀";
\`\`\`
`,
  },
  {
    id: 'n-meeting',
    parentId: 'c-work',
    title: 'Meeting notes — kickoff',
    icon: '📝',
    isFolder: false,
    updatedAt: now,
    content: `# Kickoff meeting

**Date:** April 1
**Attendees:** Amit, Sam, Priya

## Decisions

- Use **Supabase** for auth + Postgres
- **Mantine** for UI
- Ship to TestFlight-equivalent (web PWA install) by end of April

## Action items

- [ ] Amit — set up CI
- [ ] Sam — wire auth
- [ ] Priya — landing page copy

## Notes

> "Don't over-design the data model. We can always add columns."

Next sync: **next Monday, 10am**.
`,
  },
  {
    id: 'n-projx-spec',
    parentId: 'c-projx',
    title: 'Spec',
    icon: '📄',
    isFolder: false,
    updatedAt: now,
    content: `# Project X — spec

## Problem

Users keep losing notes across devices.

## Approach

A small markdown PWA with browser-local storage by default and optional cloud
sync via Supabase.

## Architecture

\`\`\`mermaid
flowchart LR
  Browser -- localStorage --> MockRepo
  Browser -- HTTPS --> Supabase
  MockRepo & Supabase --> UI[React UI]
\`\`\`

## Out of scope

- Real-time collaboration
- Mobile native apps
`,
  },

  // ── Personal ───────────────────────────────────────────────────────────
  {
    id: 'n-reading',
    parentId: 'c-personal',
    title: 'Reading list',
    icon: '📚',
    isFolder: false,
    starred: true,
    updatedAt: now,
    content: `# Reading list

## In progress

- [ ] _Designing Data-Intensive Applications_ — Martin Kleppmann
- [ ] _The Pragmatic Programmer_ — Hunt & Thomas

## Done

- [x] _Refactoring_ — Martin Fowler
- [x] _A Philosophy of Software Design_ — John Ousterhout

## Wishlist

- _Crafting Interpreters_ — Robert Nystrom
- _Designing Web APIs_ — Brenda Jin et al.

> _Refactoring_ was excellent — most actionable software book I've read.
`,
  },
  {
    id: 'n-travel',
    parentId: 'c-personal',
    title: 'Travel ideas',
    icon: '🌍',
    isFolder: false,
    updatedAt: now,
    content: `# Travel ideas

## Short list

| Place           | When        | Why                          |
|-----------------|-------------|------------------------------|
| Kyoto, Japan    | Spring '27  | Temples, ramen, slow walks   |
| Lisbon          | Late summer | Food, ocean, low cost        |
| Patagonia       | Nov–Mar     | Hiking before peak crowds    |

## Notes

- Avoid August in Europe — too hot, too crowded.
- Prefer trips where I can _walk a lot_.
- Keep luggage carry-on only.
`,
  },

  // ── Recipes ────────────────────────────────────────────────────────────
  {
    id: 'n-ramen',
    parentId: 'c-recipes',
    title: 'Ramen broth',
    icon: '🍜',
    isFolder: false,
    updatedAt: now,
    content: `# Tonkotsu ramen broth

A weekend project. Plan for **8–10 hours**.

## Ingredients

- 2 kg pork bones (mix of femur + neck)
- 1 onion, halved
- 1 head of garlic, halved across
- A 5cm piece of fresh ginger
- 20g kombu
- Cold water to cover

## Steps

1. **Blanch** the bones — bring to a boil from cold water, drain, scrub clean.
2. Return bones to a clean pot, cover with cold water again.
3. Add onion, garlic, ginger.
4. Simmer at a **rolling boil** for 8 hours, topping up water as needed.
5. In the last 30 min, **off the heat**, add kombu. Steep, then remove.
6. Strain through cheesecloth.

## Tips

> The harder the boil, the whiter the broth. Don't be gentle.

- Skim the surface during the first hour.
- Save the cooked-down meat for chashu.
`,
  },
  {
    id: 'n-carbonara',
    parentId: 'c-recipes',
    title: 'Pasta carbonara',
    icon: '🍝',
    isFolder: false,
    updatedAt: now,
    content: `# Spaghetti alla carbonara

The real one — no cream, no garlic, no peas.

## Serves 2

- 200g spaghetti (or rigatoni)
- 100g guanciale, cut into batons
- 2 whole eggs + 1 yolk
- 60g pecorino romano, finely grated
- Black pepper, lots
- Salt for the pasta water

## Method

1. Boil pasta in well-salted water until al dente.
2. Render guanciale in a dry pan over medium-low heat until crisp.
3. Whisk eggs, pecorino, and a generous amount of pepper in a bowl.
4. Reserve **1 cup pasta water**, drain pasta.
5. Off heat, toss pasta with guanciale, then add the egg mixture, splashing
   pasta water as you go to make a glossy sauce.
6. Plate, more pecorino, more pepper.

## Common mistakes

- Adding cream — no.
- Cooking the eggs into a scramble — keep the pan **off** the heat.
- Skimping on pepper — it's a primary flavor.
`,
  },
];
