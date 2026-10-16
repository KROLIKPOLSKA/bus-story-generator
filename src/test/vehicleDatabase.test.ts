import { describe, expect, it } from "vitest";
import { carrierFleets, searchVehicles } from "@/data/vehicleDatabase";

describe("vehicle database", () => {
  it("includes every existing vehicle grouped by its carrier", () => {
    const groups = searchVehicles("");
    expect(groups.map((group) => group.carrier)).toEqual(["MPK Rzeszów", "PKS Rzeszów"]);
    for (const { carrier, fleet } of carrierFleets) {
      expect(groups.find((group) => group.carrier === carrier)?.vehicles).toHaveLength(Object.keys(fleet).length);
    }
  });
  it("finds a fleet number and brand within the matching carrier", () => {
    expect(searchVehicles("MPK #442 Jelcz")[0].vehicles).toEqual([{ number: "442", brand: "Jelcz", model: "PR110U" }]);
    expect(searchVehicles("MPK #442 Jelcz")[1].vehicles).toEqual([]);
  });
  it("searches models and ignores case and Polish accents", () => {
    const groups = searchVehicles("pks rzeszow GOLDEN pivot");
    expect(groups[0].vehicles).toEqual([]);
    expect(groups[1].vehicles).toHaveLength(15);
    expect(groups[1].vehicles[0].number).toBe("132");
  });
  it("returns no matches for an unknown vehicle", () => {
    expect(searchVehicles("nieistniejacy-pojazd").every((group) => group.vehicles.length === 0)).toBe(true);
  });
});