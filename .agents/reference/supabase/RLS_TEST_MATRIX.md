# Authorization test matrix (run with real identities)

| Actor     | Own note SELECT | Other note SELECT | Create as own | Create as other | Update own content | Change owner_id | Delete other |
| --------- | --------------- | ----------------- | ------------- | --------------- | ------------------ | --------------- | ------------ |
| Anonymous | deny            | deny              | deny          | deny            | deny               | deny            | deny         |
| User A    | allow           | deny              | allow         | deny            | allow              | deny            | deny         |
| User B    | allow on B      | deny A            | allow B       | deny A          | allow B            | deny            | deny A       |

These are expectations, **not executed test results**. Use actual authenticated client tokens, not service-role (which bypasses RLS). Also test storage, API endpoints, views, RPCs, realtime and membership transitions as applicable. Ensure INSERT/UPDATE cannot forge owner IDs; test attempts to enumerate UUIDs. Record test commands, identities (not secrets), observed responses, and whether zero-row responses hide a policy failure.
