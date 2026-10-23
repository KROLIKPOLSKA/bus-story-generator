import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { VehicleCourse } from "@/lib/courseLookup";

const provider = vi.hoisted(() => vi.fn());
vi.mock("@/lib/serverCourseLookup", () => ({ serverCourseLookup: provider }));
import CourseLookup from "@/components/CourseLookup";

const course: VehicleCourse = {
  id: "fixture", vehicle: "1234", line: "18", direction: "Kierunek testowy",
  startsAt: "2026-10-22T12:00:00+02:00", endsAt: "2026-10-22T13:00:00+02:00",
  evidence: "confirmed", sourceUrl: "https://example.com/test", fetchedAt: "2026-10-22T13:00:00+02:00",
};
const query = { carrier: "MPK Rzeszów", vehicle: "1234", date: "2026-10-22", time: "12:30" };
afterEach(() => { cleanup(); vi.useRealTimers(); provider.mockReset(); });

describe("course lookup lifecycle", () => {
  it("applies a single confirmed result without permission to replace manual fields", async () => {
    vi.useFakeTimers();
    provider.mockResolvedValue({ status: "available", courses: [course] });
    const onApply = vi.fn();
    render(<CourseLookup query={query} onApply={onApply} onClear={vi.fn()} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(onApply).toHaveBeenCalledWith(course, false);
  });
  it("does not apply a stale result after the requested vehicle changes", async () => {
    vi.useFakeTimers();
    let finish: ((value: { status: "available"; courses: VehicleCourse[] }) => void) | undefined;
    provider.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const onApply = vi.fn();
    const onClear = vi.fn();
    const view = render(<CourseLookup query={{ ...query, date: "2026-10-23" }} onApply={onApply} onClear={onClear} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    view.rerender(<CourseLookup query={{ ...query, vehicle: "5678" }} onApply={onApply} onClear={onClear} />);
    await act(async () => { finish?.({ status: "available", courses: [course] }); });
    expect(onApply).not.toHaveBeenCalled();
    expect(onClear).toHaveBeenCalledTimes(2);
  });
  it("does not automatically apply scheduled or ambiguous trips", async () => {
    vi.useFakeTimers();
    provider.mockResolvedValue({ status: "available", courses: [{ ...course, vehicle: "scheduled", evidence: "scheduled" }] });
    const onApply = vi.fn();
    const onClear = vi.fn();
    const view = render(<CourseLookup query={{ ...query, vehicle: "scheduled" }} onApply={onApply} onClear={onClear} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(onApply).not.toHaveBeenCalled();
    provider.mockResolvedValue({ status: "available", courses: [{ ...course, vehicle: "ambiguous" }, { ...course, id: "second", vehicle: "ambiguous", line: "13" }] });
    view.rerender(<CourseLookup query={{ ...query, vehicle: "ambiguous" }} onApply={onApply} onClear={onClear} />);
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(onApply).not.toHaveBeenCalled();
  });
});