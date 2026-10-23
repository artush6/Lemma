# Larger document reading pane

Date: 2026-10-23

## Behavior and usage

Opening a document beside a note now gives the reading pane more width: 46vw, capped at 800px, instead of 42vw capped at 580px. Left and right docking use one shared CSS width, including the graph-panel offset. Narrow screens retain the full-width overlay.

The attachment preview fills the remaining pane height beneath its header. Previously the inline attachment rule still capped the docked iframe at 65vh and retained preview margins and body padding, leaving unused space around the PDF. The dock removes that cap and spacing, with the download action as an accessible icon in the header. Use Open beside note or the reference pane PDF button as before; no new setting is needed. Inline previews keep their existing sizing.

## Implementation and compatibility

`src/styles.css` controls layout; `ReferencePane.tsx` supplies the labeled header download link and hides the shared `AttachmentPreview` download row only in the dock. Inline previews retain their download links. Existing theme tokens, header controls and browser PDF viewer remain in use. No dependencies, note formats, stored files, migrations or external services change. Native PDF zoom remains browser controlled.

## Verification and limits

- `npm run build`: passed, including the final header-icon revision.
- `tsc --noEmit`: passed.
- Targeted ESLint on both changed TSX files: zero errors, two existing Fast Refresh export warnings in attachments.
- Final browser fixture inspection confirmed the labeled header icon and zero bottom download links.
- `prettier --check src/styles.css`: passed.
- `git diff --check`: passed.
- Browser inspection used a synthetic layout fixture with production CSS. At 1422×800 the pane measured about 654px wide and the iframe about 705px high, ending directly above its then-present download row; the final revision moves that action to the header and gives its height back to the iframe. A nested 390×844 fixture visually retained the full-width reading overlay.
- The old full-editor fixture could not start because its standalone Vite configuration lacks TanStack entry aliases; the layout fixture was served separately. Full authenticated workspace interactions, native PDF rendering/zoom, print and deployment were not verified. No unit tests were added for this CSS-only adjustment.

## Rollback

Revert the CSS changes with a new commit, preserving published Lovable history. No data rollback is required.
