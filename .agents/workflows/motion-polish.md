# Motion and delight

1. Identify top interactions where motion explains causality (button feedback, view transitions, validation, expanding navigation, list changes).
2. Set constrained motion tokens: fast feedback ~120–180ms, medium navigation ~180–280ms as **starting points** only; spring tuning is contextual.
3. Favor transform/opacity and avoid sustained parallax or large-area movement; do not animate numerical data unnecessarily.
4. Provide motion-reduced versions with transitions removed or minimized without hiding state.
5. Test interruptions, rapid repeat interactions, reduced motion and slow hardware.
6. Compare perceived clarity and responsiveness, not animation count.

## Lemma scope

Read `.agents/PROJECT_PROFILE.md` and the project application rules in `.agents/CHARTER.md`. Apply these steps only to the requested scope. Follow existing TanStack/Lovable entrypoints, Lemma CSS, recorded Drizzle SQL and Supabase RLS. Unknown live state is unverified. Examples are inert; broad refactoring, destructive or production-sensitive actions require approval.
