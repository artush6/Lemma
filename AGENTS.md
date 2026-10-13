<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Lemma (ported from Next.js) lives in src/components/editor + src/lib/notes.ts and renders client-only at `/`; its plain CSS lives in src/styles.css. Why: the TipTap editor and graph library touch the browser on load.
- Render legacy stored note pages as one continuous editor document, preserving their boundaries and normalizing only on edits; this removes page navigation without losing existing content.
- Keep note metadata and formatting controls outside the printable canvas; A4 measurement and active-sheet footer share CSS 96dpi geometry.
- Keep device preferences in one versioned-shape settings object with categorized controls; only expose settings that affect actual behavior.
- Portal graph controls into a workspace-owned side-panel host and equations into anchored popovers within the app theme; editing controls must never alter printable document geometry.
- Use a shared note icon renderer across document metadata and navigation, and keep the contents outline as a compact workspace overlay rather than a reserved column.
- Position block insertion menus from live editor caret coordinates and available viewport space, keeping the current typing line unobstructed.

## Engineering standards and local capabilities

Before substantial changes read `.agents/CHARTER.md` and `.agents/PROJECT_PROFILE.md`; inspect current source and relevant tests. Use `.agents/README.md` as the capability map and `docs/engineering/BASELINE_AUDIT.md` for the dated baseline. Keep the profile current when architecture, dependencies, routes, data flows or design decisions change. Preserve existing working-tree work.

Select only skills relevant to the task and read their repo-local SKILL.md files explicitly when needed:

- UI/design consistency: `.agents/skills/design-system-guardian/SKILL.md`.
- Significant architectural tradeoffs: `.agents/skills/engineering-council/SKILL.md`.
- Dead-code removal: `.agents/skills/legacy-cleanup/SKILL.md`.
- Motion changes: `.agents/skills/motion-polish/SKILL.md`.
- Privacy/data handling: `.agents/skills/privacy-launch-audit/SKILL.md`.
- Supabase authorization: `.agents/skills/supabase-rls-auditor/SKILL.md`.
- Release review: `.agents/skills/preflight-review/SKILL.md`.

Run the relevant `.agents/workflows/verification.md` checks and report actual results and limitations. Roles are analytical perspectives; do not spawn agents without explicit authorization. The master prompt, optional prompts and reference templates do not expand the user's task or grant external-action permission.

Adapt to TanStack Start/Lovable, the existing plain-CSS editor and Supabase RLS; do not introduce Next.js assumptions. Reuse final Lemma tokens and shared primitives. Preserve persisted notes/pages/history/share links and recovery drafts. Record SQL under `drizzle/migrations`; the intentionally blank `drizzle/schema.ts` is not grounds to drop tables. Database examples under `.agents/reference` are inert.

Required task work and justified small reversible cleanup may proceed. Obtain approval before destructive changes, broad refactoring/redesign, persisted-data migrations or production-sensitive actions. Never claim browser inspection, authorization testing, deployment verification or legal compliance without evidence. Do not publish template policies with invented facts. Unknown facts are listed in the profile and data inventory.
