# Branch inventory and maintenance

Inspected on 2026-10-25 after fetching `origin`. Counts compare committed branch tips with `master` at `20f50cf`; local uncommitted cleanup is separate. This is a dated inventory, not a live branch dashboard. No branches were deleted or pushed during this review.

Each branch contains its full ancestor history. The descriptions below highlight the work that distinguishes its stage of development. A local branch and its matching `origin/` reference are the same work when they point to the same commit.

| Branch                                                    | Tip       | Commits behind / unique relative to master | Contents and recommendation                                                                                                                                                                                                                     |
| --------------------------------------------------------- | --------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `master` (local and origin)                               | `20f50cf` | 0 / 0                                      | Current TanStack/Lovable application: continuous notes, math/graphs, attachments/export, Code Lab, flashcards, unified tabs and split panes. Keep as the integration branch.                                                                    |
| `codex/lovable-ui-flashcards` (local only)                | `7dfceed` | 1 / 0                                      | Lovable workspace integration, code themes/shortcuts, editor/PDF interaction polish and block-action flyouts. All committed work is already in master. Retire after approval; start future study-tool changes from current master.              |
| `codex/workspace-documents-math-tools` (local and origin) | `296be54` | 5 / 0                                      | Attachments, reference reading, columns, icons, expanded equations/graphs, export and large-draft recovery. All committed work is already in master. Retire after approval; use fresh branches for future document/math work.                   |
| `design/modern-minimalist-workspace` (origin only)        | `d97ba4e` | 12 / 0                                     | Earlier Next.js student workspace, graph hardening, auth and themes. Its history is included in master, which has since moved to TanStack. Retire after approval and checking external branch consumers.                                        |
| `lovable/frontend-refinement-2026-10-06` (origin only)    | `dd6c2c9` | 10 / 0                                     | Lovable frontend rebuild, TanStack port and deployment/formatting fixes. Its history is included in master. Check Lovable/GitHub/deployment branch settings before retiring it.                                                                 |
| `codex/editor-redesign-wip` (local and origin)            | `0009b32` | 12 / 1                                     | Divergent Next.js editor redesign: sidebar/outline/search/math UI, clipboard/pagination helpers, signed-in startup fix, graph-cache cleanup, and Chrome/WebKit regression harnesses. Preserve until a selective source/test review is complete. |

`origin/HEAD` is the remote default-branch pointer to `master`, not another development branch.

## Unmerged redesign work

The redesign branch predates the TanStack port. Do not merge its entire tree or replace current editor/CSS files with the old versions. Many UI ideas now exist in newer implementations, but ancestry alone does not establish that its bug fixes and regression coverage were preserved.

Review the unique commit's `docs/auth-startup-fix.md`, `docs/graph-memory-fix.md`, `docs/ui-redesign.md` and `tests/*.mjs`. Compare their intent with current `src/components/editor/Editor.tsx`, `graph.tsx` and workspace session gating. In particular, review duplicate initial-session loading and function-plot chart/listener/cache cleanup. Those are review candidates, not confirmed current regressions. Adapt useful tests and fixes on a fresh branch from master, validate them, then archive the old tip with a tag before considering deletion.

## Ongoing workflow

1. Finish and verify the existing working-tree cleanup before switching branches. Keep its root changelog section aligned with the final commit.
2. Use master as the common source of truth. Existing feature branches are historical stages, not permanent containers for separate product modules.
3. Start one short-lived branch per focused task, for example `codex/editor-startup-regression`, `codex/graph-lifecycle`, or `codex/dependency-maintenance`. These are suggested names; none were created by this review.
4. Keep dependency upgrades, persistence changes and visual redesigns separately reviewable. Re-run relevant checks after each change; live services need their own verification.
5. Retire branches only after confirming unique commits, PRs and external consumers. Preserve unique historical work with a tag where appropriate. Deleting a merged branch pointer does not remove its commits from master's history.
6. Never force-push or rebase/amend/squash published commits: Lovable depends on the published history. Branch protection, deployment settings and live service behavior were not inspected here.

To refresh the inventory, fetch origin, inspect `git branch -avv`, use `git rev-list --left-right --count master...<branch>` for divergence, and inspect `git log master..<branch>` for unique work. Branch names alone do not prove whether changes have been integrated.
