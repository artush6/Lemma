# Lemma project profile

Inspected: 2026-10-14, current working tree. “Observed” means repository evidence, not production verification. Update this profile when architecture, dependencies, data handling or design decisions change. Complete unknowns from deployment/operator evidence rather than assumptions.

## Product and journeys

Lemma is a mathematical note workspace: “A calm writing space for mathematical thinking.” Auth copy targets CS study and lecture notes; actual audience/demographics are unknown. English UI/document language; sample content includes French. No localization system was found. Primary journeys: email-link or Google sign-in → library/folders → continuous editable note → local draft + cloud autosave → history/restore, read mode, token sharing/revocation and browser print-to-PDF. No separate guest auth implementation was found.

## Architecture and routes

- TanStack Start/React/Vite application ported from Next.js. `src/routes/index.tsx` renders Editor inside ClientOnly at `/`; browser-sensitive TipTap/graph imports must remain compatible with this setup.
- `src/routes/__root.tsx`: document shell, metadata/Google Fonts, Outlet, QueryClient provider, not-found/error UI. `src/router.tsx`: per-router QueryClient. Generated `src/routeTree.gen.ts` is not hand-edited.
- One registered page route, `/`. Workspace states use `?note=`, legacy `?page=`, `?mode=read`, and `?share=` with manual history.pushState/popstate in Editor. These are compatibility parameters, not separate routes.
- `src/components/editor/Editor.tsx` owns workspace/editor/auth/selection/recovery state; `src/lib/notes.ts` owns browser CRUD/history and note/page types. `document.ts` combines legacy pages with pageBreak nodes. `pagination.ts` measures A4. `nodes.tsx`, `graph.tsx`, `latex.ts`, `paste.ts` and current uncommitted `blocks.tsx` define rich content behavior.
- `Settings.tsx` defines version-1 Preferences, categorized General/Appearance/Editor/Document/Mathematics/Export/Shortcuts/Sync/Account. Preferences are device-local. Legacy theme/font/size keys are still read; do not remove without migration.
- `src/start.ts`: auth-token attachment for server functions, serverFn CSRF protection and error middleware. `src/server.ts`: SSR error wrapper. No application server functions/API routes consuming admin/auth/cron helpers were found. Middleware scaffolding is not evidence that browser CRUD runs server-side.

## Dependencies and tooling

Exact resolutions below come from `bun.lock`; package.json ranges may differ. Installed tests reported Vitest 4.1.11. The full manifest/lockfile remain authoritative.

| Concern                    | Recorded resolution             |
| -------------------------- | ------------------------------- |
| React / React DOM          | 19.2.8 / 19.2.8                 |
| TypeScript                 | 5.9.3                           |
| TanStack Start / Router    | 1.168.60 / 1.170.41             |
| Vite / Lovable Vite config | 8.1.5 / 2.25.2                  |
| Tailwind Vite plugin       | 4.3.3                           |
| TipTap editor extensions   | 3.31.4                          |
| Supabase JS                | 2.117.2                         |
| KaTeX / function-plot      | 0.19.0 / 1.25.4 (manifest pins) |
| Vitest                     | 4.1.11                          |

Other existing tools: Radix UI primitives, Lucide, CVA/clsx/tailwind-merge, React Query, mathjs, react-hook-form/Zod, Recharts, ESLint, Prettier, Drizzle/Postgres and Nitro. Presence does not prove active use. `@tiptap/extensions` is imported directly but not declared directly in package.json. Preserve matched TipTap versions when addressing this.

`vite.config.ts` uses `@lovable.dev/vite-tanstack-config`, which owns React/Start/Tailwind/Nitro/alias/env plugins. Do not duplicate them. `@/*` maps to `src/*`. TypeScript is strict but several ported core files use `@ts-nocheck`.

## Design system and accessibility

Canonical source is the effective cascade in `src/styles.css`, especially the “LEMMA v2” layer and later overrides. It is plain editor CSS alongside Tailwind/shared `src/components/ui` primitives. No Figma reference or formal spacing/type/motion scale was found. Do not assume the initial sage palette is current.

| Token                              | Light                       | Dark                        |
| ---------------------------------- | --------------------------- | --------------------------- |
| paper / surface                    | #ffffff / #ffffff           | #000 / #000                 |
| soft / hover / active              | #f7f7f5 / #efefed / #e8e8e6 | #0f0f0f / #1a1a1a / #222    |
| ink / ink-strong / muted           | #37352f / #191919 / #787774 | #e6e6e4 / #fff / #8f8f8c    |
| line / line-strong                 | #ebebea / #dcdcda           | #1c1c1c / #2a2a2a           |
| accent / accent-dark / accent-soft | #2383e2 / #1a6fc4 / #e7f1fb | #529cca / #7bb6dd / #0d2333 |

