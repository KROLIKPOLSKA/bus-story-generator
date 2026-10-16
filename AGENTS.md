# Architecture rules
- Keep the vehicle browser read-only and derive its groups and search results from the same carrier fleet files used for autofill, so the two views cannot diverge.
- Keep application-wide theme selection in next-themes and express both themes with global semantic CSS tokens, so menus, forms and notifications share one theme.
- Keep application settings in AppMenu while the generator owns form-section state, so changing navigation does not reset entered form values.