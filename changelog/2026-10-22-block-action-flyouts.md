# Compact block actions and side-opening conversions

Lemma's block menu previously expanded “Turn into” as an indented list inside the action menu. Opening it made the menu tall, displaced common actions, and required scrolling. The replacement follows the supplied Notion reference: compact icon rows, separate action groups, a current block label, and quiet word/character counts at the bottom. Turn into and Color open separate submenus. Only working Lemma actions are included.

## Behavior and usage

- Click a block's grip and hover or click **Turn into** to open the conversion flyout. Each type has an icon, and the current text/heading/code type has a checkmark. Text, headings 1–3, bullet/task lists and quotes remain available; numbered lists and code now expose existing editor commands here too.
- Search an action or a type directly, for example `heading 2`, then use Down and Enter to apply it. Empty results show “No actions found.”
- Use Up/Down to navigate, Right to enter a submenu, Left to return, and Escape to dismiss. Color choices are in a separate flyout rather than an always-visible swatch row.
- Desktop menus use Radix collision placement. At widths of 560px or below, submenus use a viewport-inset panel with a Back row so they cannot extend past either edge. Their height is bounded and scrolls on short screens.
- Grip dragging, copy, duplicate, move and delete remain available. Copy/move actions have no invented keyboard shortcuts. Editor focus returns without requesting scroll after menu closure.

## Implementation and compatibility

`src/components/editor/BlockControls.tsx` uses the installed Radix dropdown primitives for nested menus, focus handling, dismissal and positioning. Portals stay inside the workspace controls to inherit Lemma's theme. Mouse and touch pointer-down propagation on the grip is stopped before Radix's trigger handler; clicks open the menu, while native drag initiation remains available. Existing CSS rules for the replaced inline menu were removed and replaced with scoped menu styles in `src/styles.css`. The mobile submenu stacking overrides the existing global popper z-index so its lower choices stay selectable above the parent menu.

This changes editing controls, with no storage-format, SQL, dependency, auth, network or printable-canvas geometry changes. It does not add Notion-only features such as synced blocks, comments, or page conversion. Existing list/quote conversion semantics are retained; this is not a redesign of container transformations.

## Verification and limits

- `npm run test`: 50 tests passed in 11 files.
- `tsc --noEmit`: passed.
- Targeted ESLint: no errors, one existing Fast Refresh warning for the exported `moveBlock` helper sharing a component file.
- Production build: passed; existing bundle-size warnings remain.
- Changed-file Prettier and `git diff --check`: passed.
- Playwright exercised an isolated real TipTap editor using the production BlockControls and stylesheet: heading conversion and search targeting, Up/Down/Right/Left/Enter/Escape navigation, native drag movement, duplication, color application, mobile Back and submenu containment at 390×844. Screenshots inspected desktop light, desktop dark and mobile dark menus, including reduced-motion preference. The mobile submenu measured x=12 through x=378 at 390px and its lowest row was unobstructed.

The browser fixture uses synthetic text and no cloud/auth connection. Full workspace integration, live persistence, screen readers, physical touch devices, clipboard permissions, print/export and deployment were not verified. The existing standalone full-workspace check configuration could not resolve TanStack server virtual entries, so visual checks used the isolated editor fixture. No release is implied.

## Rollback

Revert this change with a new commit to restore the previous menu. No data migration or cleanup is needed. Preserve published Lovable history.
