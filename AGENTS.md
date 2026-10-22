# Architecture rules
- Keep the vehicle browser read-only and derive its groups and search results from the same carrier fleet files used for autofill, so the two views cannot diverge.
- Keep application-wide theme selection in next-themes and express both themes with global semantic CSS tokens, so menus, forms and notifications share one theme.
- Keep application settings in AppMenu while the generator owns form-section state, so changing navigation does not reset entered form values.
- Keep historical course lookup behind an injectable day-provider adapter, returning explicit unavailability until a real authorized source is verified; never use fleet brand/model data to infer trips.
- Resolve course times in Europe/Warsaw and match half-open timestamp intervals; cache available vehicle/day responses and cancel stale lookups so date/time changes cannot reuse wrong assignments.
- Track auto-filled course fields separately from manual entries, clearing only automatic values when lookup inputs change so user corrections survive.