# Legal and compliance pages — implementation brief

**Not publishable policy text. Replace with accurate, lawyer-reviewed facts.**

## Suggested routes (adapt to framework and locale)

- `/privacy` — controller contact; data categories/sources; purposes and lawful bases; recipients/processors; international transfers; retention; rights, complaints, updates.
- `/cookies` — tracker inventory, purposes, lifetime, recipients, consent status, how to adjust preferences. If only exempt/essential trackers are present, avoid misleading consent UI.
- `/terms` — terms of service/use only where appropriate; eligibility, acceptable use, limitation, termination and applicable law for review.
- `/legal` — `mentions légales` / legal notice where required; publisher, company registration details where applicable, hosting and contact.
- `/contact` — working support/privacy channel.
- `/settings/privacy` — data export, deletion request, tracking preferences where applicable.
- `not-found` / `404` — branded, helpful, accessible, correct HTTP status. Do not leak private data.
- Error/500 — useful recovery without sensitive stack traces.

## Required verification

Locate actual data processing before writing policy; determine jurisdiction and business identity; remove all placeholders before publication; match policy to service functionality; provide date/version; check navigation from footer and account; confirm actual cookie network behavior. If users may be minors or data is health/financial sensitive, escalate for dedicated assessment.
