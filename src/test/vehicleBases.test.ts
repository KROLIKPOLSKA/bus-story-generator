import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { applyImport, autoMapHeaders, createBase, findLocalVehicle, mapRows, mergeCarrierOptions, parseJsonImport, resolveOperators, rowsFromSheet, suggestLocalVehicles, validateImport } from "@/lib/vehicleBases";

const json = JSON.stringify({ database: { name: "Moja baza", city: "Rzeszów", operator: "MPK Rzeszów" }, vehicles: [
  { vehicle_number: "001", vehicle_type: "autobus", brand: "Solaris", model: "Urbino" },
  { vehicle_number: "001", brand: "Duplikat" },
  { brand: "Bez numeru" },
  { vehicle_number: "002", operator: "Inny Przewoźnik", brand: "MAN", production_year: "abc" },
] });

describe("local vehicle bases", () => {
  it("reads metadata and vehicles from JSON keeping leading zeros", () => {
    const p = parseJsonImport(json);
    expect(p.meta.operator).toBe("MPK Rzeszów");
    expect(mapRows(p.rows, autoMapHeaders(p.headers))[0].vehicle_number).toBe("001");
  });
  it("accepts a plain array and rejects broken JSON", () => {
    expect(parseJsonImport('[{"numer taborowy":"7"}]').rows).toHaveLength(1);
    expect(() => parseJsonImport("{nie json")).toThrow("prawidłowym plikiem JSON");
    expect(() => parseJsonImport('{"a":1}')).toThrow("vehicles");
  });
  it("maps Polish Excel headers and keeps text numbers", () => {
    const ws = XLSX.utils.aoa_to_sheet([["Numer taborowy", "Marka", "Przewoźnik"], ["0042", "Jelcz", "MKS Dębica"]]);
    ws.A2.t = "s";
    const p = rowsFromSheet(XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }));
    expect(mapRows(p.rows, autoMapHeaders(p.headers))[0]).toMatchObject({ vehicle_number: "0042", brand: "Jelcz", operator: "MKS Dębica" });
  });
  it("reports missing ids, bad years, in-file duplicates and operator conflicts", () => {
    const p = parseJsonImport(json);
    const r = validateImport(mapRows(p.rows, autoMapHeaders(p.headers)), { operator: "MPK Rzeszów", vehicles: [] });
    expect(r.invalid.map((x) => x.index)).toEqual([2, 3]);
    expect(r.duplicatesInFile).toEqual([1]);
    expect(r.operatorConflicts).toEqual([3]);
  });
  it("never saves invalid rows or duplicates when adding", () => {
    const p = parseJsonImport(json);
    const res = applyImport([], mapRows(p.rows, autoMapHeaders(p.headers)), "add", "MPK Rzeszów");
    expect(res.vehicles.map((v) => v.vehicle_number)).toEqual(["001"]);
    expect(res.vehicles[0].operator).toBe("MPK Rzeszów");
  });
  it("updates matches only within the same operator and replaces only the given list", () => {
    const existing = [{ id: "a", vehicle_number: "10", operator: "A", brand: "Old" }, { id: "b", vehicle_number: "10", operator: "B", brand: "Keep" }];
    const up = applyImport(existing, [{ id: "x", vehicle_number: "10", operator: "A", brand: "New" }, { id: "y", vehicle_number: "11", operator: "A", brand: "Add" }], "update");
    expect(up).toMatchObject({ added: 1, updated: 1 });
    expect(up.vehicles.find((v) => v.id === "b")?.brand).toBe("Keep");
    expect(up.vehicles.find((v) => v.id === "a")?.brand).toBe("New");
    expect(applyImport(existing, [{ id: "z", vehicle_number: "99", brand: "R" }], "replace").vehicles).toHaveLength(1);
    expect(existing).toHaveLength(2);
  });
  it("lets the user resolve operator conflicts explicitly", () => {
    const recs = [{ id: "1", vehicle_number: "5", operator: "X" }, { id: "2", vehicle_number: "6" }];
    expect(resolveOperators(recs, "MPK", "record").map((r) => r.operator)).toEqual(["X", "MPK"]);
    expect(resolveOperators(recs, "MPK", "base").map((r) => r.operator)).toEqual(["MPK", "MPK"]);
  });
  it("adds new carriers without duplicates and filters autofill by carrier", () => {
    const base = { ...createBase({ name: "Mix", operator: "MKS Dębica" }), vehicles: [
      { id: "1", vehicle_number: "12", brand: "Autosan" }, { id: "2", vehicle_number: "12", operator: "mpk rzeszów", brand: "Solaris" }, { id: "3", vehicle_number: "33", operator: "PKS Mielec", brand: "Iveco" }] };
    expect(mergeCarrierOptions(["MPK Rzeszów", "PKS Rzeszów"], [base])).toEqual(["MPK Rzeszów", "PKS Rzeszów", "MKS Dębica", "PKS Mielec"]);
    expect(findLocalVehicle(base, "MKS Dębica", "12")?.brand).toBe("Autosan");
    expect(findLocalVehicle(base, "MPK Rzeszów", "12")?.brand).toBe("Solaris");
    expect(findLocalVehicle(base, "MKS Dębica", "33")).toBeUndefined();
    expect(suggestLocalVehicles(base, "PKS Mielec", "iveco").map((v) => v.id)).toEqual(["3"]);
  });
});
