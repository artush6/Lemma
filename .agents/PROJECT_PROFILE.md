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

Use `--r-sm: 4px`, `--r-md: 6px`, `--r-lg: 10px`, `--shadow-pop` and surface-specific variables. UI/document default native system sans; JetBrains Mono remains available via Google Fonts, while Monaco uses native monospace; document default 16px / 1.65 from Preferences. Explicit Serif/Mono choices remain available. Default sidebar width 244px, comfortable density, document margin 20mm. Values are existing defaults, not a complete design scale.

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

## Workspace spacing correction — 2026-10-15

The editor topbar is 68px tall to align breadcrumbs with the sidebar brand. Horizontal A4 documents use automatic flex margins in the scroll viewport: sheets center vertically when they fit and start at the normal gutter when they overflow, keeping the full strip reachable. Printable sheet measurements are unchanged. Sidebar note icons retain a fixed 16px width with an 8px label gap; only the title flexes and truncates.

Folder views group back navigation, title/count and existing actions in the header, skip empty folder grids, and show an empty-folder message. The library now reuses the editor's sidebar open/collapse controls so narrow screens can reveal the content. No persistence, dependencies, routes or cloud behavior changed. Browser checks used the actual Editor with synthetic local recovery notes and a browser-intercepted null Supabase client; cloud/auth flows remain unverified. Desktop measurements confirmed brand/breadcrumb centers within 1px and reachable horizontal overflow; mobile folder layouts were inspected separately.

## Editing controls and motion — 2026-10-15

Equation popovers layer React text tokens beneath a native textarea for themed LaTeX highlighting. Search has accent focus rings, larger keycaps, roomier results and an overlay above the mobile sidebar. Slash search receives input focus; Escape returns focus to the editor. Graph options reuse shadcn Checkbox/Slider and preferences reuse Switch with Lemma tokens. Slider labels reach the focusable thumb.

Framer Motion 14.2.0 adds a 160ms opacity/translation entrance and exit to contents, disabled by useReducedMotion. Printable geometry and persisted formats are unchanged. Browser checks used synthetic local notes and a mocked Supabase module: desktop equation syntax/preview, slash filtering/Enter insertion, outline opening, graph checkbox and arrow-key slider interaction, and narrow dark search. Mobile equation positioning after resizing an offscreen horizontal-page anchor remains unverified. Cloud/auth/share, screen readers and print were not tested.

Validation: 15 unit tests, TypeScript and production build passed; formatting and diff checks passed. Core ported files retain ts-nocheck. Targeted lint reports 13 existing errors and 10 warnings (typing, hooks and refresh exports). Screenshots are in output/playwright/polish-*.png.

Follow-up scope completion: sidebar shortcuts now open search, search has explicit Close/Open actions, arrow-key result navigation, a Tab focus loop and empty-result feedback. Comfortable navigation, toolbar and block-menu targets use 36–40px sizing. The contents panel keeps keyboard focus when the pointer leaves, returns focus to its rail on Escape, and has a reduced-motion-aware hover response. Local browser checks confirmed search shortcut activation, arrow navigation, Escape and mobile empty-result layout; these are synthetic local-fixture checks. The original mobile-equation verification limitation remains.

## Documents and math workspace — 2026-10-20

Notes now support movable block controls, two/three-column layouts, attachments and a read-only reference pane. Library/folder import creates a note containing the file. PDFs accept up to 5 MiB; supported text/LaTeX/Markdown/CSV and Office files accept up to 2 MiB. PDF/text previews use validated data and revocable Blob URLs; Office files download externally. Files stay in existing note JSON, including history/share flows; no database migration, bucket or external embed provider was added. Image/graph dimensions persist in node attributes. Columns stack on mobile; Mod-Enter continues below them.

The shared icon renderer supports over 100 searchable Lucide icons with palette colors encoded in the existing string field; emoji remain supported. Ordered/nested list markers are explicit and A4 margins/gaps have crisp boundaries. Equation input highlights paired brackets and unmatched delimiters, with vertical compact resizing and an expanded source/preview dialog. Graphs support long scalar LaTeX, multi-row paste, definitions and shifted calls. Plotting uses the same compiled mathjs evaluator as validation.

