# Lemma changelog

This folder explains significant changes in enough detail to understand, use and maintain them. Git commits record the exact diff; these entries record the problem, decisions, behavior and practical consequences.

## Entries

- [2026-10-22 — Consolidate current work on master](2026-10-22-master-consolidation.md)

- [2026-10-22 — Compact block actions and conversion flyouts](2026-10-22-block-action-flyouts.md)
- [2026-10-22 — Editor interactions, typography and flexible reading](2026-10-22-editor-interactions-and-reading.md)
- [2026-10-22 — Code themes, status colors, shortcuts and changelog policy](2026-10-22-code-themes-and-changelog.md)
- [2026-10-22 — Lovable workspace and flashcard integration](2026-10-22-lovable-workspaces.md)

## When to write an entry

Every agent working in this repository must add or update an entry when a change is significant or difficult to explain in a single commit message. This includes substantial features, behavior/design changes, architectural decisions, dependency/infrastructure changes and important fixes. A tiny typo or routine formatting-only change does not need a separate entry. Several commits for the same feature can share one entry.

Create the entry **in the same branch/change**, before committing or opening/updating a PR; update it when the implementation changes. Use `YYYY-MM-DD-short-description.md`. Use a suffix for separate entries on the same date. Keep this index current. Describe actual work and evidence, including limits; do not invent releases, deployments or test results. Never include secrets or personal note content. Documentation is required even when a PR description or engineering verification report also exists; link those documents instead of copying long technical logs.

## What a useful entry contains

Scale the detail to the change. For a substantial change cover:

1. **What and why:** the user-facing problem, previous behavior and resulting behavior.
2. **How:** the implementation approach, important files, alternatives/tradeoffs and compatibility decisions.
3. **Examples:** how to use it, before/after examples, commands or shortcuts as appropriate.
4. **Data and operations:** persistence, migrations, dependencies, privacy/security effects and deployment requirements, if relevant.
5. **Verification:** checks actually run and their results; what remains untested or blocked.
6. **Limitations and rollback:** practical constraints, follow-ups and how to undo safely. Revert with new commits; preserve Lovable's published history.
7. **References:** relevant commit/PR identifiers when available. Do not guess identifiers before they exist.

Write for the project owner who has not read the chat. Lead with concrete behavior, explain the reasoning in plain language and make important limitations easy to find. A one-line list of filenames is not a sufficient entry.
