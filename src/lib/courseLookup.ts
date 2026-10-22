export interface CourseQuery {
  carrier: string;
  vehicle: string;
  date: string;
  time: string;
}

export interface VehicleCourse {
  id: string;
  vehicle: string;
  line: string;
  direction: string;
  brigade?: string;
  startsAt: string;
  endsAt: string;
  evidence: "confirmed" | "scheduled";
  sourceUrl: string;
  fetchedAt: string;
}

export type CourseDayResponse =
  | { status: "available"; courses: VehicleCourse[] }
  | { status: "unavailable"; reason: string };

// A future server adapter must return courses overlapping the requested Warsaw
// calendar day (including trips beginning on the previous day), with ISO offsets.
export type CourseDayProvider = (query: Omit<CourseQuery, "time">, signal: AbortSignal) => Promise<CourseDayResponse>;

export const unavailableCourseProvider: CourseDayProvider = async () => ({
  status: "unavailable",
  reason: "Nie potwierdzono dostępnego źródła historycznych kursów dla numeru pojazdu, daty i godziny. Linia i kierunek pozostają do ręcznego uzupełnienia.",
});

export function matchingCourses(courses: VehicleCourse[], vehicle: string, instant: string): VehicleCourse[] {
  const time = Date.parse(instant);
  if (!Number.isFinite(time)) return [];
  return courses.filter((course) => course.vehicle === vehicle.trim()
    && course.line.trim() && course.direction.trim()
    && /^https:\/\//.test(course.sourceUrl) && Number.isFinite(Date.parse(course.fetchedAt))
    && Date.parse(course.startsAt) <= time && time < Date.parse(course.endsAt));
}

// Resolve a Warsaw wall-clock time without relying on the browser's time zone.
// DST times with zero or two possible instants are deliberately not guessed.
export function warsawInstant(date: string, time: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return;
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const candidates = ["+01:00", "+02:00"].map((offset) => `${date}T${time}:00${offset}`)
    .filter((candidate) => Number.isFinite(Date.parse(candidate))
      && formatter.format(new Date(candidate)) === `${date} ${time}`);
  return candidates.length === 1 ? candidates[0] : undefined;
}

export function applyCourseValues(current: { line: string; direction: string }, course: VehicleCourse, replace = false) {
  return {
    line: replace || !current.line.trim() ? course.line : current.line,
    direction: replace || !current.direction.trim() ? course.direction : current.direction,
  };
}

export function createCourseLookup(provider: CourseDayProvider) {
  const cache = new Map<string, { expires: number; response: CourseDayResponse }>();
  return async (query: CourseQuery, signal: AbortSignal) => {
    const instant = warsawInstant(query.date, query.time);
    if (!instant) return { status: "invalid-time" as const };
    const key = JSON.stringify([query.carrier, query.vehicle.trim(), query.date]);
    const cached = cache.get(key);
    const response = cached && cached.expires > Date.now() ? cached.response
      : await provider({ carrier: query.carrier, vehicle: query.vehicle.trim(), date: query.date }, signal);
    if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    if (response.status === "unavailable") return response;
    cache.set(key, { expires: Date.now() + 5 * 60_000, response });
    return { status: "available" as const, courses: matchingCourses(response.courses, query.vehicle, instant) };
  };
}