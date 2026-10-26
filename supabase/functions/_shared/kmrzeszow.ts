import { warsawInstant, type Course, type Query, type Source } from './transport.ts';

// Public community service that publishes observed MPK Rzeszów vehicle-to-brigade history
// and the brigade's trip schedule. robots.txt allows all paths.
export const KM_BASE = 'https://kmrzeszow.live';

export interface HistoryEntry { blockId: string; brigade: string; from: string; to: string }
export interface BlockTrip { kind: string; line: string; headsign: string; start: string; end: string; tripId: string }

/** Extracts the brigade entries recorded for one date from the vehicle history page. */
export function parseHistory(html: string, date: string): HistoryEntry[] {
  const marker = `/historia/?data=${date}"`;
  const at = html.indexOf(marker);
  if (at < 0) return [];
  const rowEnd = html.indexOf('</tr>', at);
  const row = html.slice(at, rowEnd < 0 ? undefined : rowEnd);
  const out: HistoryEntry[] = [];
  const re = /\/historia\/brygada\/(\d+)">([^<]+)<\/a>\s*<small[^>]*>\((\d{1,2}:\d{2})-(\d{1,2}:\d{2})\)<\/small>/g;
  for (const m of row.matchAll(re)) out.push({ blockId: m[1], brigade: m[2].trim(), from: m[3], to: m[4] });
  return out;
}

export function parseBlock(json: unknown): BlockTrip[] {
  const trips = (json as { trips?: unknown })?.trips;
  if (!Array.isArray(trips)) throw new Error('invalid-format');
  return trips.map((t: any) => ({
    kind: String(t?.typ ?? ''), line: String(t?.route_short_name ?? '').trim(), headsign: String(t?.headsign ?? '').trim(),
    start: String(t?.szczegoly?.start_time ?? '').slice(0, 5), end: String(t?.szczegoly?.end_time ?? '').slice(0, 5), tripId: String(t?.trip_id ?? ''),
  })).filter(t => /^\d{2}:\d{2}$/.test(t.start) && /^\d{2}:\d{2}$/.test(t.end));
}

const minutes = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

/** Warsaw instant for a service-day time; GTFS-style hours >= 24 roll into the next day. */
export function serviceInstant(date: string, hhmm: string): string | undefined {
  const total = minutes(hhmm);
  const day = new Date(`${date}T12:00:00Z`); day.setUTCDate(day.getUTCDate() + Math.floor(total / 1440));
  const m = total % 1440;
  const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const iso = warsawInstant(day.toISOString().slice(0, 10), t);
  return iso;
}

/**
 * Picks the passenger trip that covers the query time inside the observed brigade window.
 * A layover belongs to the following trip, so the bus shows the next destination while waiting.
 */
export function resolveCourses(q: Query, entries: HistoryEntry[], blocks: Map<string, BlockTrip[]>, fetchedAt: string): Course[] {
  const t = minutes(q.time);
  const out: Course[] = [];
  for (const e of entries) {
    const from = minutes(e.from); let to = minutes(e.to); if (to < from) to += 1440;
    if (!(from <= t && t < to)) continue;
    const trips = (blocks.get(e.blockId) ?? []).filter(x => x.kind === 'liniowy' && x.line && x.headsign);
    let prevEnd = from;
    for (const trip of trips) {
      const s = Math.max(prevEnd, from); const end = Math.min(minutes(trip.end), to);
      prevEnd = Math.max(prevEnd, minutes(trip.end));
      if (!(s <= t && t < end)) continue;
      const hh = (v: number) => `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`;
      const startsAt = serviceInstant(q.date, hh(s)); const endsAt = serviceInstant(q.date, hh(end));
      if (!startsAt || !endsAt) continue;
      out.push({
        id: `km:${e.blockId}:${trip.tripId}:${q.date}`, vehicle: q.vehicle, line: trip.line, direction: trip.headsign, brigade: e.brigade,
        startsAt, endsAt, evidence: 'scheduled', sourceUrl: `${KM_BASE}/historia/brygada/${e.blockId}`, fetchedAt,
      });
      break;
    }
  }
  return out;
}

async function get(url: string, signal: AbortSignal) {
  const res = await fetch(url, { signal, headers: { 'User-Agent': 'GeneratorOpisow/1.0 (lookup na zadanie)', Accept: 'text/html,application/json' } });
  if (!res.ok) throw new Error(`source-${res.status}`);
  return res;
}

export const kmRzeszowSource: Source = {
  async fetch(q) {
    if (q.carrier !== 'MPK Rzeszów' || !/^\d{1,4}$/.test(q.vehicle)) return [];
    const signal = AbortSignal.timeout(15000);
    const html = await (await get(`${KM_BASE}/historia/historia_pojazdu.php?pojazd=${encodeURIComponent(q.vehicle)}`, signal)).text();
    if (!html.includes('Brygada (przedział czasowy)')) return [];
    const entries = parseHistory(html, q.date).filter(e => { const f = minutes(e.from), t = minutes(q.time); let to = minutes(e.to); if (to < f) to += 1440; return f <= t && t < to; });
    if (!entries.length) return [];
    const blocks = new Map<string, BlockTrip[]>();
    for (const id of new Set(entries.map(e => e.blockId))) {
      blocks.set(id, parseBlock(await (await get(`${KM_BASE}/brygady/get_brygada_szczegoly.php?block_id=${id}`, signal)).json()));
    }
    return resolveCourses(q, entries, blocks, new Date().toISOString());
  },
};
