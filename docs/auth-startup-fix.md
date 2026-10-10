# Signed-in startup freeze

The authentication effect depended on `refresh`, which depended on the full React `user` object. Supabase emitted `INITIAL_SESSION` on each subscription and supplied a new user object. Updating the user recreated `refresh`, restarted the effect, and repeated workspace loading. A separate `getSession()` call also duplicated initial loading.

An isolated signed-in browser session reproduced 9,373 requests in three seconds and another 6,824 in the next two seconds. All Supabase responses were mocked; no real account data was accessed.

The editor now keeps `refresh` stable, captures the current account ID from `userRef` when loading, and uses the auth subscription's initial session as the single startup source. It synchronizes the ref before loading and loads again only when the account changes. Token renewal and repeated sign-in events for the same account preserve the open document. Scheduled startup work is canceled during effect cleanup.

The same reproduction after the fix made four requests, followed by zero requests while idle. `tests/auth-startup.mjs` exercises signed-in startup, reload, settings controls, editing, token renewal, sign-out and sign-in with mocked cloud responses. Run the configured development server, then `node tests/auth-startup.mjs` (requires Chrome; `CHROME_CHANNEL` and `BASE_URL` can override the defaults). It reads the configured public Supabase URL from `.env.local` only to route all cloud requests to mocks. Live cloud response times are outside this test's scope.

Validation: production build, ESLint, and browser regression passed.