Export opens a PDF/LaTeX dialog. Lazy dependencies: html2canvas 1.4.1 and jsPDF 4.2.1. PDF directly downloads rasterized A4 pages with equations, graphs and manual breaks; text is not selectable/searchable and attached PDFs are not merged. LaTeX exports source formatting/equations/lists/columns, with descriptions/expressions for media; LuaLaTeX/XeLaTeX compilation remains unverified.

Large owner-scoped drafts overflow into IndexedDB (`lemma-large-drafts`, version 1, `drafts`) with the existing keys. Writes/removals are queued; memory fallback and storage-error feedback handle unavailable storage. Browser quotas still apply. Loaded notes start fresh Undo history, and canonical-content tracking avoids resets from page-break defaults after edits.

See `docs/engineering/WORKSPACE_VERIFICATION.md` for checks and limits. Browser tests used synthetic local notes with a mocked Supabase module: exact 5 MiB PDF preview/recovery, 7 MiB overflow recovery/removal, icon search/color, nested markers, expanded equations, and the graph example/shifted curve. Cloud/auth/share, live authorization, screen readers and deployment remain unverified.

## Lovable workspace integration — 2026-10-22

Branch `codex/lovable-ui-flashcards` integrates Home, Code Lab and Flashcards from the supplied Lovable export into the current Editor. Workspace query `?space=code|cards` retains note/page links; shared notes remain Notes. Code Lab/Flashcards are lazy-loaded. Existing note repository, recovery, pagination, graph/equation/block/attachment/reference/export modules remain in place. No SQL or note-format migration was introduced.

Code Lab adds `@monaco-editor/react` 4.7.0 (manifest range, locked resolution) and device-scoped snippets/datasets/folders. Monaco loads from jsDelivr, Python loads Pyodide from jsDelivr and executes in a fresh disposable worker; JavaScript uses disposable workers. C++ uses a POST server function with `requireSupabaseAuth`, input limits and a 20-second outgoing request timeout, forwarding source/selected stdin to Compiler Explorer. Live auth/compiler behavior is unverified. Code Lab has local JSON export and temporary PDF viewing. Flashcards support decks/cards, multiline and KaTeX content, validated text/JSON import, export and spaced-repetition study with keyboard grading. Both workspaces store per-account localStorage data and report storage failures; they do not sync to Supabase.

Design follows the export's final monochrome palette, Nunito Sans controls, STIX Two Text mathematics and JetBrains Mono code. A 52px navigation band sits outside printable geometry; mobile sidebar controls start below it, narrow notes initialize with sidebar closed, and mobile note actions get their own row. Existing preference choices are retained. Home activity is explicitly a snapshot of latest note edits rather than a full activity history.

Validation: 40 tests / 9 files, TypeScript, targeted new-module lint and production build passed. Editor lint remains at the baseline 15 errors / 2 warnings. Full-app browser checks used a browser-only null Supabase module and synthetic local notes; flashcard add/edit/import/export/deck delete/study/reload, JavaScript execution, note switching/typing/search/equation opening and desktop/mobile light/dark/reduced-motion surfaces were exercised. Desktop A4 measured 793.6875px; mobile page overflow was absent at 390px; settled single-character typing kept scrollTop at 2863px. Live cloud/auth/share/history, deployed authorization, C++, screen readers and print/export after typography changes remain unverified. See `docs/engineering/LOVABLE_WORKSPACE_INTEGRATION.md` and the data inventory for details.

## Code themes, semantic feedback and changelog — 2026-10-22

Code Lab now has coordinated light/deep-slate dark Monaco themes, colored syntax/diagnostics, bracket/indentation guides and Find/JavaScript Format/Wrap actions. Code Lab and Flashcards share an accessible shortcut guide with a `?` trigger outside editable fields/dialogs. JavaScript warnings retain their own ephemeral log kind; run feedback distinguishes success, warning, error and timeout instead of marking all completions alike. Run hints adapt the main modifier key for the platform.

Semantic CSS tokens use red for errors/Again, orange for warnings/Hard/local-offline state, green for success/Good/Easy and blue for information/running state, with separate dark/light colors and accompanying labels/icons. Graph legend swatches match the existing curve palette. These are intentional exceptions to the prior monochrome feedback layer. No dependencies, storage formats, pagination geometry or scheduling behavior changed.

