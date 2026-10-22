# Historical course integration

## Current status

The form accepts the existing fleet number and date plus an optional Warsaw time. The provider currently returns explicit unavailability. No sample course data is shipped in the application and no outbound requests are made by this placeholder provider.

## Source investigation (2026-10-22)

Both domains displayed the same domain-migration notice. Prefer `https://kmrzeszow.live/` for a future adapter.

Confirmed public history pages:

- `https://kmrzeszow.live/historia/?data=2025-06-14`: vehicle 100, brigade 0A/1, 05:05–23:55.
- `https://kmrzeszow.live/historia/?data=2025-06-15`: vehicle 100, brigade 28/4, 04:25–19:45.
- `https://kmrzeszow.live/historia/100`: dated vehicle assignments.
- `https://kmrzeszow.live/historia/brygada/10975`: historical brigade assignments.

The date selector advertises history from 2025-06-14, but completeness is not verified. These are brigade intervals, not individual trips/directions; their actual versus scheduled semantics are not documented. Current fleet metadata on old pages must not be interpreted as historical vehicle inventory.

Confirmed unauthenticated HTTP 200 JSON endpoints (discovered in the site's frontend, not guessed):

- `/mpk/get_vehicles.php`: live fleet `nb`, `trip_id`, route `nr`, direction `op`, `end_stop_name`, `rawBrygada`, `brygada`, delay and online state.
- `/brygady/get_trip_stops_advanced.php?trip_id=223171`: trip metadata (`block_id`, `route_short_name`, `trip_headsign`, `service_id`) and ordered scheduled stops.
- `/przystanki/trip_history_api.php?trip_id=223171&vehicle=104`: scheduled/observed stop times for the inspected live trip. No date parameter was established.
- `/get_current_service.php`: current service IDs and `date_used`, not a verified historical calendar.
- `/pks/get_vehicles.php`: live PKS data; sampled trip and brigade fields were null. Do not assume MPK schema parity.

All URLs above are relative to `https://kmrzeszow.live`. Live API accessibility does not establish arbitrary historical access. An indexed old trip (`227413`) returned no stops, so retained historical schedules cannot be assumed.

`https://kmrzeszow.live/otwartedane` invites developer use of static/current GTFS and publishes `/gtfs/latest.zip`, `/gtfs/rt/gtfsrt.pb` and the corresponding `/gtfs-pks/` feeds. Binary payloads were not downloaded during this investigation. The page did not establish a historical archive, named licence, scraping permission, rate limit or SLA. Frontend JSON accessibility and CORS do not establish reuse rights.

`https://kmrzeszow.live/activity` requires login to the GPS archive. No authentication or access bypass was attempted.

**Remaining dependency:** an authorized date-aware join from fleet number/time to actual trips and directions, retained trip/calendar data, and confirmed reuse terms. Do not infer a course from brigade names or substitute today's schedule for historical operation.

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