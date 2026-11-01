import * as XLSX from "xlsx";
import { exportPayload, parseJsonImport, rowsFromSheet, VEHICLE_FIELDS, type ParsedImport, type VehicleBase } from "./vehicleBases";

const MAX_BYTES = 20 * 1024 * 1024;

export async function readImportFile(file: File): Promise<ParsedImport> {
  if (file.size > MAX_BYTES) throw new Error("Plik jest za duży (maksymalnie 20 MB).");
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "json") return parseJsonImport(await file.text());
  if (ext === "xlsx" || ext === "xls") {
    let wb: XLSX.WorkBook;
    try { wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellFormula: false, cellHTML: false }); }
    catch { throw new Error("Nie udało się odczytać pliku Excel. Plik może być uszkodzony."); }
    const dataName = wb.SheetNames.find((n) => /pojazd|vehicle/i.test(n)) ?? wb.SheetNames.find((n) => !/^baza$|database/i.test(n)) ?? wb.SheetNames[0];
    if (!dataName) throw new Error("Plik Excel nie zawiera arkuszy.");
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[dataName], { defval: "", raw: false });
    const metaName = wb.SheetNames.find((n) => /^baza$|database/i.test(n));
    const metaRows = metaName ? XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[metaName], { defval: "", raw: false }) : [];
    return rowsFromSheet(rows, metaRows);
  }
  throw new Error("Nieobsługiwany format pliku. Wybierz plik .json, .xlsx lub .xls.");
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const safe = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_|_$/g, "") || "baza";

export function downloadJson(base: VehicleBase) {
  download(new Blob([JSON.stringify(exportPayload(base), null, 2)], { type: "application/json" }), `${safe(base.name)}.json`);
}
export function downloadAllJson(bases: VehicleBase[]) {
  download(new Blob([JSON.stringify({ backup: "gen_vehicle_bases", exported_at: new Date().toISOString(), bases: bases.map(exportPayload) }, null, 2)], { type: "application/json" }), "kopia_baz_pojazdow.json");
}

function workbook(base: Pick<VehicleBase, "name" | "city" | "operator" | "category" | "description" | "vehicles">) {
  const wb = XLSX.utils.book_new();
  const rows = base.vehicles.map((v) => Object.fromEntries(VEHICLE_FIELDS.map((f) => [f, v[f] ?? ""])));
  const ws = XLSX.utils.json_to_sheet(rows, { header: [...VEHICLE_FIELDS] });
  // keep every cell as text so leading zeros survive a round-trip
  Object.keys(ws).forEach((k) => { if (!k.startsWith("!")) ws[k].t = "s"; });
  XLSX.utils.book_append_sheet(wb, ws, "pojazdy");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    { pole: "name", wartosc: base.name }, { pole: "city", wartosc: base.city }, { pole: "operator", wartosc: base.operator },
    { pole: "category", wartosc: base.category }, { pole: "description", wartosc: base.description },
  ]), "baza");
  return wb;
}
export function downloadXlsx(base: VehicleBase) { XLSX.writeFile(workbook(base), `${safe(base.name)}.xlsx`); }

export function downloadJsonTemplate() {
  const tpl = { database: { name: "", city: "", operator: "", category: "", description: "" }, vehicles: [Object.fromEntries(VEHICLE_FIELDS.map((f) => [f, ""]))] };
  download(new Blob([JSON.stringify(tpl, null, 2)], { type: "application/json" }), "szablon_bazy_pojazdow.json");
}
export function downloadXlsxTemplate() {
  const wb = workbook({ name: "", city: "", operator: "", category: "", description: "", vehicles: [] });
  XLSX.writeFile(wb, "szablon_bazy_pojazdow.xlsx");
}
