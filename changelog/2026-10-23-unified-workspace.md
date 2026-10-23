# Unified tabs, pane menus and drag-to-split workspace

Date: 2026-10-23. Implementation prepared for master; deployment has not been verified.

## What changed and why

Notes, PDFs/documents, Code Lab and Flashcards now open in one tabbed workspace. Previously, study tools replaced the notes workspace and references occupied a separate preview subsystem. The default is one pane; a second pane extends the same tab model. Notes can sit beside other editable notes, PDFs or study tools.

The global header has centered Notes / Code Lab / Flashcards navigation, one library/home action and a compact breadcrumb. Active notes expose an explicit Edit/Read dropdown, Focus, save state, Share and an overflow menu. The extra title/tag/folder strip and permanent format ribbon are hidden in this shell. Rename via the breadcrumb or overflow; export, history, favorites, settings and optional note-sidebar access remain available. Contextual formatting, slash commands, block controls and note contents remain intact.

Each pane's + opens a compact menu for a new note, PDF/document, existing document, Code Lab or Flashcards. The invoking pane is the destination. Existing-resource selection opens a centered searchable modal with one destination, instead of duplicating all resources in current/beside lists. In a single pane, the + menu also offers opening resources on the right and starting a side-by-side comparison.

## How it works

- `workspace/model.ts` is a typed state model with resource identity, ordered tabs, independently active tabs, active pane, orientation and ratio. A localStorage parser discards invalid references and clamps the ratio.
- `Workspace.tsx` renders stable resource components as grid children. Switching, moving and reordering tabs changes placement/visibility instead of recreating editors. Closed resources stay mounted, hidden, for the current session so a pending autosave is not canceled and reopening preserves undo/selection/scroll. Only open descriptors are restored after refresh.
- One editable instance exists per note resource. Showing that note simultaneously in both panes uses the existing read-only ReferencePane for the second view. A second study-tool view links back to its single live instance, avoiding competing device-storage writers.
- Editor accepts a workspace adapter for navigation, note identity, catalog metadata updates and header portals. Hidden editors and tools ignore global shortcuts. Graph controls resolve their host inside the owning editor workspace, avoiding cross-pane portals. Missing notes do not fall back to an unrelated editable note. Successful deletion closes/removes cached views; ordinary tab closure never calls deletion. Renames write recovery drafts immediately. Node views subscribe to editor editability so graph/image controls respond to Read/Edit without changing note content.
- A thin workspace shell was chosen over rewriting TipTap, duplicating editable views or adding a docking dependency. Existing editor extensions, continuous legacy content, note persistence and A4 geometry remain in place. Shared-note URLs use the original standalone Editor flow.

## Everyday usage

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

## Data and compatibility

Layout descriptors are device-local under `lemma:<owner>:workspace:v1`. Directly opened files are cached separately in IndexedDB `lemma-workspace-files` / `files`, under owner + SHA-256 identity. Existing attachment validation and limits apply. Cache failures show a message while allowing the current file to remain open. Closing tabs or signing out does not erase cached file bytes; clear site data to remove that cache. These files are not automatically uploaded or inserted into notes. Attachments inserted into notes retain their existing persistence/sharing behavior. No SQL migration, dependency or server authorization change was introduced. The data inventory records this distinction.

PDF controls come from the browser's native embedded PDF viewer, including navigation/search/zoom/fit when supported. Text is previewed locally; Office documents retain download behavior. There is no custom PDF renderer or cross-browser control guarantee.

## Verification

- `npm test`: **64 tests passed across 15 files**, including workspace transitions/restoration, identity safety, retained view state, narrow-screen split preservation, explicit Read/Edit selection, centered picking and per-pane + targeting.
- `./node_modules/.bin/tsc --noEmit`: passed. The existing Editor `@ts-nocheck` limitation remains.
- Focused ESLint on the new workspace modules and touched study-tool/dialog modules: passed.
- `./node_modules/.bin/eslint src`: reports existing repository failures (33 errors, 23 warnings in the inspected run), including legacy `@ts-nocheck`, explicit-any, empty catch blocks and hook warnings. No errors were reported in new workspace modules. The repository-wide lint command, even excluding generated Vercel/output directories, stalled and was interrupted; it is not claimed to pass.
- Production build: passed with existing large-chunk warnings; no deployment was performed.
- Actual in-app browser inspection used the real editor, workspace and CSS with synthetic notes and mocked repository/auth calls. It exercised native tab dragging into a right split, independent note selection, opening Code Lab alongside a note, centered navigation/picker, and Focus/restore. Read-only editor DOM and disabled graph editing were inspected. Fixture-server dependency aliases disable real account writes and C++ execution. Playwright CLI could not be fetched because registry DNS was unavailable; browser checks used the app's computer-use tools instead.

## Limitations and rollback

Live auth/cloud-save failure races, deployed RLS, production sharing, physical touch drag, full screen-reader evaluation and native PDF controls across browsers were not tested. Responsive state is covered by component tests; actual browser inspection used the available desktop-sized viewport and narrow split containers. Session caching grows with resources opened until refresh/sign-out. Closed-tab state is retained only for the current session; undo/selection are not serialized across reload. Direct-file cache currently has no app-level purge/retention control. One live Code Lab/Flashcards session is shared across its view identity.

Rollback the workspace route and adapter/header/style additions with a new revert commit; do not rewrite published Lovable history. Old note/page/history/share formats are untouched. Device layout/file caches may remain unused after rollback and can be cleared via site data independently of cloud notes. Existing unrelated dashboard/reference-preview work in the working tree was preserved.
