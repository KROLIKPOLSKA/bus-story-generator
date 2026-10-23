export interface Query { carrier: string; vehicle: string; date: string; time: string }
export interface Course {
  id: string; vehicle: string; line: string; direction: string; brigade?: string;
  startsAt: string; endsAt: string; evidence: 'confirmed' | 'scheduled'; sourceUrl: string; fetchedAt: string;
}
export function warsawInstant(date: string, time: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return;
  const f = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const values = ['+01:00', '+02:00'].map(o => `${date}T${time}:00${o}`).filter(v => Number.isFinite(Date.parse(v)) && f.format(new Date(v)) === `${date} ${time}`);
  return values.length === 1 ? values[0] : undefined;
}
export function nextWarsawNoon(at: Date): string {
  const f = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' });
  const date = f.format(at);
  const noon = warsawInstant(date, '12:00');
  if (!noon) throw new Error('Invalid date');
  if (Date.parse(noon) > at.getTime()) return new Date(noon).toISOString();
  const tomorrow = new Date(`${date}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const next = warsawInstant(tomorrow.toISOString().slice(0, 10), '12:00');
  if (!next) throw new Error('Invalid date');
  return new Date(next).toISOString();
}
export function verifiedCourses(courses: Course[], q: Query, instant: string): boolean {
  return courses.length > 0 && courses.length <= 100 && courses.every(c => c.vehicle === q.vehicle && c.line.trim().length > 0 && c.direction.trim().length > 0
    && ['confirmed', 'scheduled'].includes(c.evidence) && /^https:\/\//.test(c.sourceUrl) && Number.isFinite(Date.parse(c.fetchedAt))
    && /(?:Z|[+-]\d{2}:\d{2})$/.test(c.startsAt) && /(?:Z|[+-]\d{2}:\d{2})$/.test(c.endsAt)
    && Date.parse(c.startsAt) <= Date.parse(instant) && Date.parse(instant) < Date.parse(c.endsAt));
}
export interface Store {
  read(q: Query, instant: string): Promise<Course[]>;
  claim(key: string): Promise<{ status: string; token?: string; retryAfter?: number }>;
  finish(key: string, token: string, status: 'complete' | 'error' | 'no-data', courses: Course[], q: Query): Promise<boolean>;
}
export interface Source { fetch(q: Query): Promise<Course[]> }
// No source is registered until historical access AND reuse permission are verified.
export async function lookupTransport(q: Query, store: Store, source?: Source) {
  const instant = warsawInstant(q.date, q.time);
  if (!instant) return { status: 'invalid-time' as const };
  const cached = await store.read(q, instant);
  if (cached.length) return { status: 'available' as const, courses: cached, origin: 'cache' };
  if (!source) return { status: 'unavailable' as const, reason: 'Nie podłączono potwierdzonego źródła historycznych kursów dla pojazdu, daty i godziny. Linię i kierunek możesz uzupełnić ręcznie.' };
  const key = JSON.stringify([q.carrier, q.vehicle, q.date, instant]);
  const claim = await store.claim(key);
  if (claim.status !== 'claimed' || !claim.token) return { status: 'unavailable' as const, retryAfter: claim.retryAfter, reason: claim.status === 'busy' ? 'Takie wyszukiwanie już trwa. Spróbuj ponownie za chwilę.' : 'Obowiązuje przerwa między zapytaniami. Spróbuj ponownie za chwilę.' };
  try {
    // Recheck after claiming: another request may have completed between read and claim.
    const nowCached = await store.read(q, instant);
    if (nowCached.length) { await store.finish(key, claim.token, 'no-data', [], q); return { status: 'available' as const, courses: nowCached, origin: 'cache' }; }
    const courses = await source.fetch(q);
    if (!courses.length) { await store.finish(key, claim.token, 'no-data', [], q); return { status: 'available' as const, courses: [] }; }
    if (!verifiedCourses(courses, q, instant)) throw new Error('invalid-format');
    if (!await store.finish(key, claim.token, 'complete', courses, q)) throw new Error('lease-expired');
    return { status: 'available' as const, courses, origin: 'source' };
  } catch {
    await store.finish(key, claim.token, 'error', [], q);
    return { status: 'unavailable' as const, reason: 'Nie udało się uzyskać wiarygodnych danych. Możesz uzupełnić pola ręcznie i spróbować ponownie później.' };
  }
}