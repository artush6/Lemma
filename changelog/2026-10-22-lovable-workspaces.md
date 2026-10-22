# Lovable workspaces and flashcards

Date: 2026-10-22. Implementation: `e82396e` on `codex/lovable-ui-flashcards`. This entry documents the preceding integration retrospectively, when the changelog folder was introduced. It is not a deployment announcement.

## What changed and why

Lemma gained three connected workspaces: Notes, Code Lab and Flashcards, plus a Home view for returning to recent notes. The user wanted Lovable's new design and features while keeping the editor improvements made since that export. Flashcards were a particular priority.

The export contained an older version of the editor, so replacing the application with it would have removed working features. Instead, the new workspace modules were integrated into the current editor. The block controls, columns, attachments, reference pane, richer icon picker, equation and graph editing, exports, search, recovery storage and pagination implementations were retained.

## How it works

`Editor.tsx` owns workspace selection; Code Lab and Flashcards load lazily. The URL uses `?space=code` or `?space=cards` and retains the selected note/page so switching back returns to it. Alt+1, Alt+2 and Alt+3 switch workspaces. Browser back/forward respects workspace selection. Shared notes stay in Notes. Workspace navigation occupies its own band outside the printable canvas.

The integration follows Lovable's final typography: Nunito Sans for controls, STIX Two Text for mathematics and JetBrains Mono for code. It initially used monochrome surfaces and feedback; the subsequent theme entry explains the semantic colors added later. Narrow notes start with the sidebar closed, with its controls below the navigation band.

## Using the new features

- **Home:** resume your latest note, open recent notes, create notes/folders, search or open favorites. The weekly display is a snapshot of each note's latest edit, not a complete history of writing activity.
- **Code Lab:** edit JavaScript, Python or C++, choose datasets, run the code and inspect output. Organize files into folders, open a temporary PDF beside code and export a JSON backup.
- **Flashcards:** create a deck; add a question and answer; use `$x^2$` for inline mathematics or `$$...$$` for a display formula. Start Study, reveal the answer with Space/Enter and grade with 1–4. Again repeats in ten minutes; Good starts at one day; Easy waits longer.
- **Import:** paste `Derivative of $x^2$; $2x$`, tab-separated spreadsheet columns or a JSON deck. Invalid rows produce feedback rather than being silently discarded. Imported cards begin with a fresh review schedule, including cards from an exported backup.

## Persistence and external services

Notes retain their existing repository and recovery behavior. Code Lab and flashcard data are stored **on this device**, under separate per-account localStorage keys; they do not sync through Supabase. The storage hook guards against writing one account's loaded state under another account's key and reports read/quota errors. Export a backup before relying on device-only storage. Sign-out does not erase it.

Monaco and Python's Pyodide runtime load from jsDelivr. JavaScript and Python execute in disposable browser workers with timeouts. C++ sends source and selected input through an authenticated server function to Compiler Explorer. These workers are not a verified security boundary for hostile code. Provider retention and deployed authorization remain unverified. No SQL migration, new storage bucket or note-data migration was introduced.

## Verification at integration time

40 tests across 9 files, TypeScript, targeted new-module lint, formatting, diff checks and the production build passed. The existing Editor lint baseline remained 15 errors and 2 warnings.

Browser checks used the full app with a browser-only Supabase stub and synthetic notes. They exercised flashcard add/edit/import/export/deck deletion/study/reload, JavaScript and Python output, note switching with an edit retained, search navigation, equation opening and light/dark/mobile layouts. A settled single-character typing check left scrollTop unchanged. Desktop A4 width measured 793.6875px; the 390px mobile view had no page overflow.

Live authentication, cloud save/share/history, deployed authorization, C++, screen readers and print/PDF output after the typography change were not verified. Nothing was pushed or deployed during that task.

## Compatibility and rollback

There was no persisted-note format migration to reverse. Revert the integration with a new Git commit if needed; preserve published Lovable history. Export local flashcard/Code Lab work first, because an older UI will not expose those workspaces even though the device keys remain. Do not delete local keys or existing notes as part of a UI rollback.

Further detail: [engineering verification](../docs/engineering/LOVABLE_WORKSPACE_INTEGRATION.md) and [data inventory](../docs/engineering/DATA_INVENTORY.md).
