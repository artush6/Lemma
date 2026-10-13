# Lemma authorization expectations

Status: source-derived expectations; **not executed tests**. Recorded SQL: `drizzle/migrations/0000_lemma_schema.sql`, `0001_tags_and_space_colors.sql`. Use an isolated database with anon and distinct authenticated A/B sessions; do not use service-role to simulate end users. Record exact operations, response status, row count and resulting state without tokens or personal content.

| Resource/action                                           | Anon                    | Owner A                             | Other user B             |
| --------------------------------------------------------- | ----------------------- | ----------------------------------- | ------------------------ |
| Direct notes/folders SELECT                               | No rows/denied          | Own rows only                       | Own B rows only          |
| INSERT notes/folders as A                                 | Denied                  | Allowed with own/null folder/parent | Denied                   |
| UPDATE/DELETE A note/folder                               | Denied/no affected rows | Allowed                             | Denied/no affected rows  |
| Reassign owner or reference another owner's folder/parent | Denied                  | Denied                              | Denied                   |
| Version SELECT/INSERT for A note                          | Denied                  | Allowed                             | Denied                   |
| Direct version UPDATE/DELETE                              | Denied                  | No recorded grant/policy            | No recorded grant/policy |
| get_shared_note(valid enabled token)                      | One projected note      | Same projection                     | Same projection          |
| get_shared_note(invalid/null/revoked token)               | No rows                 | No rows                             | No rows                  |
| Direct lemma_snapshot_note execution                      | Denied                  | Denied                              | Denied                   |

Also test nested folder SELECT/INSERT/UPDATE for same-table policy recursion; cyclic parent assignments through API (UI checks alone are insufficient); moving across owners; bulk actions/upsert collision; note deletion/history cascade; folder deletion/note detachment; save/history trigger interactions; share token creation, revoke and in-flight stale saves; read-only sharing with direct write attempts; logout/session expiry/account switch and owner-scoped drafts. Inspect actual function privileges, search_path, exposed schemas, default grants and advisors. No active storage/realtime/team/admin endpoint was found; inspect live state before declaring them absent.

Allowed operations must succeed as well as forbidden operations failing. Zero affected rows can be expected denial or an unexpected failure of an allowed write: assert both. Preserve error privacy. Migration changes require a reviewed rollback and explicit production authorization.

Current Supabase reference: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security). The 2026-10-14 audit fetched this guide; the changelog Markdown fetch was unsupported by the web tool. No product/API changes were implemented.
