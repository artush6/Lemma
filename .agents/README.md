# Lemma engineering capability map

Read `AGENTS.md`, `CHARTER.md` and `PROJECT_PROFILE.md` before substantial work. The dated initial audit is `docs/engineering/BASELINE_AUDIT.md`; inventories live beside it. Current source and user instructions override stale documentation. Update the profile when evidence changes.

## Repository-local skills

These seven kit skills are checked in under `.agents/skills/<name>/SKILL.md`. Agents can read them explicitly using the paths below; no global install is needed. All seven skills appeared in this Codex session’s skill catalog after installation; availability in other agent clients depends on their discovery behavior. AGENTS.md supplies explicit routing so tools that do not enumerate local skills can still load them.

| Task                               | Skill                  | Workflow            |
| ---------------------------------- | ---------------------- | ------------------- |
| UI consistency/accessibility audit | design-system-guardian | design-audit        |
| Significant architecture tradeoff  | engineering-council    | engineering-council |
| Proven dead-code cleanup           | legacy-cleanup         | legacy-cleanup      |
| Motion changes                     | motion-polish          | motion-polish       |
| Privacy/data handling readiness    | privacy-launch-audit   | privacy-and-legal   |
| Supabase authorization audit       | supabase-rls-auditor   | security-and-rls    |
| Release readiness                  | preflight-review       | production-release  |

Every workflow is `.agents/workflows/<name>.md`. Use `workflows/verification.md` for acceptance/check reporting. Load only relevant documents. `roles/` supplies twelve analytical perspectives, not a requirement for model calls or delegation. `checklists/` holds UI/motion, security, privacy and release acceptance prompts.

## Supporting material and activation boundaries

- Root `MASTER_PROMPT.md`: supplied operating reference with project precedence notice.
- `prompts/`: optional user task starters, not standing authorization.
- `templates/`: internal legal-page, 404 and processing-register starting points. They are not public policy text or verified product facts.
- `reference/quality/`: inert motion/CI examples and acceptance notes. Example YAML is outside `.github/workflows`; it is not active CI. The inactive CI proposal uses Bun 1.3.14, frozen bun.lock and the installed tsc, with public build variables to configure before activation. It does not deploy or run migrations.
- `reference/supabase/`: original example SQL/test matrix, outside active migration paths. Do not execute the example SQL. Actual resources and expected tests are in `docs/engineering/AUTHORIZATION_MATRIX.md`.

The kit was imported from the user-supplied Downloads directory on 2026-10-14. The root project's AGENTS/Lovable/editor invariants were preserved. Nothing was installed globally; runtime code, dependencies, active CI and database configuration were not modified. Documentation guides agents but does not enforce behavior mechanically; tests, CI and live checks remain separate work.
