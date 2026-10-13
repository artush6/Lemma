# Controlled legacy cleanup

1. Find duplicated implementations, dead routes/components, unreferenced utilities, abandoned feature flags and obsolete styles.
2. Prove non-use via textual references, dynamic import search, route configuration, tests and runtime behavior.
3. Classify SAFE / NEEDS MIGRATION / KEEP.
4. Remove SAFE items in small batches, update imports, simplify contracts and add tests when beneficial.
5. Never silently drop persisted data, shared APIs, rollback support or actively consumed endpoints.
6. Run targeted and full relevant checks; report diff and rollback plan.

## Lemma scope

Read `.agents/PROJECT_PROFILE.md` and the project application rules in `.agents/CHARTER.md`. Apply these steps only to the requested scope. Follow existing TanStack/Lovable entrypoints, Lemma CSS, recorded Drizzle SQL and Supabase RLS. Unknown live state is unverified. Examples are inert; broad refactoring, destructive or production-sensitive actions require approval.
