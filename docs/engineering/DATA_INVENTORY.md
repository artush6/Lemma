# Lemma data inventory

Source inspection: 2026-10-14. Internal working inventory, not publishable policy or legal advice. Unknown facts need operator/runtime evidence.

| Data / source                                          | Purpose and location observed                                         | Controls observed                                                   | Unverified facts                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Email/auth session; email OTP and Google auth          | Supabase Auth; Lovable OAuth integration; browser session persistence | Sign-out; preview broker validates origins; automatic refresh       | Controller, provider settings, redirects, retention, regions, full account deletion |
| Note titles/content/pages/tags/icons/favorites/layouts | Supabase public.notes; local owner-scoped recovery JSON               | Recorded owner RLS; note delete; legacy content preservation        | Deployed RLS, retention/backups, full export, multi-device conflicts                |
| Folder names/icons/color/hierarchy                     | public.folders; local owner-scoped cache                              | Recorded owner/parent policies; delete                              | Live nested-policy behavior and deletion convergence                                |
| Historical note content                                | public.note_versions; trigger and explicit snapshots                  | Recorded note-owner policies; 25-row history query; note FK cascade | Storage retention limit (query limit is not deletion), restore and backup policy    |
| Share capability/token and note projection             | UUID token in notes and URL; anon RPC                                 | Read-only UI; token revocation                                      | Live enforcement, URL/log/referrer exposure, rate limits and cache behavior         |
| Device preferences/theme/last-note/demo                | Browser localStorage                                                  | Settings and version-1 shape; legacy reads                          | Device retention/reset, shared-device disclosure and data-clearing policy           |
| Error messages/stack/path                              | console/server logs; optional Lovable capture hooks                   | Friendly rendered errors; path-only explicit route context          | Runtime hook activation, payload scrubbing, recipients and retention                |
| Font requests / remote images                          | Google Fonts stylesheets; image sources in document JSON              | Allowed image MIME/source formats in current working tree           | IP/referrer processing, provider terms, remote-image disclosure and size limits     |
| Hosted requests/logs                                   | Vercel configured target; Lovable preview surfaces                    | Error wrapper and build output configuration                        | Actual hosting domains/regions/log retention, backups, subprocessors and agreements |

No dedicated advertising/analytics SDK was found in inspected application source. This does not exclude injected hosting/preview telemetry. Observe actual production-like network/storage behavior before deciding consent requirements. Do not add banners or invent lawful bases/retention/company identity.

No registered privacy, cookies, terms, legal, contact or account-data route exists. Confirm jurisdiction and operator first, then propose accurate content, support/export/deletion behavior and links as a separately scoped task. Account export must include the agreed note/folder/history scope; browser print alone does not satisfy it.

## Workspace files and recovery — 2026-10-20

Uploaded PDF/text/LaTeX/Office files are base64-encoded in existing note JSON, and therefore follow notes into cloud persistence, history snapshots and token-shared content. Limits: 5 MiB per PDF, 2 MiB per other supported file; encoded data is larger than the original file and legacy page/content copies can further increase payloads. No external file-hosting service or storage bucket was introduced. In-app previews create local Blob URLs and revoke them when replaced/unmounted. PDF/text are previewed; Office documents are downloaded. Existing sharing and version-retention uncertainties apply to attachment contents too.

Large device recovery drafts use IndexedDB `lemma-large-drafts` / `drafts` with the same owner-prefixed keys as localStorage. Successful matching cloud saves remove recovery entries from both stores. Sign-out does not establish erasure; browser quota/availability and cross-tab conflict limitations remain. Temporary PDF export DOM/canvases are removed after completion; downloads are user-controlled local files. Export dependencies execute client-side and do not add an external upload endpoint. Per-document PDF/LaTeX output is not a full account export.

## Code Lab and flashcards — 2026-10-22

Code snippets, datasets, code folders, decks, cards and review schedules use per-account localStorage keys (`lemma:<owner>:codelab:*` and `lemma:<owner>:cards:*`); they do not sync to Supabase. Storage failures are surfaced. JSON exports create local Blob downloads. Flashcard imports create fresh review schedules. Code Lab PDFs are temporary local Blob URLs, revoked on replacement/unmount, and are not persisted by Code Lab. Sign-out does not erase device data.

Monaco loads its editor runtime from jsDelivr on entering Code Lab; Python loads Pyodide from jsDelivr when run. Python/JavaScript snippets and datasets execute in disposable browser workers. C++ code and the selected input are sent through an authenticated server function to Compiler Explorer (`godbolt.org`) only when Run is invoked. The Code Lab UI discloses these recipients; provider logging, retention, region and contractual facts remain unverified. Workers/timeouts are usability isolation, not a verified hostile-code security boundary. Google Fonts now also serves Nunito Sans and STIX Two Text. No tracking or consent SDK was added.

## Reading and typography update — 2026-10-22

Explicit HTTPS PDF links may be stored in existing attachment nodes. Opening their previews connects directly to the linked provider; iframe referrers are suppressed. Provider retention, embedding rules and content availability are unknown. URLs follow note persistence/history/share flows. Uploaded images retain their 2 MiB limit; PDFs retain 5 MiB. Picker/drop insertion introduces no new upload endpoint. Temporary reference PDFs remain in memory; a detached PDF window owns an independent Blob URL until it closes. Dock placement is transient.

The current Google Fonts request retains only JetBrains Mono. The earlier Nunito Sans/STIX Two Text/Inter requests have been removed in favor of native system sans and native Monaco monospace. Existing remote image and hosting/preview telemetry uncertainties remain.

## Unified workspace device data — 2026-10-23

Open resource IDs/titles, per-pane ordering and active selection, split orientation and divider ratio use owner-prefixed localStorage `lemma:<owner>:workspace:v1`. This is distinct from note contents, recovery drafts and categorized preferences. Closed resources remain mounted in memory for the session; their descriptors are omitted from the saved open-tab layout.

Files opened directly through the workspace, rather than inserted into notes, are cached in IndexedDB `lemma-workspace-files`, object store `files`. Keys combine account ID with SHA-256 content identity; values contain file name, MIME and source bytes/URL. Existing file-size/source validation applies. These files are device-local and not automatically inserted into notes or uploaded to Supabase. Closing a tab or signing out does not erase cached bytes. Clearing the site's browser data removes the cache; no app-level retention/purge control was added. HTTPS PDF previews still contact their provider with suppressed iframe referrer. Native PDF behavior is browser-dependent. No new service, tracking SDK or database policy was introduced.

## Flashcard document imports and shared device controls — 2026-10-28

Flashcards can read local PDF, DOCX, HTML, CSV/TSV, JSON, text and Markdown files after an explicit file choice. PDF.js and its worker are bundled/lazy-loaded; Word XML is extracted with fflate. Source bytes and extracted text are temporary component/processing state and are not added to notes, uploaded, or saved in flashcard storage. Only explicitly confirmed front/back pairs are appended to the existing account-scoped localStorage, with new IDs/fresh schedules. The source file itself is not retained by this import flow. Browser fixtures verified real PDF/DOCX previews and confirmation using synthetic files; live hosting telemetry and provider retention remain unverified. Scanned PDFs require prior OCR; no AI/OCR service was introduced.

Code Lab/Flashcards sidebar settings reuse existing device-wide preference/theme keys. In-window notifications carry no note or card content; readers refresh the existing preferences. The storage event synchronizes other same-origin tabs. No new recipient, tracking SDK, account migration or database policy was introduced.