Use `--r-sm: 4px`, `--r-md: 6px`, `--r-lg: 10px`, `--shadow-pop` and surface-specific variables. UI font Inter; mono JetBrains Mono via Google Fonts; document default serif, 16px / 1.65 from Preferences. Default sidebar width 244px, comfortable density, document margin 20mm. Values are existing defaults, not a complete design scale.

Shared patterns: Button and Radix dialogs; NoteIcon across metadata/navigation; OrganizerItem, NoteList, DocHeader, BlockMenu and compact Outline. Graph controls portal into the workspace side-panel host; equations use anchored themed popovers. Do not reserve extra printable columns or place editing controls inside the canvas.

Existing motion: menuIn ~120–130ms, fadeIn ~150ms, slideIn ~200–220ms, theme transition ~200ms, auth equation drift 9s. These are literals, not shared motion tokens. CSS has global reduced-motion suppression plus a later toggle-specific rule. Inspect cascade, including later animations, before claiming complete coverage. Existing responsive rules include 650/680/700/760/850/900/1050/1100/1600px; these are historical breakpoints, not a proposed scale.

Keyboard/zoom/mobile/dark/reduced-motion and contrast need browser verification; no accessibility conformance level is established. Preserve visible focus and require labels/keyboard behavior on touched controls. Root error/404 utility tokens need rendered inspection for parity with Lemma styling.

## Persistence and security model

Supabase project reference in `supabase/config.toml`: `viynvpgrujoitnvlbtee` (non-secret configuration; live linkage unverified). SQL lives in `drizzle/migrations/0000_lemma_schema.sql` and `0001_tags_and_space_colors.sql`. `drizzle/schema.ts` is intentionally blank. Do not infer an empty database or generate drops from it. Drizzle migration credential name: `LOVABLE_DB_MIGRATION_URL`; migration deployment process is unverified.

Recorded `public` resources:

- `folders`: id/name/icon/parent_id/owner_id/created_at plus color. RLS restricts own rows and checks parent ownership; parent FK cascades deletes.
- `notes`: title, JSON content/pages, favorite, folder, icon, label/layout, owner, share token, timestamps plus tags. RLS restricts own rows and checks folder ownership; folder deletion sets note folder to null.
- `note_versions`: note/title/content/pages/time, ownership via referenced note. Authenticated select/insert; note deletion cascades history.
- `lemma_snapshot_note` trigger: privileged snapshot of old content/title/pages, throttled by two-minute recent-history check; updates timestamp. Empty search_path and revoked public execution in recorded SQL.
- `get_shared_note(p_token)`: SECURITY DEFINER, explicit anon/authenticated execution, matching non-null 36-character token, fixed public projection, limit 1. Token possession intentionally permits read; UI generates crypto.randomUUID and can revoke. No public share listing, team tenancy, payment/webhook or storage-bucket implementation was found.

Browser `repository` uses Supabase directly; RLS/grants are its server-enforced boundary. React read-only/auth guards are usability controls. Sessions persist/refresh with localStorage or Lovable preview broker. Future protected server functions should use `requireSupabaseAuth` and its user-scoped client; `attachSupabaseAuth` only forwards tokens. `client.server.ts` service-role helper bypasses RLS and has no application consumers found. `cron-auth.ts` is scaffolding, not an active cron endpoint.

Build injects only public URL/key names with compatibility fallbacks (`VITE_*`, `NEXT_PUBLIC_*`, unprefixed Supabase public names). Keep `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_DB_MIGRATION_URL` and cron secrets server-only. Environment values were not inspected or copied. Live exposed schemas, grants, providers/redirect allowlists, deployed migrations, advisors and anon/A/B access tests remain unverified.

## Personal data and operations

See `docs/engineering/DATA_INVENTORY.md`. Notes can contain arbitrary personal/sensitive content; no sensitive-data category is established. Owner-scoped drafts use `lemma:<owner>:note:<id>` and folder caches; preferences/theme/last note/demo keys are device-scoped. Successful matching saves remove note drafts. Signing out does not establish deletion of device recovery data. No formal retention schedule, full account export/deletion or support process was found. Browser printing is per-document output, not full account data export.

Source-observed services: Supabase auth/database, Lovable OAuth/preview auth and optional runtime error hooks, Google OAuth/Fonts; Vercel is the configured deployment target. Recharts etc. are libraries, not proven external processors. Production tracker behavior, vendor agreements, backups, regions/transfers, lawful bases and consent requirements are unknown. No dedicated analytics implementation was found; optional/injected telemetry prevents claiming no tracking. No public privacy/cookies/terms/legal/contact pages are registered.

## Checks, CI/CD and rollback

