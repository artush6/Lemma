# Branch consolidation and maintenance

Consolidation date: 2026-10-25. `master` is the single active integration branch. Start new work on short-lived `codex/<task>` branches from current master, then merge tested changes back without rewriting published history.

## Retired branches

The original inventory compared these tips with master at `20f50cf`, before the repository cleanup and selective fixes. Each branch contained its full ancestor history, not a separate product module.

| Former branch                                             | Original tip | Master-only / branch-only commits at inventory | Resolution                                                                                                                                                                                |
| --------------------------------------------------------- | ------------ | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codex/lovable-ui-flashcards` (local only)                | `7dfceed`    | 1 / 0                                          | Already included in master: Lovable study tools, themes/shortcuts, editor/PDF polish and block flyouts. Retired.                                                                          |
| `codex/workspace-documents-math-tools` (local and origin) | `296be54`    | 5 / 0                                          | Already included in master: attachments, references, columns, icons, math tools, export and large-draft recovery. Retired.                                                                |
| `design/modern-minimalist-workspace` (origin only)        | `d97ba4e`    | 12 / 0                                         | Earlier Next.js workspace, graph/auth/theme changes are ancestors of master. Retired.                                                                                                     |
| `lovable/frontend-refinement-2026-10-06` (origin only)    | `dd6c2c9`    | 10 / 0                                         | Lovable frontend rebuild, TanStack port and deployment/formatting fixes are ancestors of master. Retired.                                                                                 |
| `codex/editor-redesign-wip` (local and origin)            | `0009b32`    | 12 / 1                                         | Useful startup/recovery and graph-lifecycle behavior selectively adapted to current code; the entire original snapshot is preserved by `archive/editor-redesign-wip-2026-10-25`. Retired. |

`origin/HEAD` points to master; it is not another development branch. GitHub reported master as the default branch, no open PRs, and no protection on the branches being retired. External Lovable/Vercel dashboard branch settings and live deployment behavior were not independently verified.

## What was preserved from the old redesign

The unique Next.js commit was reviewed instead of merging its tree wholesale over the newer TanStack application. Its sidebar, outline, search, equation palette, clipboard and pagination ideas have newer implementations in current source. Its old CSS, page-navigation model, graph renderer and Next.js browser harnesses were preserved in the archive rather than replacing current behavior.

Current Editor now uses INITIAL_SESSION as its single startup source, defers queries outside the auth callback, reads the current owner through a stable ref and avoids reloading notes on same-account token renewal/sign-in events. Pending startup work is canceled on sign-out/disposal; account changes trigger a new load. Offline recovery respects existing note/page/read query parameters. Auth event tests cover startup, token renewal, account changes, shared links and disposal.

The old graph-memory report described chart retention; its final GraphView used a different SVG renderer. The current function-plot renderer was retained and given explicit ownership: construct the Chart before build, remove listeners/cache entries on cleanup, and also clean up if build throws. Tests use the real installed plotting library over 20 render/dispose cycles and exercise failure isolation. A local browser fixture confirmed 20 redraws leave one SVG/cache entry and clearing leaves zero. This is not a total-process-memory benchmark or live-cloud verification.

## Recovering historical work

All merged branch tips remain reachable through master's history. The unique redesign remains reachable through the annotated archive tag, including its original docs and Chrome/WebKit harnesses. To inspect it:

```sh
git show archive/editor-redesign-wip-2026-10-25:docs/ui-redesign.md
git show archive/editor-redesign-wip-2026-10-25:docs/auth-startup-fix.md
git show archive/editor-redesign-wip-2026-10-25:docs/graph-memory-fix.md
```

To resume that old snapshot for investigation, create a new branch from its tag; do not reset master to it. To recreate another retired branch, use its original tip listed above. Reintroduce a fix on current master with fresh tests rather than merging obsolete framework files blindly.

## Ongoing workflow

- Use master as the common source of truth. Branches are temporary units of work, not permanent containers for Notes, Code Lab or Flashcards.
- Keep dependency upgrades, persistence changes and visual redesigns separately reviewable. Update package.json and bun.lock together; keep TipTap versions aligned.
- Run the README checks before integration. CI checks formatting, source reachability, types, tests and build; full lint still has recorded legacy findings.
- Add exactly one root CHANGELOG.md section per commit. Report live auth/RLS, browser and deployment checks separately from local tests/builds.
- Before future branch retirement, fetch origin, compare unique commits and check PR/default/protection status. Archive unique work before removing its branch pointer.
- Never force-push or rebase/amend/squash published commits: Lovable depends on that history. Use new commits to fix or revert published work.
