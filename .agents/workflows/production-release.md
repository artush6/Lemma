# Production readiness review

1. Confirm routes for privacy, cookie policy, terms if applicable, legal notice, support and branded not-found/error page; ensure content factually verified.
2. Check security headers/CSP, HTTPS, secrets, server-side auth, session handling, role boundaries, rate limiting, webhooks and dependency warnings.
3. Check RLS, storage policies, views, functions, backups, data retention, deletion/export, sensitive logs, audit visibility.
4. Check SEO: metadata, canonical, sitemap, robots and localized tags **only if appropriate**; avoid exposing private pages in indexing.
5. Check accessibility, responsive views, reduced motion, performance budget, 404 status, 500 handling and helpful recovery.
6. Verify consent enforcement, third-party tracking, support contact and legal links on production-like deployment.
7. Ensure migrations staged, backups verified, rollback and incident response known.
8. Provide GO / GO WITH CONDITIONS / NO-GO based on evidenced risks, never a guessed compliance seal.

## Lemma scope

Read `.agents/PROJECT_PROFILE.md` and the project application rules in `.agents/CHARTER.md`. Apply these steps only to the requested scope. Follow existing TanStack/Lovable entrypoints, Lemma CSS, recorded Drizzle SQL and Supabase RLS. Unknown live state is unverified. Examples are inert; broad refactoring, destructive or production-sensitive actions require approval.
