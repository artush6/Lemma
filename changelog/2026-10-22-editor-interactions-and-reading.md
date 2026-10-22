# Editor interactions, typography and flexible reading — 2026-10-22

The editor now uses a system sans default, clearer paper/canvas contrast, compact contextual menus and more predictable keyboard editing. Notes and Code Lab let readers dock a PDF on either side or open it in a separate window. Existing note content, history, recovery, sharing and flashcard schedules keep their formats; this change does not migrate persisted data.

## Writing and menus

- The insertion menu opens at the beginning every time. Focus uses `preventScroll`, and the menu follows the live caret and available viewport space. Slash is intercepted before a literal slash is inserted into an empty block.
- Two/three-column insertion places the caret in the first column. Mod+Alt+7/8 inserts columns; Mod+Alt+Left/Right moves between them; Mod+Enter continues below them. Mod means Command on macOS and Control elsewhere. The insertion menu displays creation shortcuts.
- Toolbar mouse actions keep the editor selection. Selected text gets a floating Bold/Italic/Code/Highlight/Heading/Link toolbar. Block grips open searchable actions for conversion, duplication, movement, copying, deletion and text color. **Turn into…** is one expandable button, with its formats inside a submenu; it is available for text blocks. Existing text selection inside a block is retained when converting it.
- LaTeX highlighting retains a lone trailing backslash, which now opens command suggestions immediately. Snippet placeholders map through replacements, and Tab/Shift+Tab navigates either snippet fields or hand-written brace arguments. Snippet selection is set before paint so immediate typing replaces the placeholder rather than appending after the expression. Expanded editing keeps source and preview side by side; clicking the preview still locates source.
- The contents rail stays available when headings exist, with hover/focus expansion and active-heading tracking. The extra topbar toggle is removed. It does not reserve a document column.

## Documents and reading

The new upload/link picker accepts multiple supported files, with drag-and-drop both in the picker and directly on the note. Async file reads map an editor selection bookmark through intervening edits. Files insert only if the active note has not changed. Unsupported image formats produce a useful error rather than disappearing silently. Limits remain 5 MiB per PDF and 2 MiB per image or other supported document.

Use **Open beside**, then the PDF button, or use an attachment's **Open beside note** action. The pane has a placement menu: **Dock left**, **Dock right**, **Open in new window**. The same choices are available on Code Lab's PDF pane. A detached local PDF gets a Blob URL owned by its new window, so closing the dock does not invalidate the detached file. Closing the detached window releases that URL. Popup blocking is reported in the pane. The browser controls whether popup requests become windows or tabs.

Reference notes use the shared styled selector instead of the oversized native select. The selector is hidden while reading a PDF. At narrow widths the reference pane fills the workspace, with its close/placement controls retained.

The Link tab supports explicit HTTPS PDF embeds. External embedding connects to that site's server; the picker explains this before submission, and frames use `no-referrer`. Providers can block embedding. URLs persist in the existing attachment node and therefore follow ordinary note saving, history and sharing. Local uploads continue to use embedded note data; no new storage service or database table was introduced. A temporary PDF opened only in the reference pane remains temporary.

## Typography, color and motion

The default is a Notion-style native sans stack (system UI, Apple system, Segoe UI, Helvetica, Arial), rather than a claim to ship Notion's exact font. Explicit Serif/Mono preferences remain available. Versioned preferences now take precedence over legacy font/size keys. The old unconditional legacy fallback could make saved settings appear ineffective. Google Fonts now serves only the retained JetBrains Mono family; Monaco uses native monospace to avoid late font swaps changing Find-widget measurements.

Light mode uses white paper on a warm gray desk; dark mode uses charcoal paper on a darker desk. A superseded hard-coded black A4 override was removed, while page measurements, margins, gaps and print geometry stay intact. Auth controls and Continue affordances are larger. Monaco's Find controls have scoped geometry overrides rather than inheriting generic form sizing.

Framer Motion adds short entrances to Home/auth/workspaces, insertion/block/selection menus and flashcard answer reveal. Shared buttons have subtle hover/press feedback. Reduced-motion hooks disable those movements; existing CSS handles reduced-motion transitions. Motion is kept outside printable document layout. No dependency was added.

## Design references

- [Notion: columns, headings and dividers](https://www.notion.com/help/columns-headings-and-dividers) — compact always-available contents rail and block transformations.
- [Notion: customize and style content](https://www.notion.com/help/customize-and-style-your-content) — default/serif/mono choices and readable content controls.
- [Duolingo: core-tabs redesign](https://blog.duolingo.com/core-tabs-redesign/) — clearer hierarchy, spacing and consistent interactions. This implementation follows those principles within Lemma's existing components; it does not copy Duolingo's proprietary typography or claim formal guideline compliance.

## Verification and limits

- `npm test`: **50 tests passed in 11 files**, including placeholder mapping/token preservation, column movement, insertion bookmarks, supported/unsupported file batches and detached-preview URL/MIME boundaries.
- `npx tsc --noEmit`: passed. Targeted ESLint on the new modules and typed changed surfaces: no errors, four Fast Refresh export warnings. `npx prettier --check` on changed files and `git diff --check`: passed.
- `npm run build`: passed. No deployment was run.
- Full-source lint (`npx eslint src --ignore-pattern src/workspace-check.tsx`) still reports **33 errors and 23 warnings**, including legacy `@ts-nocheck`, `any`, empty catches and existing hook/export warnings. Whole-repository lint was stopped because it also traverses generated build output. These broader checks are not reported as passing.
- Actual browser checks: menu opening at scrollTop 0; column insertion into the first cell and Mac Command+Option arrow navigation; fast `\frac` snippet expansion producing `\frac{numerator}{denominator}`; selection toolbar preserving range 25–31 while applying Bold; PDF upload/drop and image drop with a loaded image node; styled reference-note selection; left/right dock positions; independent PDF window retaining all 3,181 fixture bytes after dock closure; Code Lab right docking; Find searching `const` and showing 1 of 2 matches with a 24px/13px source field; flashcard reveal and Good grading. At 390px, page width remained 390px and the reference pane filled the workspace. Mobile expanded LaTeX showed a lone backslash and suggestions under reduced-motion emulation. Light/dark screenshots were inspected.

Browser checks use synthetic local data and a browser-only null Supabase module, with no cloud writes. Local screenshots are developer artifacts under `output/playwright/` and are not committed. Monaco still logs its existing focus/aria-hidden warning when closing Find. Live auth/cloud/share/history, deployed authorization, screen readers, print/export after this typography change and production deployment are not covered by these local checks. The automated browser verifies PDF bytes, Blob lifecycle and iframe wiring; its native PDF viewer does not render document pages. The owner's supplied screenshot shows the native PDF viewer rendering, but that is not a claim of automated cross-browser PDF validation.

## Rollback

Revert this change with a new commit, preserving Lovable history. No SQL rollback is required. Existing locally uploaded attachment nodes remain compatible; HTTPS-linked PDF nodes require this version's validation/preview support. Font preference values retain their existing shape. Detached windows and dock placement are transient UI state.
