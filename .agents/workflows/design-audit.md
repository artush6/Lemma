# Design audit workflow

1. Inventory all relevant routes, shared components, design tokens and responsive breakpoints.
2. Capture screenshots at representative widths if tooling available; inspect visual hierarchy, spacing rhythm, alignments, density, typography, fields, focus and color consistency.
3. Write a discrepancy matrix: page, component, existing pattern, canonical pattern, impact, risk.
4. Choose canonical tokens and components consistent with the existing brand; **do not start with a wholesale redesign**.
5. Refactor touched areas incrementally; remove superseded styles after search and screenshot verification.
6. Test variants, mobile widths, keyboard, dark mode if supported, and `prefers-reduced-motion`.
7. Report before/after evidence and known unresolved inconsistencies.

## Lemma scope

Read `.agents/PROJECT_PROFILE.md` and the project application rules in `.agents/CHARTER.md`. Apply these steps only to the requested scope. Follow existing TanStack/Lovable entrypoints, Lemma CSS, recorded Drizzle SQL and Supabase RLS. Unknown live state is unverified. Examples are inert; broad refactoring, destructive or production-sensitive actions require approval.
