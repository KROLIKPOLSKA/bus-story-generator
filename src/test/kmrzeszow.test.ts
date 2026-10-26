import { describe, expect, it } from "vitest";
import { parseHistory, resolveCourses, type BlockTrip } from "../../supabase/functions/_shared/kmrzeszow";

const html = `<a href="/historia/?data=2026-10-23">2026-10-23</a></td><td>
<div class="brigade-entry"><a href="/historia/brygada/11635">0B/4</a> <small class="x">(16:30-19:15)</small></div>
<div class="brigade-entry"><a href="/historia/brygada/11504">0A/2</a> <small class="x">(08:40-16:28)</small></div></td></tr>
<a href="/historia/?data=2026-10-22">2026-10-22</a></td><td><div><a href="/historia/brygada/1">9/9</a> <small>(10:00-11:00)</small></div></td></tr>`;
const trips: BlockTrip[] = [
  { kind: "liniowy", line: "0A", headsign: "Dworzec Główny PKP", start: "08:45", end: "09:30", tripId: "1" },
  { kind: "liniowy", line: "0A", headsign: "Lwowska", start: "09:40", end: "10:20", tripId: "2" },
];
const q = { carrier: "MPK Rzeszów", vehicle: "104", date: "2026-10-23", time: "09:35" };

describe("kmrzeszow.live history", () => {
  it("reads only the brigades of the requested date", () => {
    expect(parseHistory(html, "2026-10-23").map((e) => e.brigade)).toEqual(["0B/4", "0A/2"]);
    expect(parseHistory(html, "2026-10-21")).toEqual([]);
  });
  it("assigns a layover to the next trip of the observed brigade", () => {
    const [c] = resolveCourses(q, parseHistory(html, q.date), new Map([["11504", trips]]), "2026-10-26T08:00:00Z");
    expect([c.line, c.direction, c.brigade]).toEqual(["0A", "Lwowska", "0A/2"]);
  });
  it("returns nothing outside the observed brigade window", () => {
    expect(resolveCourses({ ...q, time: "08:00" }, parseHistory(html, q.date), new Map([["11504", trips]]), "x")).toEqual([]);
  });
});
