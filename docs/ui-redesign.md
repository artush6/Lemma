# Lemma UI redesign

Implemented against the existing app on 5 October 2026. This work keeps Tiptap, KaTeX, function-plot, the note/page JSON formats, the repository layer, and existing Supabase migrations.

## What changed

- Consolidated the successive stylesheet generations into one token system, with component groups, charcoal dark mode, responsive rules, reduced motion, and print styles.
- Redesigned the sidebar, nested folder tree, page navigation, library, paper surface, title hierarchy, and compact sticky formatting bar. Library folders include notes in descendant folders in their counts, and parent folder views expose their actual children.
- Quieted the header by moving secondary actions and folder assignment into its existing overflow surface. Breadcrumbs expose the actual folder ancestry and clickable parents.
- Positioned slash commands near the caret, improved focused states, and retained filtering, arrow keys, Enter, and Escape. Added inline equation access to the same existing command dispatch.
- Added a dark, searchable, categorized palette that renders the existing snippet templates with KaTeX. Insertion uses the existing expansion function and opens the existing equation editor with its first field selected. The equation inspector also offers the same palette.
- Refined inline and display equation editing, the source/preview split, autocomplete, current-part highlighting, and Done action.
- Reduced graph chrome to expression legends and contextual editing. The composer uses the existing expressions, range, height, and points; wide screens reserve space for it and smaller screens use an overlay. Graphs redraw when their container changes size and scale for print through an SVG viewBox.
- Replaced the permanent contents column with a semantic rail. It expands on hover, keyboard focus, or click; tracks the active heading during scrolling; and navigates without changing the editing selection. Rail strokes compress for long documents.
- Unified search, snippet, settings, and history surfaces. Search now has arrow-key selection; modal surfaces trap Tab, dismiss with Escape/backdrop, and restore focus without stealing it from newly inserted equation fields.
- Polished read and focus modes. Mobile uses a dismissible sidebar drawer, with an initially collapsed sidebar.

## Small behavior fixes found during QA

1. Offline reload now honors the existing note, page, and read-mode query parameters instead of always reopening the first page of the first local note.
2. Creating a note updates the active-note reference before loading its empty editor content, and loads that content without emitting an update. This prevents the previous note from being overwritten with a blank document.
3. Prompt-based renaming writes the same existing local draft immediately.
4. Read mode prevents equation editing through mouse and keyboard activation.
5. Graph source typing retains the draft textarea value instead of repeatedly normalizing it while the user types.

## Changed files

- [app/globals.css](/Users/artush/Developer/lemma/app/globals.css)
- [components/editor/Editor.tsx](/Users/artush/Developer/lemma/components/editor/Editor.tsx)
- [components/editor/nodes.tsx](/Users/artush/Developer/lemma/components/editor/nodes.tsx)
- [components/editor/OutlineRail.tsx](/Users/artush/Developer/lemma/components/editor/OutlineRail.tsx) — new
- [components/editor/MathPalette.tsx](/Users/artush/Developer/lemma/components/editor/MathPalette.tsx) — new
- [components/editor/CommandSearch.tsx](/Users/artush/Developer/lemma/components/editor/CommandSearch.tsx) — new
- [components/editor/Overlay.tsx](/Users/artush/Developer/lemma/components/editor/Overlay.tsx) — new
- This report.

## Preserved systems

The original math nodes and graph attributes remain compatible. The original source autocomplete, shortcuts, dollar conversion, expansion templates, Tab field navigation, editor undo/redo, formatting commands, page ordering, note/folder operations, repository methods, autosave, owner-scoped drafts, online refresh, share-token URLs, history restoration, and browser navigation remain in place. No dependency, database, migration, or routing-framework changes were made.

## Validation

`npm run lint`, `npm run build`, and `git diff --check` pass.

46 checks passed in isolated Chrome using local fixtures and temporarily disabled cloud environment variables. No browser runtime errors were observed. Checks covered:

- Nested folders and child folder views; nested folder creation; real library folder cards.
- Note creation and renaming; preservation of the previously open note.
- Page creation, switching, deletion, autosave, reload recovery, and browser back/forward.
- Search results, arrow navigation, opening a note, modal focus trapping, and Escape.
- Slash filtering, arrow navigation, and equation insertion.
- Inline math shortcut, source editing, autocomplete, snippet fields, and dollar conversion.
- Rendered snippet selection, first-field selection, and Tab navigation.
- Graph insertion, editing, range updates, rendering, and inspector dismissal.
- Outline navigation, active section tracking in a 30-section fixture, return to the first section, and explicit dismissal.
- Read mode, prevention of equation editing while reading, focus mode, and Escape.
- A4 and infinite layouts; dark mode; history panel presentation.
- Mobile overflow, initially collapsed navigation, drawer opening/dismissal.
- PDF generation and removal of contextual/editor chrome in print.

Visually inspected desktop light/dark, the outline, math palette, equation editor, graph composer, search, library, mobile, and rendered PDF pages.

## Deliberately deferred

- Selection-formatting bubble, block handles/dragging, and stable heading links: optional additions that would require more editor-selection and document-identity work than the presentation changes.
- Typed Definition/Theorem/Lemma/Proof variants: retained the existing callout node and gave it a pale academic treatment; did not add persisted node attributes or a new semantic type system.
- New image insertion/captions: the current editor has no image extension. The stylesheet gives images a restrained presentation if support is introduced later, but no image editing system was added.
- Graph visibility toggles, y-range controls, equal scaling, and additional plot options: these are not existing persisted graph capabilities. Only the working graph attributes are exposed.
- Templates, flashcards, TikZ, AI, collaboration, and other concept-render-only capabilities: intentionally outside this redesign.

## Validation limits and next pass

Live Supabase authentication, cloud saves, share-link opening/revocation, and history restoration were not exercised against a real account. Their implementation and schema remain unchanged. The browser checks validated local autosave/recovery and history presentation rather than claiming live-cloud coverage.

A later pass could replace the remaining native rename/folder/link/point prompts with small app-owned dialogs, refine the formatting bar on narrow screens, and improve dense math preview cards. The editor still owns persistence and navigation orchestration; only the new contextual UI was extracted, avoiding a broad business-logic refactor.

## Review artifacts

- [Desktop editor](/Users/artush/.codex/visualizations/2026/10/05/01a10de5-fccd-7953-a8ab-2a3bdcad20d2/lemma-ui-qa/editor-light.png)
- [Dark editor](/Users/artush/.codex/visualizations/2026/10/05/01a10de5-fccd-7953-a8ab-2a3bdcad20d2/lemma-ui-qa/editor-dark.png)
- [Graph composer](/Users/artush/.codex/visualizations/2026/10/05/01a10de5-fccd-7953-a8ab-2a3bdcad20d2/lemma-ui-qa/graph-inspector.png)
- [Math palette](/Users/artush/.codex/visualizations/2026/10/05/01a10de5-fccd-7953-a8ab-2a3bdcad20d2/lemma-ui-qa/math-palette.png)
- [Outline](/Users/artush/.codex/visualizations/2026/10/05/01a10de5-fccd-7953-a8ab-2a3bdcad20d2/lemma-ui-qa/outline-expanded.png)
- [Mobile editor](/Users/artush/.codex/visualizations/2026/10/05/01a10de5-fccd-7953-a8ab-2a3bdcad20d2/lemma-ui-qa/mobile.png)
- [PDF export](/Users/artush/.codex/visualizations/2026/10/05/01a10de5-fccd-7953-a8ab-2a3bdcad20d2/lemma-ui-qa/note.pdf)
