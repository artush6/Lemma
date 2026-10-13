# Verification workflow

1. Review change impact and establish acceptance criteria.
2. Run formatter/lint/types and unit tests relevant to changes; broader regression suite where warranted.
3. For UI run actual browser/E2E flows across relevant viewport sizes and keyboard/screen-reader semantics if supported.
4. Test loading/empty/error/expired session, offline/slow network where applicable.
5. For database changes run migrations in isolated environment and **negative** access tests with multiple identities.
6. Run production build; check no credentials or personal data in output/logs.
7. Summarize exact commands and results; document failures and untested surfaces honestly.

## Lemma scope

Read `.agents/PROJECT_PROFILE.md` and the project application rules in `.agents/CHARTER.md`. Apply these steps only to the requested scope. Follow existing TanStack/Lovable entrypoints, Lemma CSS, recorded Drizzle SQL and Supabase RLS. Unknown live state is unverified. Examples are inert; broad refactoring, destructive or production-sensitive actions require approval.
