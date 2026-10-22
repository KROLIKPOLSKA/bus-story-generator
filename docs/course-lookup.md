# Historical course integration

## Current status

The form accepts the existing fleet number and date plus an optional Warsaw time. The provider currently returns explicit unavailability. No sample course data is shipped in the application and no outbound requests are made by this placeholder provider.

## Provider contract

Replace `unavailableCourseProvider` in `src/components/CourseLookup.tsx` only after confirming a usable, authorized source. If server fetching is required, enable Lovable Cloud first and implement the adapter through a server function. Never expose credentials or implement an unverified endpoint in the browser.

`CourseDayProvider` receives carrier, vehicle number, Warsaw calendar date and cancellation signal. It must return either:

- `available` with a list of genuine vehicle courses (an empty list means the source answered successfully but contains no usable courses).
- `unavailable` with an accurate reason (no source configured, network failure, denied access, or unavailable historical records).

Each course must include the vehicle number, line, direction, start/end ISO timestamps with explicit offsets, evidence classification (`confirmed` or `scheduled`), source HTTPS URL, retrieval time and unique identifier. Include brigade when known. Return all courses intersecting the requested calendar day, including ones starting before midnight the day before. Use actual timestamps when available; scheduled timestamps remain classified as scheduled.

Vehicle-to-brigade assignments alone are insufficient. Resolve individual courses using authoritative trip and route data before returning line/direction. Do not return a passenger course for a break, depot movement or uncertain assignment.

## Selection and safeguards

- Times use Europe/Warsaw independently of the browser's time zone. Nonexistent and ambiguous daylight-saving times are not guessed.
- Intervals are start-inclusive and end-exclusive. All matching candidates are retained.
- A single confirmed candidate can fill empty fields automatically. Timetable-only or ambiguous results require selection.
- Manual entries survive lookup changes. Only auto-filled values are cleared when query inputs change; explicit replacement is available in a result.
- Successful vehicle/day responses are cached in memory for five minutes. Provider failures are not cached. Cancellation prevents stale results updating the form.

## Verification

Logic and lifecycle tests cover midnight courses, gaps, changed lines/directions, ambiguity, insufficient data, timetable evidence, manual preservation, day caching and stale responses. Browser verification covers unavailable-provider status, manual preservation after time changes, fleet model autofill and description/title generation. A successful real historical lookup remains unverified until the provider is connected.