Root `AGENTS.md` now requires all repository agents to maintain `changelog/` entries for significant or complex changes in the same branch/change before commit/PR. `changelog/README.md` is the index/writing guide; entries cover this follow-up and retrospectively document the earlier Lovable integration. This is repository policy, not a global agent installation.

Validation: 42 tests in 10 files, TypeScript, targeted lint and production build passed. Full-app browser checks used a browser-only Supabase stub with synthetic local data: theme/feedback variants, JavaScript success/warning/error, Run shortcut, format/find/wrap actions, shortcut dialog, flashcard grading and narrow/reduced-motion views. The 390px view had no page overflow. Monaco emitted a Find-widget focus/aria-hidden warning; screen-reader conformance is unverified. Desktop editing controls and wrapping through edits were verified; mobile touch editing was not tested. Live cloud/auth/share, Python/C++ execution for this follow-up, print/export and deployment remain unverified. See `changelog/2026-10-22-code-themes-and-changelog.md`.

## Editor interactions and flexible references — 2026-10-22

The current UI uses native system sans, larger auth/Continue controls, distinct paper/desk tokens in both themes and short Framer Motion entrances/hover/press/answer-reveal interactions with reduced-motion hooks. Google Fonts retains only JetBrains Mono. The hard-coded black A4 background override is removed in favor of shared tokens, preserving sheet/gap geometry. Monaco Find controls have scoped sizing overrides and native monospace. The contents rail is always available when headings exist; the topbar outline toggle is removed.

Block controls have searchable actions and a single expandable Turn into submenu. A floating text-selection toolbar preserves selection. Slash insertion intercepts before native text input, focuses without scrolling and starts at the top. Columns insert with the caret in the first cell; Mod+Alt+7/8 creates two/three columns and Mod+Alt+Left/Right jumps between columns. LaTeX source keeps lone backslashes visible, suggests commands immediately, maps placeholder ranges through edits and uses pre-paint selection when inserting snippets. Tab/Shift+Tab also traverses hand-written brace arguments.

Notes use a shared upload/link picker and file drop insertion with transaction-mapped selection bookmarks. Existing attachment formats/limits remain (5 MiB PDF, 2 MiB images/other supported documents), with additive support for explicit HTTPS PDF links; external previews disclose direct provider connections and suppress iframe referrers. Reference notes use the shared styled selector, hidden while a PDF is open. Notes and Code Lab PDF panes offer left/right docking and independent windows. A detached local PDF owns its Blob URL in the new window; closing its dock does not revoke that file. Placement is transient; no SQL/schema migration or new service was added. See `changelog/2026-10-22-editor-interactions-and-reading.md` for examples, source references, verification and limits.

Validation for this update: 50 tests in 11 files, TypeScript and production build passed. Changed-file formatting/diff checks passed. Targeted new/typed module lint has no errors and four Fast Refresh export warnings. Full-source lint has 33 errors/23 warnings; the modified legacy Editor/nodes/AuthScreen files retain their HEAD error counts (15/4/1). Whole-repository lint was stopped because generated build output is also traversed. Browser-only synthetic-note checks exercised selection/caret preservation, column insertion/navigation, fast LaTeX snippets and lone-backslash suggestions, PDF/image upload/drop, styled reference selection, dock placement/detached Blob lifecycle, Monaco Find, flashcard reveal/grading and 390px/reduced-motion layouts. No page overflow was found at 390px. Native PDF page rendering is not supported by this automated browser; bytes/iframe/window lifetime were checked. Monaco's existing focus/aria-hidden warning persists on closing Find. Live auth/cloud/share/history, screen readers, print/export and deployment were not verified.

## Block action flyouts — 2026-10-22

BlockControls now uses installed Radix dropdown primitives with workspace-contained portals. Turn into and Color are separate collision-aware desktop flyouts; at 560px and below they use viewport-inset panels with Back rows. Compact grouped actions retain native grip dragging and show block statistics in a footer. Conversion search directly exposes text/headings/lists/code/quote commands, with current-type icons/checkmarks. No persistence, dependency, route, auth or A4 geometry changes. Browser verification used an isolated TipTap fixture with production controls/CSS; full workspace/live services and physical touch remain unverified. See `changelog/2026-10-22-block-action-flyouts.md` for checks, usage and rollback.
