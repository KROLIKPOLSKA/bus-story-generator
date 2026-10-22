import { describe, expect, it, vi } from "vitest";
import { applyCourseValues, createCourseLookup, matchingCourses, warsawInstant, type VehicleCourse } from "@/lib/courseLookup";

const course: VehicleCourse = {
  id: "test-only", vehicle: "1234", line: "18", direction: "Przystanek końcowy",
  startsAt: "2026-10-22T23:50:00+02:00", endsAt: "2026-10-23T00:20:00+02:00",
  evidence: "confirmed", sourceUrl: "https://example.com/test", fetchedAt: "2026-10-23T01:00:00+02:00",
};

describe("historical course rules", () => {
  it("matches the vehicle and time including trips across midnight", () => {
    expect(matchingCourses([course], "1234", "2026-10-23T00:05:00+02:00")).toEqual([course]);
    expect(matchingCourses([course], "1235", "2026-10-23T00:05:00+02:00")).toEqual([]);
  });
  it("does not assign a trip during a gap or at its exclusive end", () => {
    expect(matchingCourses([course], "1234", course.endsAt)).toEqual([]);
    expect(matchingCourses([course], "1234", "2026-10-22T23:40:00+02:00")).toEqual([]);
  });
  it("selects the correct line and direction when a brigade changes lines", () => {
    const next = { ...course, id: "next", line: "13", direction: "Powrót", startsAt: course.endsAt, endsAt: "2026-10-23T01:00:00+02:00" };
    expect(matchingCourses([course, next], "1234", "2026-10-23T00:30:00+02:00")).toEqual([next]);
  });
  it("keeps ambiguous candidates rather than selecting one", () => {
    expect(matchingCourses([course, { ...course, id: "alternative", line: "13" }], "1234", course.startsAt)).toHaveLength(2);
  });
  it("rejects brigade-only data without a line or direction", () => {
    expect(matchingCourses([{ ...course, direction: "", brigade: "18/1" }], "1234", course.startsAt)).toEqual([]);
  });
  it("does not relabel timetable evidence as confirmed operation", () => {
    expect(matchingCourses([{ ...course, evidence: "scheduled" }], "1234", course.startsAt)[0].evidence).toBe("scheduled");
  });
  it("preserves manually entered fields until explicit replacement", () => {
    expect(applyCourseValues({ line: "13", direction: "Ręczny kierunek" }, course)).toEqual({ line: "13", direction: "Ręczny kierunek" });
    expect(applyCourseValues({ line: "13", direction: "" }, course)).toEqual({ line: "13", direction: course.direction });
    expect(applyCourseValues({ line: "13", direction: "Ręczny kierunek" }, course, true)).toEqual({ line: "18", direction: course.direction });
  });
  it("uses Warsaw time and rejects ambiguous or nonexistent DST time", () => {
    expect(warsawInstant("2026-10-22", "21:40")).toBe("2026-10-22T21:40:00+02:00");
    expect(warsawInstant("2026-10-25", "02:30")).toBeUndefined();
    expect(warsawInstant("2026-03-29", "02:30")).toBeUndefined();
  });
  it("caches a vehicle/day but reselects after time or date changes", async () => {
    const provider = vi.fn(async () => ({ status: "available" as const, courses: [course] }));
    const lookup = createCourseLookup(provider);
    const query = { carrier: "MPK Rzeszów", vehicle: "1234", date: "2026-10-22", time: "23:55" };
    expect(await lookup(query, new AbortController().signal)).toEqual({ status: "available", courses: [course] });
    expect(await lookup({ ...query, time: "23:40" }, new AbortController().signal)).toEqual({ status: "available", courses: [] });
    expect(provider).toHaveBeenCalledTimes(1);
    await lookup({ ...query, date: "2026-10-23", time: "00:05" }, new AbortController().signal);
    expect(provider).toHaveBeenCalledTimes(2);
  });
  it("distinguishes an unavailable source from no historical records", async () => {
    const query = { carrier: "MPK Rzeszów", vehicle: "1234", date: "2026-10-22", time: "23:55" };
    expect(await createCourseLookup(async () => ({ status: "unavailable", reason: "Offline" }))(query, new AbortController().signal)).toEqual({ status: "unavailable", reason: "Offline" });
    expect(await createCourseLookup(async () => ({ status: "available", courses: [] }))(query, new AbortController().signal)).toEqual({ status: "available", courses: [] });
  });
});