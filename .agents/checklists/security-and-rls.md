# Security And Rls

- [ ] All Data API exposed tables identified and RLS enabled
- [ ] Owner/tenant access requirements documented per table/action
- [ ] Policies use both USING and WITH CHECK when appropriate
- [ ] Anonymous and user A/B positive and negative checks actually executed
- [ ] Unexpected cross-user access attempts denied
- [ ] No service role/secret keys in client bundle
- [ ] Storage buckets and policies reviewed
- [ ] Views security_invoker/privileges examined
- [ ] Functions and SECURITY DEFINER/RPC grants reviewed
- [ ] Auth/session failure and rate limits considered
- [ ] SQL migrations reviewed, reversible if feasible, staged first
