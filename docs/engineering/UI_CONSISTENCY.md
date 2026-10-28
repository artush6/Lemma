# Compact workspace controls

Inspected and updated 2026-10-28. This pass covers the shared controls and chrome used by Notes, Home/library, Code Lab, Flashcards and Settings. Browser checks use synthetic local notes and stubbed auth/repository methods, with React and Tailwind enabled in the local fixture.

| Observed inconsistency                                                            | Implemented pattern                                                                              |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Header sections relied on absolute offsets, with several conflicting mobile rules | Three-column grid; centered space switcher; clipped breadcrumb; compact actions                  |
| Buttons translated on hover and scaled on press                                   | Standard shadcn-style native Button/Slot with color and focus feedback                           |
| Native settings selects differed from other menus                                 | Shared Radix/shadcn WorkspaceSelect and Input; existing Switch retained                          |
| Menu rows varied from 28px to 38px and used different padding                     | Shared 28px minimum rows, 8px horizontal padding, 4px popup padding, 13px labels                 |
| Sidebar mixed 32/34/36px rows with accumulated margins                            | 32px normal / 28px compact rows; explicit group spacing on the existing 4px scale                |
| Mobile settings kept a narrow vertical category rail                              | Horizontally scrolling categories and full-width content; selects stack below their labels       |
| Library initially rendered empty note chrome before loading                       | Initialize the embedded library state from resource identity; only portal a matching note header |

## Shared sources

- `src/components/ui/button.tsx`: static native/ref-forwarding buttons, Radix Slot support, 32px default and 28px small/icon-small sizes. Semantic variants and disabled/focus behavior remain shared.
- `src/components/ui/input.tsx`, `select.tsx`, `workspace-select.tsx`: common form controls and keyboard-selectable menus. Native document-title and editor-content fields retain their specific behavior.
- `src/components/ui/dropdown-menu.tsx`, `context-menu.tsx`: existing Radix keyboard, focus and collision handling; stable `data-slot` hooks identify shared popup surfaces.
- `src/components/workspace/NoteHeader.tsx`: shared Buttons for breadcrumb/actions and existing DropdownMenu for Edit/Read and overflow. Focus and Share remain available in overflow when their direct buttons are hidden on small screens.
- Final “Compact workspace UI” section in `src/styles.css`: screen-only control sizing and layout; reuse `--space-1/2/3/4/6/8` (4/8/12/16/24/32px), existing radii and light/dark surface tokens. `--control-height` is 32px, small is 28px, header is 48px. Older document/print styles are retained.

## Slash command lifecycle

`slashTrigger.ts` tracks the exact slash that opened a menu through ProseMirror transaction mappings. Selecting a command consumes only that valid trigger before applying the action. Escape and outside dismissal dispose the tracker without deleting text. Replaced/deleted triggers and neighbouring literal slashes are protected; insertion from the block + button or keyboard shortcuts does not remove unrelated text. Menu search remains a separate input.

## Verification and limits

102 tests across 24 files, type checking, reachability (117 modules / 31 roots), focused shared-component lint and production build passed. Editor retains its existing 15 lint errors / 1 warning; shared-component lint has two existing Fast Refresh warnings. No rules were weakened.

Browser checks covered slash visibility/cancellation, keyboard heading conversion and clicked equation insertion without a leftover slash; light/dark controls; settings Select keyboard/focus behavior; header/menu/sidebar at desktop and 320/390px widths; full-width mobile settings; Home, Code Lab and Flashcards rendering; and local JavaScript Run success. At 320px, the navigation groups fit independently and document scrollWidth was 320px. Desktop A4 width remained 793.6875px. The browser fixture was corrected to include Tailwind so shared utility classes match the app pipeline.

Live auth/cloud/share/history, native PDF rendering, physical touch, screen readers, print output and deployment remain unverified. Reduced-motion rules were retained and shared button movement removed; an emulated reduced-motion browser run was not performed. No dependency, route, stored note/page/layout shape, SQL or authorization changes. Existing uncommitted split-workspace work remains intact. Rollback uses a normal revert of this UI/trigger change and needs no data migration.

The subsequent Flashcards import/scrolling and tool-sidebar settings follow-up is recorded in the same combined commit section at `CHANGELOG.md#workspace-controls-and-card-imports`. Theme/preferences now share `src/lib/devicePreferences.ts` notifications across cached views. `SidebarPreferences.tsx` provides the tool-sidebar footer without relying on a note.
