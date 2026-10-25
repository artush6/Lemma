# Lemma changelog

One dated section per commit, newest first. Changes belonging to the same commit share a section, including their implementation, usage, compatibility, verification and rollback details. Update the section before committing; add an existing commit link when available. Do not create separate changelog files or fold later commits into an earlier section. Never invent tests, deployments, commit hashes or operational facts.

The older per-file entries below were consolidated by their actual commits. Their detailed evidence and historical limitations are retained. Git history remains the source of the exact diff.

<a id="repository-cleanup"></a>

## 2026-10-25 — Repository cleanup, branch inventory and maintenance checks

Removed 38 unreachable source modules after tracing routes, server entrypoints, tests, static/type imports and literal dynamic imports. This includes the unused NoteList, 34 unused UI wrappers, the orphaned mobile hook, and unused service-role/cron scaffolding. Active Supabase authentication, CSRF, recovery drafts, note/page/history/share formats, migrations, preview auth and server-function authorization stay intact. No SQL or live account action was performed.

Removed 27 unused direct dependencies and regenerated `bun.lock` with Bun 1.3.14. The lock graph drops from 809 to 753 records; no new package/version resolutions were introduced. The existing TipTap extension package is now declared directly at 3.31.4, matching the rest of TipTap. Build peer dependencies, Tailwind's CSS import, Drizzle tooling and the active Lovable build/auth integrations remain.

The README now describes Lemma's actual development, storage, checks, structure and Lovable integration. Removed the generic Lovable social attribution. Two generated screenshots are removed from Git tracking while their local files remain. The completed, unreferenced roadmap with an obsolete publishing task is retired; commit history and this changelog retain its feature record. Generated/legacy build output and local browser fixtures are excluded from lint/format checks, without disabling source rules. `.agents/` is retained because AGENTS and the capability map actively reference its engineering skills/workflows; migrations, public favicon/robots and generated route configuration are also retained. Historical CSS is not deleted based on a reference count because cascades and dynamic selectors need separate visual verification.

`npm run check:unused` checks that application source remains reachable from explicit framework/test roots and honors Git ignore rules. It reports candidates for review, not an automatic deletion list. A clean frozen dependency installation in a temporary directory prevents the old working node_modules from hiding missing dependencies.

Consolidated the eight dated changelog entries into this file under five actual commits, and changed repository instructions to require one section per commit. Existing details, checks and rollback guidance are preserved; links now target this file. This cleanup has one section and no new changelog folder.

The 2026-10-25 review retains the existing uncommitted cleanup and adds a [branch inventory](docs/engineering/BRANCHES.md). Most feature branches are already included in master. The old Next.js redesign branch has one unique commit containing UI work, auth-startup and graph-memory fixes plus browser harnesses; it remains preserved for selective comparison with current code. No branch deletion, commit, push or published-history rewrite was performed. Future work should use focused branches from current master rather than continuing stale feature snapshots.

The existing GitHub Actions workflow now sets Node 22 alongside Bun 1.3.14, installs the frozen lockfile, and checks formatting, source reachability, types, tests and build. `bun run typecheck` provides a named script for the existing compiler check. Build configuration uses dummy public Supabase values and requires no live credentials. Full lint remains an explicit local check with its known failures, rather than a failing new CI gate or weakened rules. README documents branch/dependency maintenance; dependency upgrades are deliberately separate from this removal-only package cleanup.

### Verification

- Clean install: Bun 1.3.14 `install --frozen-lockfile --ignore-scripts` succeeded in `/tmp/lemma-cleanup-verification` (595 packages installed). A lockfile comparison found no newly introduced package/version resolutions; removed transitive branches account for hoisting changes.
- Clean-install tests: `vitest run` passed **64 tests across 15 files**. `tsc --noEmit` and `vite build` passed from the same temporary checkout using Node 22.23.3 and dummy public Supabase build values. No live credentials/account data were copied into the temporary checkout. Existing bundle-size warnings remain. The first temporary run used the shell's unsupported Node 20.12.2; selecting the documented Node 22 runtime resolved that tool startup failure.
- `npm run check:unused`: passed; 97 source modules reachable from 22 framework/test roots. A temporary orphan-module probe correctly returned failure status 1; after removing the probe, the check returned success.
- `npm run format:check` and `git diff --check`: passed after updating the protected profile's existing formatting.
- `npm run lint` now completes without scanning generated output. It still reports **33 existing errors and 18 warnings** in surviving source (legacy no-check/any/empty-catch/hook findings); no rule was relaxed to manufacture a pass. New cleanup tooling and changed metadata pass focused lint.
- No visual application behavior was intentionally changed, and no new browser/live-auth/database/deployment verification is claimed for this cleanup.
- Rechecked on 2026-10-25 using Node 22.23.3 and installed dependencies: `npm test` passed 64 tests / 15 files; `npm run typecheck`, `npm run check:unused`, `npm run format:check`, `git diff --check` and the production build with dummy public Supabase values passed. `npm run lint` still reports 33 errors / 18 warnings. Bun is not on this session's PATH, so the earlier clean Bun-install result above was not repeated. The modified GitHub Actions workflow has not run remotely; local checks are not a hosted-CI or live-service claim.

### Rollback and limits

