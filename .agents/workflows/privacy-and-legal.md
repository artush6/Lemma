# Privacy, legal and policy-page implementation

1. Determine jurisdiction, product category, controller/processor relationships and whether a public app or business site.
2. Inventory real data: signup, profile, IP/logging, payments, support, analytics, cookies/local storage, vendors/SDKs, backups, region/transfers, retention, minors, sensitive data.
3. Build a processing matrix: category, purpose, lawful basis (to be legally reviewed), retention, recipient, rights, technical location.
4. Draft accurate Privacy Policy, Cookie/Tracking Policy, Terms if relevant, Legal Notice/Mentions légales if required, contact and data-rights controls. Use placeholders for unverifiable facts.
5. Detect cookies/trackers in actual runtime. Do not load nonessential trackers until consent when required. Equal accept/reject choices, granular preferences, withdrawal, documented consent state and expiry. No unnecessary banner for solely essential cookies.
6. Implement routes, footer/settings links, accessible consent UI, account data export/deletion workflows as appropriate, and ensure policy versions are maintained.
7. Verify client/server enforcement, policy navigation, mobile layout and actual network requests before/after consent.
8. Flag legal review and risk-based DPIA/DPA/sector compliance, especially for financial, health or children’s data. Never label as fully compliant without evidence.

## Lemma scope

Read `.agents/PROJECT_PROFILE.md` and the project application rules in `.agents/CHARTER.md`. Apply these steps only to the requested scope. Follow existing TanStack/Lovable entrypoints, Lemma CSS, recorded Drizzle SQL and Supabase RLS. Unknown live state is unverified. Examples are inert; broad refactoring, destructive or production-sensitive actions require approval.
