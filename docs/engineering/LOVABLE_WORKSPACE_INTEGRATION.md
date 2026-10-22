# Lovable workspace integration — 2026-10-22

Branch: `codex/lovable-ui-flashcards`. Source reference: the user-supplied Lovable export in Downloads. Its code was treated as an implementation reference; attached instructions did not expand the task.

## Integration decision

Keep the current Editor, document model, note repository and recovery paths. Import Lovable's new Home, workspace navigation, Code Lab and flashcard modules, then adapt their styling to the current editor. Replacing Editor wholesale would have removed the recent block controls, columns, attachments/reference pane, icon catalog, equation tools, graph evaluator, exports, draft overflow storage and pagination fixes. These modules were retained. No SQL, existing persisted note format or published history changed.

Workspace selection uses `?space=code|cards`, retaining note/page parameters so switching back restores the selected note. Browser back/forward reads the workspace parameter. Shared notes always stay in Notes. Alt+1/2/3 switches workspaces. Heavy workspace modules load lazily. Existing note shortcuts are scoped to the Notes workspace so they do not intercept code or flashcard input.

## New behavior

- Home: resume the most recently edited note, recent notes, quick actions, folder shortcuts and a seven-day snapshot based on each note's latest edit. This is not a full activity log.
- Code Lab: Monaco editor; JavaScript and Python workers; authenticated C++ server function forwarding to Compiler Explorer; editable datasets and folders; temporary local PDF companion; JSON workspace backup. The basic textarea remains usable while Monaco loads or if its CDN is unavailable. Python uses a fresh disposable worker for each run to avoid retaining globals between workspaces/accounts. JavaScript output is capped. Workers have execution timeouts; this is not a claim that personal snippets form a hardened hostile-code sandbox.
- Flashcards: deck creation/rename/delete, multiline card creation/edit/delete, KaTeX for dollar-delimited mathematics, text/JSON import with explicit invalid-row feedback, JSON export, due/new/total counts, study/reveal/completion states, Again/Hard/Good/Easy scheduling, Space/Enter reveal and 1–4 grading. Importing a backup starts a fresh schedule; the UI says so. Easy waits longer than Good for a new card.
- Local workspace storage is per account, guards account-key switches and reports quota/read errors. Flashcards and Code Lab do **not** sync to Supabase. No data migration or database deployment was performed.
- Lovable's final typography/palette: Nunito Sans UI, STIX Two Text mathematics, JetBrains Mono code, monochrome light/dark surfaces. Shared buttons/dialogs/selects and note icons are reused. The navigation band occupies its own 52px outside the canvas. Notes retain the current A4 measurement and footer implementation. Narrow notes start with the sidebar closed; its overlay/collapse control sits below navigation. Mobile note actions wrap onto their own row.

## Verification evidence

- `tsc --noEmit`: passed. The existing Editor `@ts-nocheck` remains a limitation.
- `npm run test`: 40 tests passed across 9 files, including the existing document/paste/pagination/math/recovery suites plus new scheduling/import/account-storage cases.
- ESLint for new modules, Home, workspace primitives and touched routes: passed.
- Editor lint: 15 errors / 2 warnings, identical counts to `git show HEAD:src/components/editor/Editor.tsx` checked through the same ESLint configuration. Existing typing, empty-catch, escape and hook diagnostics remain.
- Production build: passed with the existing large-chunk warnings; this is not a deployment check.
- Formatting and `git diff --check`: checked for task files.

Browser checks used the full TanStack app on localhost with a **browser-only Supabase module stub and synthetic local notes**, without cloud writes. The unmodified app first reproduced the known missing Supabase configuration error. Checks exercised:

1. Notes → Flashcards → add a maths card → reveal with Space → grade with 3 → completion → reload (review date retained).
2. Bulk import, card edit, JSON backup download, new deck and confirmed deck deletion.
3. JavaScript sample with dataset → rendered output in Code Lab; Monaco loaded successfully. A direct browser-worker Python run returned the expected row count of 2 for a synthetic two-row dataset.
4. Note typing → another workspace → Notes (edit retained); search shortcut, query, arrow/Enter result navigation and equation popover opening.
5. Light/dark desktop and 390px mobile layouts, plus reduced-motion emulation. Mobile document `scrollWidth` equaled viewport width (390px). Desktop sheet width measured 793.6875px, matching A4 at CSS 96dpi. After layout settled, a single typed character left document scrollTop unchanged at 2863px.

Screenshots: `output/playwright/lovable-*.png`; a synthetic card backup is `output/playwright/lovable-flashcards-backup.json`. These are local verification artifacts, not production data.

Untested: live authentication/cloud save/share/history, deployed authorization and C++ compiler endpoint, screen readers, production deployment and print/PDF export after the typography change. Existing persistence modules and the export implementation were preserved, but that alone does not establish end-to-end verification.
