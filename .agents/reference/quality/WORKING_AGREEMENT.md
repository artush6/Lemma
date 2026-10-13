# Acceptance and behavior contract

- Keep diffs scoped: no sweeping redesign while implementing a single feature.
- Before code changes, inspect existing components and state ownership.
- For significant feature changes: define acceptance criteria, security/UX consequences and tests.
- When user asks for more polish: provide purposeful motion, not continuous decoration.
- Once a redesign replaces UI, trace references and remove provably dead code.
- For releases, check real legal data handling, policies, trackers, 404/status, RLS and rollback.
- For claims of performance or security, attach measurement/test evidence.
- Report limitations plainly. Never equate documentation with implementation.