Restore removed modules and their matching package.json/bun.lock changes together, or use a new revert commit after publication. Restore documentation as a unit if undoing the consolidation. Never rewrite Lovable's published history. No production deployment, live auth/RLS test, or note-data migration is part of this cleanup. Ignored local artifacts and existing node_modules have been preserved. CSS consolidation and replacing Lovable would be separate migrations; neither is implied by dead-code removal.

The added workflow steps can be reverted independently with their README/profile references and the typecheck script. The branch inventory is a dated snapshot; refresh divergence counts before taking branch actions. Existing lint debt, old redesign regression coverage, live authorization and deployment checks remain separate follow-up work.

<a id="commit-20f50cf"></a>

## 2026-10-23 — Unified study workspace

Commit: [20f50cf](https://github.com/artush6/Lemma/commit/20f50cf).

### Unified tabs, pane menus and drag-to-split workspace

Date: 2026-10-23. Implementation prepared for master; deployment has not been verified.

#### What changed and why

Notes, PDFs/documents, Code Lab and Flashcards now open in one tabbed workspace. Previously, study tools replaced the notes workspace and references occupied a separate preview subsystem. The default is one pane; a second pane extends the same tab model. Notes can sit beside other editable notes, PDFs or study tools.

The global header has centered Notes / Code Lab / Flashcards navigation, one library/home action and a compact breadcrumb. Active notes expose an explicit Edit/Read dropdown, Focus, save state, Share and an overflow menu. The extra title/tag/folder strip and permanent format ribbon are hidden in this shell. Rename via the breadcrumb or overflow; export, history, favorites, settings and optional note-sidebar access remain available. Contextual formatting, slash commands, block controls and note contents remain intact.

Each pane's + opens a compact menu for a new note, PDF/document, existing document, Code Lab or Flashcards. The invoking pane is the destination. Existing-resource selection opens a centered searchable modal with one destination, instead of duplicating all resources in current/beside lists. In a single pane, the + menu also offers opening resources on the right and starting a side-by-side comparison.

#### How it works

- `workspace/model.ts` is a typed state model with resource identity, ordered tabs, independently active tabs, active pane, orientation and ratio. A localStorage parser discards invalid references and clamps the ratio.
- `Workspace.tsx` renders stable resource components as grid children. Switching, moving and reordering tabs changes placement/visibility instead of recreating editors. Closed resources stay mounted, hidden, for the current session so a pending autosave is not canceled and reopening preserves undo/selection/scroll. Only open descriptors are restored after refresh.
- One editable instance exists per note resource. Showing that note simultaneously in both panes uses the existing read-only ReferencePane for the second view. A second study-tool view links back to its single live instance, avoiding competing device-storage writers.
- Editor accepts a workspace adapter for navigation, note identity, catalog metadata updates and header portals. Hidden editors and tools ignore global shortcuts. Graph controls resolve their host inside the owning editor workspace, avoiding cross-pane portals. Missing notes do not fall back to an unrelated editable note. Successful deletion closes/removes cached views; ordinary tab closure never calls deletion. Renames write recovery drafts immediately. Node views subscribe to editor editability so graph/image controls respond to Read/Edit without changing note content.
- A thin workspace shell was chosen over rewriting TipTap, duplicating editable views or adding a docking dependency. Existing editor extensions, continuous legacy content, note persistence and A4 geometry remain in place. Shared-note URLs use the original standalone Editor flow.

#### Everyday usage

1. Press + on a pane and choose a resource. That pane receives the tab.
2. Drag a tab toward the left, right, top or bottom of the content to split. Drop centrally to move into a pane, or onto another tab to reorder. Library/sidebar note rows can also be dragged into the workspace.
3. Right-click a tab to move it, duplicate its view, copy a supported note link, close it, close others or close tabs to its right.
4. Drag the divider to resize; double-click resets to 50/50. Focus the divider and use arrows for 5% adjustments or Home to reset.
5. Merge panes with the pane control. Tabs are preserved and duplicate view identities collapse into one tab.
6. Use Focus to maximize the active pane temporarily; Escape restores the previous split. On narrow screens, Switch pane reaches the other pane without discarding the layout.

Workspace shortcuts use **Cmd on macOS / Ctrl elsewhere + Alt**:

| Key         | Action                                               |
| ----------- | ---------------------------------------------------- |
| T           | Open the centered resource picker in the active pane |
| W           | Close the active tab                                 |
| Backslash   | Split / merge panes                                  |
| Right arrow | Move the active tab to the other pane                |
| Left arrow  | Focus the other pane                                 |
| [ / ]       | Previous / next tab in the active pane               |

Alt+1/2/3 switches Notes / Code Lab / Flashcards. Cmd/Ctrl+Shift+F toggles Focus; existing note search and editor shortcuts remain scoped to the active pane. Tab-strip arrows/Home/End navigate tabs. Menus/dialogs reuse Radix focus and keyboard behavior.

#### Data and compatibility

Layout descriptors are device-local under `lemma:<owner>:workspace:v1`. Directly opened files are cached separately in IndexedDB `lemma-workspace-files` / `files`, under owner + SHA-256 identity. Existing attachment validation and limits apply. Cache failures show a message while allowing the current file to remain open. Closing tabs or signing out does not erase cached file bytes; clear site data to remove that cache. These files are not automatically uploaded or inserted into notes. Attachments inserted into notes retain their existing persistence/sharing behavior. No SQL migration, dependency or server authorization change was introduced. The data inventory records this distinction.

PDF controls come from the browser's native embedded PDF viewer, including navigation/search/zoom/fit when supported. Text is previewed locally; Office documents retain download behavior. There is no custom PDF renderer or cross-browser control guarantee.

#### Verification

- `npm test`: **64 tests passed across 15 files**, including workspace transitions/restoration, identity safety, retained view state, narrow-screen split preservation, explicit Read/Edit selection, centered picking and per-pane + targeting.
- `./node_modules/.bin/tsc --noEmit`: passed. The existing Editor `@ts-nocheck` limitation remains.
- Focused ESLint on the new workspace modules and touched study-tool/dialog modules: passed.
- `./node_modules/.bin/eslint src`: reports existing repository failures (33 errors, 23 warnings in the inspected run), including legacy `@ts-nocheck`, explicit-any, empty catch blocks and hook warnings. No errors were reported in new workspace modules. The repository-wide lint command, even excluding generated Vercel/output directories, stalled and was interrupted; it is not claimed to pass.
- Production build: passed with existing large-chunk warnings; no deployment was performed.
- Actual in-app browser inspection used the real editor, workspace and CSS with synthetic notes and mocked repository/auth calls. It exercised native tab dragging into a right split, independent note selection, opening Code Lab alongside a note, centered navigation/picker, and Focus/restore. Read-only editor DOM and disabled graph editing were inspected. Fixture-server dependency aliases disable real account writes and C++ execution. Playwright CLI could not be fetched because registry DNS was unavailable; browser checks used the app's computer-use tools instead.

#### Limitations and rollback

Live auth/cloud-save failure races, deployed RLS, production sharing, physical touch drag, full screen-reader evaluation and native PDF controls across browsers were not tested. Responsive state is covered by component tests; actual browser inspection used the available desktop-sized viewport and narrow split containers. Session caching grows with resources opened until refresh/sign-out. Closed-tab state is retained only for the current session; undo/selection are not serialized across reload. Direct-file cache currently has no app-level purge/retention control. One live Code Lab/Flashcards session is shared across its view identity.

Rollback the workspace route and adapter/header/style additions with a new revert commit; do not rewrite published Lovable history. Old note/page/history/share formats are untouched. Device layout/file caches may remain unused after rollback and can be cleared via site data independently of cloud notes. Existing unrelated dashboard/reference-preview work in the working tree was preserved.

### Dashboard spacing and grouped surfaces — 2026-10-23

The home dashboard previously touched the sidebar edge, stretched its actions across the workspace, and placed an absolutely positioned Open badge over the latest note’s metadata. Recent notes and weekly activity had lost their backgrounds, borders and padding through competing CSS overrides.

The dashboard now uses a centered 1120px shell with responsive outer gutters and a 24px spacing rhythm. Quick actions, Continue writing, Recent notes and This week use subtle theme-derived backgrounds, existing 10px corner tokens and visible borders. The heading, action strip and cards share alignment. Weekly spaces are separated from the activity summary with an inset divider.

Continue writing is a full-width button with a two-column layout: note text and Open sit beside one another on desktop, then stack on narrow screens. Long titles, folder labels and account names wrap without moving controls over text. Recent-note icons retain their size, folder chips wrap, and dashboard buttons have explicit keyboard focus outlines. The chart bars can shrink to leave room for weekday labels.

Implementation is scoped to `Home.tsx` and the final dashboard CSS section in `src/styles.css`, using existing Button, NoteIcon, theme colors and spacing/radius tokens. A local dashboard surface token mixes paper with 4% ink, keeping backgrounds distinct in light and dark themes. The effective selectors account for older overrides; unrelated editor styles and existing document-preview work are preserved. Apple’s [layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout) informed alignment, grouping and adaptable spacing. No third-party global skill was installed.

#### Usage and compatibility

Open All notes to view the dashboard. New note, New folder, Search, Favorites, recent-note and folder actions retain their callbacks. Click anywhere in Continue writing to reopen the latest note. At narrow widths the actions form two columns and the content cards stack.

No dependency, route, database, persistence, auth, sharing or printable canvas changes. No migration or deployment required by this change beyond normal application deployment.

#### Verification

- `npm run test`: passed, 11 files / 50 tests.
- `./node_modules/.bin/tsc --noEmit`: passed; existing unchecked modules remain outside type coverage.
- `./node_modules/.bin/eslint src/components/editor/Home.tsx`: passed.
- `npm run build`: passed, existing bundle-size warnings remain.
- Prettier check on the changed component and CSS, and `git diff --check`: passed.
- Playwright preview of the actual Home component and production stylesheet with synthetic data: screenshots inspected at 1550px desktop and 390px mobile/dark. Checked horizontal overflow at 320, 768 and 1550px with a long account name; New note/Open callbacks and a 2px keyboard focus outline passed. Mobile preview hid the synthetic sidebar to model the available content width. Reduced-motion emulation was enabled during mobile checks.
- Preview artifacts are ignored under `output/playwright/home-spacing*`. The isolated preview required a restricted Vite dependency entry because the generic fixture configuration scanned TanStack server imports.

Live authenticated workspace flows, physical touch, screen readers, production deployment and full sidebar responsiveness were not verified. No new permanent tests were added for this presentation-only change.

#### Rollback

Revert the Home copy wrapper and the final “Dashboard layout” CSS section in a new commit. Do not revert unrelated document-preview changes or rewrite published Lovable history. No data rollback is needed.

### Larger document reading pane

Date: 2026-10-23

#### Behavior and usage

Opening a document beside a note now gives the reading pane more width: 46vw, capped at 800px, instead of 42vw capped at 580px. Left and right docking use one shared CSS width, including the graph-panel offset. Narrow screens retain the full-width overlay.

The attachment preview fills the remaining pane height beneath its header. Previously the inline attachment rule still capped the docked iframe at 65vh and retained preview margins and body padding, leaving unused space around the PDF. The dock removes that cap and spacing, with the download action as an accessible icon in the header. Use Open beside note or the reference pane PDF button as before; no new setting is needed. Inline previews keep their existing sizing.

#### Implementation and compatibility

`src/styles.css` controls layout; `ReferencePane.tsx` supplies the labeled header download link and hides the shared `AttachmentPreview` download row only in the dock. Inline previews retain their download links. Existing theme tokens, header controls and browser PDF viewer remain in use. No dependencies, note formats, stored files, migrations or external services change. Native PDF zoom remains browser controlled.

#### Verification and limits

- `npm run build`: passed, including the final header-icon revision.
- `tsc --noEmit`: passed.
- Targeted ESLint on both changed TSX files: zero errors, two existing Fast Refresh export warnings in attachments.
- Final browser fixture inspection confirmed the labeled header icon and zero bottom download links.
- `prettier --check src/styles.css`: passed.
- `git diff --check`: passed.
- Browser inspection used a synthetic layout fixture with production CSS. At 1422×800 the pane measured about 654px wide and the iframe about 705px high, ending directly above its then-present download row; the final revision moves that action to the header and gives its height back to the iframe. A nested 390×844 fixture visually retained the full-width reading overlay.
- The old full-editor fixture could not start because its standalone Vite configuration lacks TanStack entry aliases; the layout fixture was served separately. Full authenticated workspace interactions, native PDF rendering/zoom, print and deployment were not verified. No unit tests were added for this CSS-only adjustment.

#### Rollback

Revert the CSS changes with a new commit, preserving published Lovable history. No data rollback is required.

<a id="commit-7dfceed"></a>

## 2026-10-22 — Block action flyouts and master consolidation

Commit: [7dfceed](https://github.com/artush6/Lemma/commit/7dfceed).

### Compact block actions and side-opening conversions

Lemma's block menu previously expanded “Turn into” as an indented list inside the action menu. Opening it made the menu tall, displaced common actions, and required scrolling. The replacement follows the supplied Notion reference: compact icon rows, separate action groups, a current block label, and quiet word/character counts at the bottom. Turn into and Color open separate submenus. Only working Lemma actions are included.

#### Behavior and usage

- Click a block's grip and hover or click **Turn into** to open the conversion flyout. Each type has an icon, and the current text/heading/code type has a checkmark. Text, headings 1–3, bullet/task lists and quotes remain available; numbered lists and code now expose existing editor commands here too.
- Search an action or a type directly, for example `heading 2`, then use Down and Enter to apply it. Empty results show “No actions found.”
- Use Up/Down to navigate, Right to enter a submenu, Left to return, and Escape to dismiss. Color choices are in a separate flyout rather than an always-visible swatch row.
- Desktop menus use Radix collision placement. At widths of 560px or below, submenus use a viewport-inset panel with a Back row so they cannot extend past either edge. Their height is bounded and scrolls on short screens.
- Grip dragging, copy, duplicate, move and delete remain available. Copy/move actions have no invented keyboard shortcuts. Editor focus returns without requesting scroll after menu closure.

#### Implementation and compatibility

`src/components/editor/BlockControls.tsx` uses the installed Radix dropdown primitives for nested menus, focus handling, dismissal and positioning. Portals stay inside the workspace controls to inherit Lemma's theme. Mouse and touch pointer-down propagation on the grip is stopped before Radix's trigger handler; clicks open the menu, while native drag initiation remains available. Existing CSS rules for the replaced inline menu were removed and replaced with scoped menu styles in `src/styles.css`. The mobile submenu stacking overrides the existing global popper z-index so its lower choices stay selectable above the parent menu.

This changes editing controls, with no storage-format, SQL, dependency, auth, network or printable-canvas geometry changes. It does not add Notion-only features such as synced blocks, comments, or page conversion. Existing list/quote conversion semantics are retained; this is not a redesign of container transformations.

#### Verification and limits

- `npm run test`: 50 tests passed in 11 files.
- `tsc --noEmit`: passed.
- Targeted ESLint: no errors, one existing Fast Refresh warning for the exported `moveBlock` helper sharing a component file.
- Production build: passed; existing bundle-size warnings remain.
- Changed-file Prettier and `git diff --check`: passed.
- Playwright exercised an isolated real TipTap editor using the production BlockControls and stylesheet: heading conversion and search targeting, Up/Down/Right/Left/Enter/Escape navigation, native drag movement, duplication, color application, mobile Back and submenu containment at 390×844. Screenshots inspected desktop light, desktop dark and mobile dark menus, including reduced-motion preference. The mobile submenu measured x=12 through x=378 at 390px and its lowest row was unobstructed.

The browser fixture uses synthetic text and no cloud/auth connection. Full workspace integration, live persistence, screen readers, physical touch devices, clipboard permissions, print/export and deployment were not verified. The existing standalone full-workspace check configuration could not resolve TanStack server virtual entries, so visual checks used the isolated editor fixture. No release is implied.

#### Rollback

Revert this change with a new commit to restore the previous menu. No data migration or cleanup is needed. Preserve published Lovable history.

### Consolidate current Lemma work on master

GitHub master was at `c4fa82d`, behind the current TanStack application work. This update brings the document/math workspace (`296be54`), Lovable workspace and flashcards (`e82396e`), code themes and shortcuts (`e46de5d`), editor interactions and PDF reading (`f7a3a55`), and the new compact block-action flyouts onto master without rewriting published history.

The existing feature commits remain intact. Master advances through normal Git history; no force push, rebase, amendment or squash is used. The older `codex/editor-redesign-wip` branch is preserved as a historical snapshot: its Next.js paths are not merged into the current TanStack source tree. Other existing remote branches are retained.

#### Repository housekeeping

`.gitignore` now excludes local Playwright session state, generated screenshots/exports under `output/playwright`, and the untracked temporary `workspace-check` entrypoint/configuration. These files remain on the local machine. Previously tracked screenshots are left intact; this change does not delete application code or user data. New source, tests, engineering records and changelog entries are committed. No credentials, browser-session dumps or local flashcard backups are added.

#### Verification and operational limits

The current changes passed 50 tests across 11 files, TypeScript, targeted BlockControls lint (one pre-existing Fast Refresh warning), changed-file formatting and production build. Browser interaction evidence and limitations are recorded in [the block-action entry](#commit-7dfceed); earlier features have their own linked entries in the index. `npm run format:check` passed for the whole repository before publishing; full-source lint retains the previously documented baseline failures.

Publishing to master may trigger the repository's existing Lovable/GitHub or hosting integrations. A successful push confirms repository synchronization, not a successful production deployment, live authentication, or database authorization. No SQL is executed and no separate deployment command is run. Roll back with a new revert commit, preserving Lovable history.

<a id="commit-f7a3a55"></a>

## 2026-10-22 — Editor interactions and flexible PDF reading

Commit: [f7a3a55](https://github.com/artush6/Lemma/commit/f7a3a55).

### Editor interactions, typography and flexible reading — 2026-10-22

The editor now uses a system sans default, clearer paper/canvas contrast, compact contextual menus and more predictable keyboard editing. Notes and Code Lab let readers dock a PDF on either side or open it in a separate window. Existing note content, history, recovery, sharing and flashcard schedules keep their formats; this change does not migrate persisted data.

#### Writing and menus

- The insertion menu opens at the beginning every time. Focus uses `preventScroll`, and the menu follows the live caret and available viewport space. Slash is intercepted before a literal slash is inserted into an empty block.
- Two/three-column insertion places the caret in the first column. Mod+Alt+7/8 inserts columns; Mod+Alt+Left/Right moves between them; Mod+Enter continues below them. Mod means Command on macOS and Control elsewhere. The insertion menu displays creation shortcuts.
- Toolbar mouse actions keep the editor selection. Selected text gets a floating Bold/Italic/Code/Highlight/Heading/Link toolbar. Block grips open searchable actions for conversion, duplication, movement, copying, deletion and text color. **Turn into…** is one expandable button, with its formats inside a submenu; it is available for text blocks. Existing text selection inside a block is retained when converting it.
- LaTeX highlighting retains a lone trailing backslash, which now opens command suggestions immediately. Snippet placeholders map through replacements, and Tab/Shift+Tab navigates either snippet fields or hand-written brace arguments. Snippet selection is set before paint so immediate typing replaces the placeholder rather than appending after the expression. Expanded editing keeps source and preview side by side; clicking the preview still locates source.
- The contents rail stays available when headings exist, with hover/focus expansion and active-heading tracking. The extra topbar toggle is removed. It does not reserve a document column.

#### Documents and reading

The new upload/link picker accepts multiple supported files, with drag-and-drop both in the picker and directly on the note. Async file reads map an editor selection bookmark through intervening edits. Files insert only if the active note has not changed. Unsupported image formats produce a useful error rather than disappearing silently. Limits remain 5 MiB per PDF and 2 MiB per image or other supported document.

Use **Open beside**, then the PDF button, or use an attachment's **Open beside note** action. The pane has a placement menu: **Dock left**, **Dock right**, **Open in new window**. The same choices are available on Code Lab's PDF pane. A detached local PDF gets a Blob URL owned by its new window, so closing the dock does not invalidate the detached file. Closing the detached window releases that URL. Popup blocking is reported in the pane. The browser controls whether popup requests become windows or tabs.

Reference notes use the shared styled selector instead of the oversized native select. The selector is hidden while reading a PDF. At narrow widths the reference pane fills the workspace, with its close/placement controls retained.

The Link tab supports explicit HTTPS PDF embeds. External embedding connects to that site's server; the picker explains this before submission, and frames use `no-referrer`. Providers can block embedding. URLs persist in the existing attachment node and therefore follow ordinary note saving, history and sharing. Local uploads continue to use embedded note data; no new storage service or database table was introduced. A temporary PDF opened only in the reference pane remains temporary.

#### Typography, color and motion

The default is a Notion-style native sans stack (system UI, Apple system, Segoe UI, Helvetica, Arial), rather than a claim to ship Notion's exact font. Explicit Serif/Mono preferences remain available. Versioned preferences now take precedence over legacy font/size keys. The old unconditional legacy fallback could make saved settings appear ineffective. Google Fonts now serves only the retained JetBrains Mono family; Monaco uses native monospace to avoid late font swaps changing Find-widget measurements.

Light mode uses white paper on a warm gray desk; dark mode uses charcoal paper on a darker desk. A superseded hard-coded black A4 override was removed, while page measurements, margins, gaps and print geometry stay intact. Auth controls and Continue affordances are larger. Monaco's Find controls have scoped geometry overrides rather than inheriting generic form sizing.

Framer Motion adds short entrances to Home/auth/workspaces, insertion/block/selection menus and flashcard answer reveal. Shared buttons have subtle hover/press feedback. Reduced-motion hooks disable those movements; existing CSS handles reduced-motion transitions. Motion is kept outside printable document layout. No dependency was added.

#### Design references

- [Notion: columns, headings and dividers](https://www.notion.com/help/columns-headings-and-dividers) — compact always-available contents rail and block transformations.
- [Notion: customize and style content](https://www.notion.com/help/customize-and-style-your-content) — default/serif/mono choices and readable content controls.
- [Duolingo: core-tabs redesign](https://blog.duolingo.com/core-tabs-redesign/) — clearer hierarchy, spacing and consistent interactions. This implementation follows those principles within Lemma's existing components; it does not copy Duolingo's proprietary typography or claim formal guideline compliance.

#### Verification and limits

- `npm test`: **50 tests passed in 11 files**, including placeholder mapping/token preservation, column movement, insertion bookmarks, supported/unsupported file batches and detached-preview URL/MIME boundaries.
- `npx tsc --noEmit`: passed. Targeted ESLint on the new modules and typed changed surfaces: no errors, four Fast Refresh export warnings. `npx prettier --check` on changed files and `git diff --check`: passed.
- `npm run build`: passed. No deployment was run.
- Full-source lint (`npx eslint src --ignore-pattern src/workspace-check.tsx`) still reports **33 errors and 23 warnings**, including legacy `@ts-nocheck`, `any`, empty catches and existing hook/export warnings. Whole-repository lint was stopped because it also traverses generated build output. These broader checks are not reported as passing.
- Actual browser checks: menu opening at scrollTop 0; column insertion into the first cell and Mac Command+Option arrow navigation; fast `\frac` snippet expansion producing `\frac{numerator}{denominator}`; selection toolbar preserving range 25–31 while applying Bold; PDF upload/drop and image drop with a loaded image node; styled reference-note selection; left/right dock positions; independent PDF window retaining all 3,181 fixture bytes after dock closure; Code Lab right docking; Find searching `const` and showing 1 of 2 matches with a 24px/13px source field; flashcard reveal and Good grading. At 390px, page width remained 390px and the reference pane filled the workspace. Mobile expanded LaTeX showed a lone backslash and suggestions under reduced-motion emulation. Light/dark screenshots were inspected.

Browser checks use synthetic local data and a browser-only null Supabase module, with no cloud writes. Local screenshots are developer artifacts under `output/playwright/` and are not committed. Monaco still logs its existing focus/aria-hidden warning when closing Find. Live auth/cloud/share/history, deployed authorization, screen readers, print/export after this typography change and production deployment are not covered by these local checks. The automated browser verifies PDF bytes, Blob lifecycle and iframe wiring; its native PDF viewer does not render document pages. The owner's supplied screenshot shows the native PDF viewer rendering, but that is not a claim of automated cross-browser PDF validation.

#### Rollback

Revert this change with a new commit, preserving Lovable history. No SQL rollback is required. Existing locally uploaded attachment nodes remain compatible; HTTPS-linked PDF nodes require this version's validation/preview support. Font preference values retain their existing shape. Detached windows and dock placement are transient UI state.

<a id="commit-e46de5d"></a>

## 2026-10-22 — Code themes, feedback and shortcuts

Commit: [e46de5d](https://github.com/artush6/Lemma/commit/e46de5d).

### Code themes, useful status colors and a lasting changelog

Date: 2026-10-22. Branch: `codex/lovable-ui-flashcards`. This entry covers the follow-up to the Lovable workspace integration; it is not a deployment announcement.

#### What changed and why

The workspace had a clear monochrome design, but it flattened feedback that benefits from color. Flashcard grades looked alike, warnings looked like ordinary logs, and even a failed run ended with a neutral “execution finished” message. Code editing shortcuts also existed mostly inside Monaco, with little help discovering them.

The updated design keeps the surrounding workspace restrained while giving syntax and feedback distinct meaning:

- **Red:** errors, timeouts, invalid equations/graph input, unavailable storage and the Again grade.
- **Orange:** warnings, local/offline save state and the Hard grade.
- **Green:** successful runs, saved state and Good/Easy grades.
- **Blue:** informational/running state. Code keywords, types, strings and numbers have their own syntax palette; these syntax colors describe code structure rather than success/failure.

Visible labels, icons and grade names remain, so users do not have to recognize a color to understand a state. Light and dark appearances have separate foreground/background tokens. Graph legend swatches again match the existing colored curves.

#### A nicer code editor

`CodeEditor.tsx` now defines coordinated light and dark Monaco themes: pale paper in light mode and a deep slate editor surface in dark mode. Keywords are violet, strings green, numbers amber, types teal, operators blue, and invalid tokens red. Active lines, selections, indentation guides, bracket matches and diagnostics use matching colors. Line numbers and comments remain subdued but readable. Font ligatures and bracket/indentation guides help scanning; reduced-motion settings still control smooth scrolling and cursor animation.

The new editing toolbar exposes **Find**, **Format** and **Wrap**. Buttons are disabled until the enhanced editor is ready. Wrapping is tracked through edits and has an explicit Alt+Z action, because the loaded Monaco build does not provide a wrap action on its own. Format is available for JavaScript; Python and C++ do not acquire a formatter just because the button exists. The existing basic textarea remains available while the external editor loads. No dependency was added.

#### Examples and shortcuts

Run this JavaScript to see warning feedback:

```js
const score = 72;
console.warn("Review the uncertain cases");
console.log({ score, passed: score >= 60 });
```

Before, the warning was recorded as an ordinary log. Now it is preserved as a warning, rendered in orange, and the output is labeled “Warnings” / “Completed with warnings.” A thrown error or `console.error` gets red feedback; a timed-out run is labeled “Timed out.” A clean run gets a green Success label. Starting a run clears the prior result so old output is not presented as the new result.

Open **Shortcuts**, or press **? outside text fields**, for the relevant workspace guide. The guide adapts the main modifier label for Mac and other keyboards. In the enhanced code editor:

| Action              | Shortcut                                    |
| ------------------- | ------------------------------------------- |
| Run current file    | Cmd/Ctrl + Enter                            |
| Find                | Cmd/Ctrl + F                                |
| Replace             | Cmd + Option + F on Mac; Ctrl + H otherwise |
| Toggle line comment | Cmd/Ctrl + /                                |
| Toggle wrapping     | Alt + Z                                     |
| Format JavaScript   | Shift + Option/Alt + F                      |
| Command palette     | F1                                          |
| Next diagnostic     | F8                                          |

Flashcards retain Space/Enter to reveal, 1–4 to grade, and Escape to return to the deck. The guide explains these choices. Alt+1/2/3 still switches workspaces. The ? shortcut ignores editable fields and existing dialogs, so ordinary question marks remain usable in cards/code.

#### The changelog rule

Root `AGENTS.md` now requires every agent working in this repository to maintain the root `changelog/` folder for significant changes or work that cannot be explained well in one commit message. The documentation belongs in the same branch/change before committing or opening/updating its PR. A PR description or commit message does not replace it. Related commits may share an entry; tiny typo/formatting-only edits do not require separate entries.

[The writing guide and index](#writing-guide) describes entry naming and required content: what, why, how, examples, compatibility/data implications, actual verification, limitations and rollback. The [previous integration](#commit-e82396e) is documented retrospectively so that substantial recent work is available here too. This rule applies to this repository; it does not install a global agent configuration or authorize publishing.

#### Implementation and compatibility

- `src/components/spaces/CodeEditor.tsx`: themes and a small ref API for the three editor actions.
- `CodeLab.tsx`: toolbar, run outcome labels/icons, platform-aware run hint and shortcut guide.
- `WorkspaceShortcuts.tsx`: shared, dismissible, keyboard-accessible workspace guide.
- `Flashcards.tsx` and `src/styles.css`: guide access and semantic grade/status styling.
- `src/lib/sandbox.ts`: keeps JavaScript `console.warn` as a warning and classifies outcomes; existing log/error values remain supported.

No note, card or snippet storage format changed, and no SQL migration, external service or dependency was added. Note pagination/print geometry and scheduling logic remain untouched. The existing device-only storage and external runtime/compiler arrangements still apply; see the [data inventory](docs/engineering/DATA_INVENTORY.md).

#### Verification and limitations

42 tests across 10 files, TypeScript, targeted lint and the production build passed. The new outcome tests distinguish warning-only runs, successful quiet runs, errors and timeouts. The existing build chunk-size warning remains.

Browser checks used a browser-only Supabase stub and synthetic local work. The checks exercised the themed editor in light/dark mode; successful/warning/error JavaScript runs; Cmd/Ctrl+Enter; JavaScript formatting; Find and Wrap actions; the shortcuts guide; flashcard grade colors and keyboard grading; narrow layouts and reduced-motion emulation. At 390px the page scroll width remained 390px. A typing question mark did not open the guide. Screenshots are local artifacts under `output/playwright/code-theme-*`, `code-shortcuts*` and `flashcard-status-colors-*`.

Monaco emitted a focus/aria-hidden warning when its Find widget closed; no screen-reader conformance claim is made. Narrow layouts were visually inspected; mobile touch editing was not tested. Desktop checks also confirmed Wrap stays enabled after typing and Alt+Z toggles it back. Live authentication, cloud save/share, Python/C++ execution for this follow-up, deployed authorization, print/export and production deployment were not tested. The initial unstubbed local page still hits the previously documented missing Supabase configuration error.

#### Rollback

Revert this follow-up with a new Git commit if needed. Its changes are presentation, local keyboard controls and ephemeral run feedback, so there is no data migration to reverse. Keep the changelog policy and entries unless the user deliberately changes that policy. Do not rewrite published Lovable history or clear saved notes/cards/snippets as part of rollback.

<a id="commit-e82396e"></a>

## 2026-10-22 — Lovable workspace and flashcards

Commit: [e82396e](https://github.com/artush6/Lemma/commit/e82396e).

### Lovable workspaces and flashcards

Date: 2026-10-22. Implementation: `e82396e` on `codex/lovable-ui-flashcards`. This entry documents the preceding integration retrospectively, when the changelog folder was introduced. It is not a deployment announcement.

#### What changed and why

Lemma gained three connected workspaces: Notes, Code Lab and Flashcards, plus a Home view for returning to recent notes. The user wanted Lovable's new design and features while keeping the editor improvements made since that export. Flashcards were a particular priority.

The export contained an older version of the editor, so replacing the application with it would have removed working features. Instead, the new workspace modules were integrated into the current editor. The block controls, columns, attachments, reference pane, richer icon picker, equation and graph editing, exports, search, recovery storage and pagination implementations were retained.

#### How it works

`Editor.tsx` owns workspace selection; Code Lab and Flashcards load lazily. The URL uses `?space=code` or `?space=cards` and retains the selected note/page so switching back returns to it. Alt+1, Alt+2 and Alt+3 switch workspaces. Browser back/forward respects workspace selection. Shared notes stay in Notes. Workspace navigation occupies its own band outside the printable canvas.

The integration follows Lovable's final typography: Nunito Sans for controls, STIX Two Text for mathematics and JetBrains Mono for code. It initially used monochrome surfaces and feedback; the subsequent theme entry explains the semantic colors added later. Narrow notes start with the sidebar closed, with its controls below the navigation band.

#### Using the new features

- **Home:** resume your latest note, open recent notes, create notes/folders, search or open favorites. The weekly display is a snapshot of each note's latest edit, not a complete history of writing activity.
- **Code Lab:** edit JavaScript, Python or C++, choose datasets, run the code and inspect output. Organize files into folders, open a temporary PDF beside code and export a JSON backup.
- **Flashcards:** create a deck; add a question and answer; use `$x^2$` for inline mathematics or `$$...$$` for a display formula. Start Study, reveal the answer with Space/Enter and grade with 1–4. Again repeats in ten minutes; Good starts at one day; Easy waits longer.
- **Import:** paste `Derivative of $x^2$; $2x$`, tab-separated spreadsheet columns or a JSON deck. Invalid rows produce feedback rather than being silently discarded. Imported cards begin with a fresh review schedule, including cards from an exported backup.

#### Persistence and external services

Notes retain their existing repository and recovery behavior. Code Lab and flashcard data are stored **on this device**, under separate per-account localStorage keys; they do not sync through Supabase. The storage hook guards against writing one account's loaded state under another account's key and reports read/quota errors. Export a backup before relying on device-only storage. Sign-out does not erase it.

Monaco and Python's Pyodide runtime load from jsDelivr. JavaScript and Python execute in disposable browser workers with timeouts. C++ sends source and selected input through an authenticated server function to Compiler Explorer. These workers are not a verified security boundary for hostile code. Provider retention and deployed authorization remain unverified. No SQL migration, new storage bucket or note-data migration was introduced.

#### Verification at integration time

40 tests across 9 files, TypeScript, targeted new-module lint, formatting, diff checks and the production build passed. The existing Editor lint baseline remained 15 errors and 2 warnings.

Browser checks used the full app with a browser-only Supabase stub and synthetic notes. They exercised flashcard add/edit/import/export/deck deletion/study/reload, JavaScript and Python output, note switching with an edit retained, search navigation, equation opening and light/dark/mobile layouts. A settled single-character typing check left scrollTop unchanged. Desktop A4 width measured 793.6875px; the 390px mobile view had no page overflow.

Live authentication, cloud save/share/history, deployed authorization, C++, screen readers and print/PDF output after the typography change were not verified. Nothing was pushed or deployed during that task.

#### Compatibility and rollback

There was no persisted-note format migration to reverse. Revert the integration with a new Git commit if needed; preserve published Lovable history. Export local flashcard/Code Lab work first, because an older UI will not expose those workspaces even though the device keys remain. Do not delete local keys or existing notes as part of a UI rollback.

Further detail: [engineering verification](docs/engineering/LOVABLE_WORKSPACE_INTEGRATION.md) and [data inventory](docs/engineering/DATA_INVENTORY.md).

<a id="writing-guide"></a>

## Writing guide

Write for someone who has not read the chat. In each commit's section explain the problem and resulting behavior, important implementation decisions, practical examples/shortcuts, data/security/dependency/migration implications, actual verification and limitations, and safe rollback. Link deeper engineering documents when useful. Do not include secrets or private note contents. A commit message or PR description does not replace this entry. For future commits, create a fresh dated section at the top; keep the currently prepared change in its own pending section until committed. A hash is optional before commit creation and must never be guessed.
