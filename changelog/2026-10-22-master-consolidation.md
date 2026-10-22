# Consolidate current Lemma work on master

GitHub master was at `c4fa82d`, behind the current TanStack application work. This update brings the document/math workspace (`296be54`), Lovable workspace and flashcards (`e82396e`), code themes and shortcuts (`e46de5d`), editor interactions and PDF reading (`f7a3a55`), and the new compact block-action flyouts onto master without rewriting published history.

The existing feature commits remain intact. Master advances through normal Git history; no force push, rebase, amendment or squash is used. The older `codex/editor-redesign-wip` branch is preserved as a historical snapshot: its Next.js paths are not merged into the current TanStack source tree. Other existing remote branches are retained.

## Repository housekeeping

`.gitignore` now excludes local Playwright session state, generated screenshots/exports under `output/playwright`, and the untracked temporary `workspace-check` entrypoint/configuration. These files remain on the local machine. Previously tracked screenshots are left intact; this change does not delete application code or user data. New source, tests, engineering records and changelog entries are committed. No credentials, browser-session dumps or local flashcard backups are added.

## Verification and operational limits

The current changes passed 50 tests across 11 files, TypeScript, targeted BlockControls lint (one pre-existing Fast Refresh warning), changed-file formatting and production build. Browser interaction evidence and limitations are recorded in [the block-action entry](2026-10-22-block-action-flyouts.md); earlier features have their own linked entries in the index. `npm run format:check` passed for the whole repository before publishing; full-source lint retains the previously documented baseline failures.

Publishing to master may trigger the repository's existing Lovable/GitHub or hosting integrations. A successful push confirms repository synchronization, not a successful production deployment, live authentication, or database authorization. No SQL is executed and no separate deployment command is run. Roll back with a new revert commit, preserving Lovable history.
