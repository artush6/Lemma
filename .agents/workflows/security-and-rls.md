# Threat modeling, Supabase RLS and boundary verification

1. Read actual schema, grants, migrations, exposed schemas, storage buckets, views, functions and API routes; consult up-to-date Supabase docs.
2. Build resource-action matrix for anon, A, B, team member, admin/service (only if applicable), covering SELECT/INSERT/UPDATE/DELETE, storage, realtime, RPC and views.
3. Enable RLS on all Data API exposed tables; use least privilege; avoid `USING (true)` except intentionally public resources. Authenticated role alone is **not** object authorization.
4. Ownership/tenant predicates in SELECT/DELETE USING, INSERT WITH CHECK, UPDATE USING + WITH CHECK. Consider that UPDATE may require SELECT policy.
5. Carefully review SECURITY DEFINER functions, execution grants and search paths; prefer invoker. Review `security_invoker` views where supported. Never expose service-role key.
6. Test actual requests using anon, A, B tokens including forging owner_id, changing tenant_id, accessing predictable IDs, batched requests, API routes and storage paths.
7. Run database advisors where available; capture exact SQL/tests and failures; do not claim secure until verified.
8. Prepare migration rollback, check concurrent access and avoid unauthorized production changes.

## Lemma scope

Read `.agents/PROJECT_PROFILE.md` and the project application rules in `.agents/CHARTER.md`. Apply these steps only to the requested scope. Follow existing TanStack/Lovable entrypoints, Lemma CSS, recorded Drizzle SQL and Supabase RLS. Unknown live state is unverified. Examples are inert; broad refactoring, destructive or production-sensitive actions require approval.
