# Dashboard spacing and grouped surfaces — 2026-10-23

The home dashboard previously touched the sidebar edge, stretched its actions across the workspace, and placed an absolutely positioned Open badge over the latest note’s metadata. Recent notes and weekly activity had lost their backgrounds, borders and padding through competing CSS overrides.

The dashboard now uses a centered 1120px shell with responsive outer gutters and a 24px spacing rhythm. Quick actions, Continue writing, Recent notes and This week use subtle theme-derived backgrounds, existing 10px corner tokens and visible borders. The heading, action strip and cards share alignment. Weekly spaces are separated from the activity summary with an inset divider.

Continue writing is a full-width button with a two-column layout: note text and Open sit beside one another on desktop, then stack on narrow screens. Long titles, folder labels and account names wrap without moving controls over text. Recent-note icons retain their size, folder chips wrap, and dashboard buttons have explicit keyboard focus outlines. The chart bars can shrink to leave room for weekday labels.

Implementation is scoped to `Home.tsx` and the final dashboard CSS section in `src/styles.css`, using existing Button, NoteIcon, theme colors and spacing/radius tokens. A local dashboard surface token mixes paper with 4% ink, keeping backgrounds distinct in light and dark themes. The effective selectors account for older overrides; unrelated editor styles and existing document-preview work are preserved. Apple’s [layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout) informed alignment, grouping and adaptable spacing. No third-party global skill was installed.

## Usage and compatibility

Open All notes to view the dashboard. New note, New folder, Search, Favorites, recent-note and folder actions retain their callbacks. Click anywhere in Continue writing to reopen the latest note. At narrow widths the actions form two columns and the content cards stack.

No dependency, route, database, persistence, auth, sharing or printable canvas changes. No migration or deployment required by this change beyond normal application deployment.

## Verification

- `npm run test`: passed, 11 files / 50 tests.
- `./node_modules/.bin/tsc --noEmit`: passed; existing unchecked modules remain outside type coverage.
- `./node_modules/.bin/eslint src/components/editor/Home.tsx`: passed.
- `npm run build`: passed, existing bundle-size warnings remain.
- Prettier check on the changed component and CSS, and `git diff --check`: passed.
- Playwright preview of the actual Home component and production stylesheet with synthetic data: screenshots inspected at 1550px desktop and 390px mobile/dark. Checked horizontal overflow at 320, 768 and 1550px with a long account name; New note/Open callbacks and a 2px keyboard focus outline passed. Mobile preview hid the synthetic sidebar to model the available content width. Reduced-motion emulation was enabled during mobile checks.
- Preview artifacts are ignored under `output/playwright/home-spacing*`. The isolated preview required a restricted Vite dependency entry because the generic fixture configuration scanned TanStack server imports.

Live authenticated workspace flows, physical touch, screen readers, production deployment and full sidebar responsiveness were not verified. No new permanent tests were added for this presentation-only change.

## Rollback

Revert the Home copy wrapper and the final “Dashboard layout” CSS section in a new commit. Do not revert unrelated document-preview changes or rewrite published Lovable history. No data rollback is needed.
