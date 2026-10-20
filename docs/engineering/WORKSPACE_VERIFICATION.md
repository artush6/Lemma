# Workspace implementation verification

Date: 2026-10-20. Scope: resumed documents/math workspace changes on a separate feature branch. Synthetic browser notes only; Supabase was replaced with a null client through a browser request intercept. No live database writes, deployment or published-history rewrite.

## Delivered scope

- Block drag handles plus keyboard-accessible move/duplicate/delete and insertion controls.
- File attachment blocks with PDF/text preview, download, and reference-pane opening. PDF maximum 5 MiB; other supported formats 2 MiB.
- Read-only side-by-side notes/documents, and document import into the current library folder.
- Searchable shared SVG icon catalog and palette colors, retaining emoji compatibility.
- Explicit ordered/nested list markers and crisp A4 separation.
- Matching-color LaTeX brackets, safe vertical field resizing, expanded source/preview dialog.
- PDF/LaTeX export dialog and direct downloads; manual PDF page breaks preserved.
- Long LaTeX graph expressions, pasted expression rows, definitions and shifted function calls.
- Image/graph width resizing and graph height resizing, including keyboard controls.
- Two/three-column editing with mobile stacking and Mod-Enter continuation.
- IndexedDB overflow recovery for large drafts, storage-failure feedback and isolated undo history on note loads.

## Architecture decision

Alternatives considered: (A) keep attachments in existing note JSON with additive IndexedDB recovery; (B) add object storage with separate file records; (C) store only remote file links. A preserves existing owner/history/share contracts and requires no persisted database migration. B would better support larger libraries but requires storage authorization, migration and retention decisions outside this update. C would make attachments dependent on external access and availability. The chosen implementation keeps explicit limits; large note payloads and version storage remain a practical constraint. Reference notes are read-only, avoiding simultaneous autosave writers.

## Evidence and limits

Browser evidence is under `output/playwright/completed-*` locally. PDF output was rendered with Poppler and visually inspected for equations, graph, lists, columns, page boundaries and line clearance. It downloads directly without Print. LaTeX source downloads contain original math and escaped text. PDF output is rasterized; attached files are not merged and LaTeX media is descriptive rather than embedded.

The exact 5 MiB synthetic PDF imported and opened in the reference pane, and survived reload. A separate 7 MiB synthetic recovery value survived reload from IndexedDB and was removed. Browser checks also exercised icon search/palette and graph keyboard resizing. The plotting engine now consumes compiled mathjs functions; this fixes a browser-observed failure on `pi` that parser-only tests did not catch.

Undo checks exposed document-load transactions grouped with edits, and canonical page-break attributes triggering reloads after edits. Loading now starts a new editor history and synchronization tracks canonical content. Regression tests cover edit/undo and switching documents.

Live authenticated CRUD, failed cloud saves, account-switch races against real sessions, shared-link access, RLS, deployment, screen readers and LuaLaTeX compilation were not tested. Existing `@ts-nocheck` coverage limits remain. Source lint has existing errors; new standalone modules are lint-checked separately. Temporary local fixture files and generated browser logs/downloads are verification aids, not product routes.

## Final checks

- `npm test`: 29 tests passed across 7 files.
- `npx tsc --noEmit`: passed (ported core modules still use `@ts-nocheck`).
- `npm run build`: passed; existing chunk-size warnings remain.
- Targeted `prettier --check` on all shipped changes: passed; `git diff --check`: passed.
- Targeted ESLint on new standalone source/tests: 0 errors, 3 fast-refresh export warnings.
- `npx eslint src`: 33 errors, 23 warnings; the errors remain in existing ported/source modules (typing suppression, explicit any, empty catches and escapes). Generated build output was excluded by scoping lint to source.
- Browser: block duplicate → Undo preserves the loaded content; a drag operation completes; image/graph keyboard resize; searchable blue SVG icon persists; mobile expanded equation stays within 390×844 viewport; mobile dark reference pane layering corrected and checked under reduced-motion emulation.

Local source fixture files (`workspace-check.html`, `src/workspace-check.tsx`, `vite.workspace-check.config.ts`) and generated screenshots/downloads/logs remain available in the working directory for inspection and are excluded from the feature commit. They contain synthetic verification setup and do not change the production route.