Scripts: dev, build, build:dev, preview, lint, format, format:check, test, test:watch. Typecheck has no package script; use the installed `tsc --noEmit`. Vitest uses jsdom, React plugin, alias and setup under `src/test`; current suite has 8 tests covering route matching, legacy boundaries and smart paste. No committed browser/RLS suite was found; untracked verification fixtures are another task's work.

Committed lockfile: `bun.lock`. Formatting CI installs Bun 1.3.14 with frozen lockfile on pushes/PRs. README gives npm development commands; this audit used installed dependencies via npm scripts without generating another lockfile. No CI test/type/build jobs are active.

`vercel.json` selects tanstack-start; Nitro preset vercel in Vite config. README describes existing Vercel GitHub integration; Lovable sync is documented in AGENTS. Actual production branch/domain/region/deployment status, preview separation and rollback mechanics are unknown. Prefer corrective commits/redeployment of known-good code; never rewrite published Lovable history. Database rollback requires a reviewed data-safe plan and verified backup, not a Git revert assumption.

## Unknown facts requiring owner or live-system evidence

Legal entity, controller/contact/legal reviewer, jurisdictions, audience age, production branch/domain/regions, Supabase linkage/live policies, redirect configuration, tracker inventory, retention, vendor DPAs/transfers, backup/restore and incident owner. These are explicitly unresolved; no legal compliance, security or release readiness certification is made. See the dated audit for executed commands and known baseline gaps.

## Editor import and canvas update — 2026-10-14

The editor import update adds H1–H6, nested Markdown lists/tasks, Notion aside callouts/icons, collapsible heading sections (`## >`), Markdown/HTML images and missing-image attachments. Image files are stored as data URLs in existing note JSON, capped at 2 MB per file; this does not establish a total note/browser-storage quota policy. Relative image references still require their exported files to be served at a reachable path. No storage bucket, new dependency, database migration or external embed service was added.

Device Preferences version 1 now includes `pageDirection` (vertical by default, horizontal optional in Document settings). Vertical pagination uses view-only spacers and keeps short callouts together; horizontal A4 sheets use CSS columns. Legacy explicit page breaks remain document nodes. The compact outline includes H4–H6 and tracks the visible section. Controls use existing Lemma surface/accent tokens and shared Button primitives.

The supplied long mathematics document was checked in an isolated local editor page with the actual TipTap blocks, SmartPaste and A4Pagination: 73 headings, 52 callouts and 36 missing-image placeholders imported. Vertical/horizontal switching, typed and pasted toggle headings, collapsing sections, outline opening and image attachment were exercised in the browser, including light/dark and narrow-width inspection. Full authenticated app and cloud save/share testing remain unverified because this checkout lacks Supabase environment configuration. Temporary public verification files are removed after inspection; the editor screenshot is under `output/playwright/verified-editor.png`.

## Pagination and workspace polish — 2026-10-14

Oversized code blocks and paragraphs now paginate at rendered line starts using view-only spacer decorations. Coordinate searches find wrapped line starts without measuring every character; existing spacer heights are subtracted on repeat measurement. Stored document JSON and legacy boundaries are unchanged. Code blocks use neutral text and wrapped long lines; horizontal columns can fragment code blocks instead of treating scroll containers as indivisible.

Sidebar controls share 16px icons, 10px inner gutters and 34px navigation/search rows. Brand, search and folder-section spacing is tightened; breadcrumbs use aligned 30px controls. The outline remains 12px from the right and is vertically centered in the workspace, with its popover centered alongside it. Motion tokens are `--motion-fast: 140ms`, `--motion-panel: 180ms`, and `--motion-ease: cubic-bezier(0.2, 0, 0, 1)` for color feedback, 1px icon hover lift, press feedback and outline reveal. Reduced-motion CSS disables animations/transitions and icon movement; OS-level reduced-motion emulation was not run.

An isolated browser fixture using the actual pagination, outline, Button and CSS checked long code/prose: 454 desktop text lines and 663 lines at a narrower viewport had no text intersecting A4 margins/gaps. Light/dark, horizontal fragmentation and outline opening/Escape were inspected. The full authenticated app remains blocked by missing local Supabase variables; cloud save/share and print output were not tested. Temporary fixture files are removed before the final build; `output/playwright/ui-polish-pagination.png` records a sheet transition. Three regression tests cover paragraph/code line clearance, stable repeat measurement, unchanged content, and bypassing vertical spacers in horizontal/continuous layouts.

Follow-up margin correction: the vertical sheet overlay now paints the paper color across each top/bottom page margin, then the desk color across the inter-sheet gap. This prevents tall code/callout backgrounds from visually filling reserved page padding. The active-sheet footer sits above that overlay. Browser inspection confirmed white margins around the code continuation; the saved transition screenshot was replaced with a clean fixture view without test controls.
