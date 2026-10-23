# Architecture rules
- Keep the vehicle browser read-only and derive its groups and search results from the same carrier fleet files used for autofill, so the two views cannot diverge.
- Keep application-wide theme selection in next-themes and express both themes with global semantic CSS tokens, so menus, forms and notifications share one theme.
- Keep application settings in AppMenu while the generator owns form-section state, so changing navigation does not reset entered form values.
- Keep production course lookup in a public read-only Cloud function with service-only cache tables and an injectable verified source; never infer trips from fleet metadata or register an unauthorized provider.
- Resolve course times in Europe/Warsaw and match half-open timestamp intervals; query persistent unexpired vehicle/date intervals and cancel stale UI requests so changed times cannot reuse wrong assignments.
- Keep cache commits and request leases atomic in service-only database functions; use bounded global source budgets and per-request exponential backoff to deduplicate fetches across instances.
- Run noon cleanup at both possible UTC hours with a Warsaw-hour guard and per-date success record; advisory transaction locks prevent overlap and timestamp expiry remains authoritative if cleanup is delayed.
- Track auto-filled course fields separately from manual entries, clearing only automatic values when lookup inputs change so user corrections survive.