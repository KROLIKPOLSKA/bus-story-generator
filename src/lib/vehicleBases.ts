// Pure model + logic for user-created local vehicle databases (no I/O here).
export const VEHICLE_FIELDS = [
  "vehicle_number", "city", "operator", "vehicle_type", "brand", "model",
  "registration_number", "fleet_id", "production_year", "depot", "fuel_type", "notes",
] as const;
export type VehicleField = (typeof VEHICLE_FIELDS)[number];
export type VehicleRecord = { id: string } & Partial<Record<VehicleField, string>>;

export const FIELD_LABELS: Record<VehicleField, string> = {
  vehicle_number: "Numer taborowy", city: "Miasto", operator: "Przewoźnik", vehicle_type: "Typ pojazdu",
  brand: "Marka", model: "Model", registration_number: "Nr rejestracyjny", fleet_id: "Identyfikator wewnętrzny",
  production_year: "Rok produkcji", depot: "Zajezdnia", fuel_type: "Rodzaj napędu", notes: "Dodatkowe informacje",
};

export interface VehicleBase {
  id: string; name: string; city: string; operator: string; category: string; description: string;
  created_at: string; updated_at: string; vehicles: VehicleRecord[];
}
export type BaseMeta = Pick<VehicleBase, "name" | "city" | "operator" | "category" | "description">;

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const norm = (v: unknown) =>
  String(v ?? "").toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ł/g, "l").replace(/[\s_\-./]+/g, " ").trim();

export function createBase(meta: Partial<BaseMeta>, now = new Date()): VehicleBase {
  const t = now.toISOString();
  return { id: newId(), name: meta.name?.trim() || "Nowa baza", city: meta.city?.trim() ?? "", operator: meta.operator?.trim() ?? "",
    category: meta.category?.trim() ?? "", description: meta.description?.trim() ?? "", created_at: t, updated_at: t, vehicles: [] };
}

/** Clean a raw value into a trimmed string; numbers become text so leading zeros typed as text survive. */
export function cleanValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return "";
  return String(v).replace(/[\u0000-\u001f]/g, " ").trim();
}

export function cleanRecord(raw: Partial<Record<VehicleField, unknown>>, id = newId()): VehicleRecord {
  const rec: VehicleRecord = { id };
  for (const f of VEHICLE_FIELDS) { const v = cleanValue(raw[f]); if (v) rec[f] = v; }
  return rec;
}

/** Identity of a vehicle inside one base: operator + best available identifier. */
export function recordKey(r: VehicleRecord): string | null {
  const ident = r.vehicle_number ? `n:${norm(r.vehicle_number)}` : r.fleet_id ? `f:${norm(r.fleet_id)}` : r.registration_number ? `r:${norm(r.registration_number)}` : null;
  return ident ? `${norm(r.operator)}|${ident}` : null;
}

export function recordIssues(r: VehicleRecord): string[] {
  const issues: string[] = [];
  if (!r.vehicle_number && !r.fleet_id && !r.registration_number) issues.push("Brak numeru taborowego lub innego identyfikatora");
  if (r.production_year && !/^(18|19|20)\d{2}$/.test(r.production_year)) issues.push("Nieprawidłowy rok produkcji");
  if (!r.brand && !r.model) issues.push("Brak marki i modelu");
  return issues;
}

// ---------- header mapping ----------
const ALIASES: Record<VehicleField, string[]> = {
  vehicle_number: ["vehicle number", "numer taborowy", "nr taborowy", "numer boczny", "nr boczny", "taborowy", "numer", "nr", "number", "side number"],
  city: ["city", "miasto", "obszar"],
  operator: ["operator", "przewoznik", "carrier", "firma"],
  vehicle_type: ["vehicle type", "typ", "typ pojazdu", "rodzaj pojazdu", "type", "kategoria"],
  brand: ["brand", "marka", "producent", "manufacturer"],
  model: ["model", "typ modelu"],
  registration_number: ["registration number", "rejestracja", "nr rejestracyjny", "numer rejestracyjny", "registration", "plate"],
  fleet_id: ["fleet id", "id wewnetrzny", "identyfikator", "identyfikator wewnetrzny", "internal id"],
  production_year: ["production year", "rok produkcji", "rok", "year"],
  depot: ["depot", "zajezdnia", "baza", "garage"],
  fuel_type: ["fuel type", "naped", "rodzaj napedu", "paliwo", "fuel"],
  notes: ["notes", "uwagi", "informacje", "dodatkowe informacje", "opis"],
};

export type ColumnMapping = Record<string, VehicleField | "">;

export function autoMapHeaders(headers: string[]): ColumnMapping {
  const used = new Set<VehicleField>();
  const map: ColumnMapping = {};
  for (const h of headers) {
    const n = norm(h);
    const f = VEHICLE_FIELDS.find((field) => !used.has(field) && (n === norm(field) || ALIASES[field].includes(n)));
    map[h] = f ?? "";
    if (f) used.add(f);
  }
  return map;
}

export interface ParsedImport { meta: Partial<BaseMeta>; rows: Record<string, unknown>[]; headers: string[]; }

const isPlainRow = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);

function headersOf(rows: Record<string, unknown>[]) {
  const set = new Set<string>();
  rows.forEach((r) => Object.keys(r).forEach((k) => set.add(k)));
  return [...set];
}

/** Accepts `{ database, vehicles }` or a plain array of objects. Data is never evaluated. */
export function parseJsonImport(text: string): ParsedImport {
  let data: unknown;
  try { data = JSON.parse(text.replace(/^\uFEFF/, "")); } catch { throw new Error("Plik nie jest prawidłowym plikiem JSON."); }
  let meta: Partial<BaseMeta> = {};
  let list: unknown;
  if (Array.isArray(data)) list = data;
  else if (isPlainRow(data) && Array.isArray(data.vehicles)) {
    list = data.vehicles;
    const db = isPlainRow(data.database) ? data.database : {};
    meta = { name: cleanValue(db.name), city: cleanValue(db.city), operator: cleanValue(db.operator), category: cleanValue(db.category), description: cleanValue(db.description) };
  } else throw new Error("Nieobsługiwana struktura JSON. Oczekiwano tablicy pojazdów lub obiektu z polem „vehicles”.");
  const rows = (list as unknown[]).filter(isPlainRow);
  if (rows.length === 0) throw new Error("Plik nie zawiera żadnych rekordów pojazdów.");
  return { meta, rows, headers: headersOf(rows) };
}

export function rowsFromSheet(rows: Record<string, unknown>[], metaRows: Record<string, unknown>[] = []): ParsedImport {
  const clean = rows.filter((r) => Object.values(r).some((v) => cleanValue(v)));
  if (clean.length === 0) throw new Error("Arkusz nie zawiera żadnych rekordów pojazdów.");
  const meta: Partial<BaseMeta> = {};
  for (const m of metaRows) {
    const k = norm(m.pole ?? m.key ?? m.field); const v = cleanValue(m.wartosc ?? m["wartość"] ?? m.value);
    if (k === "name" || k === "nazwa") meta.name = v;
    if (k === "city" || k === "miasto") meta.city = v;
    if (k === "operator" || k === "przewoznik") meta.operator = v;
    if (k === "category" || k === "kategoria") meta.category = v;
    if (k === "description" || k === "opis") meta.description = v;
  }
  return { meta, rows: clean, headers: headersOf(clean) };
}

export function mapRows(rows: Record<string, unknown>[], mapping: ColumnMapping): VehicleRecord[] {
  return rows.map((row) => {
    const raw: Partial<Record<VehicleField, unknown>> = {};
    for (const [col, field] of Object.entries(mapping)) if (field && raw[field] === undefined) raw[field] = row[col];
    return cleanRecord(raw);
  });
}

// ---------- validation + merge ----------
export type ImportMode = "add" | "update" | "replace";
export type ConflictChoice = "record" | "base";

export interface ImportReport {
  total: number; valid: number; invalid: { index: number; issues: string[] }[];
  duplicatesInFile: number[]; existingMatches: number[]; operatorConflicts: number[];
}

/** Applies a base operator to records lacking one, or (on "base" choice) to conflicting records. */
export function resolveOperators(records: VehicleRecord[], baseOperator: string, choice: ConflictChoice): VehicleRecord[] {
  const op = baseOperator.trim();
  if (!op) return records;
  return records.map((r) => (!r.operator || (choice === "base" && norm(r.operator) !== norm(op)) ? { ...r, operator: op } : r));
}

export function validateImport(records: VehicleRecord[], base: Pick<VehicleBase, "operator" | "vehicles">): ImportReport {
  const invalid: ImportReport["invalid"] = [];
  const dupFile: number[] = []; const existing: number[] = []; const conflicts: number[] = [];
  const seen = new Set<string>();
  const existingKeys = new Set(base.vehicles.map(recordKey).filter(Boolean) as string[]);
  records.forEach((r, i) => {
    const hasId = !!(r.vehicle_number || r.fleet_id || r.registration_number);
    const issues = recordIssues(r).filter((x) => !x.startsWith("Brak marki"));
    if (!hasId || issues.length) invalid.push({ index: i, issues });
    if (base.operator && r.operator && norm(r.operator) !== norm(base.operator)) conflicts.push(i);
    const key = recordKey({ ...r, operator: r.operator || base.operator });
    if (!key) return;
    if (seen.has(key)) dupFile.push(i); else seen.add(key);
    if (existingKeys.has(key)) existing.push(i);
  });
  return { total: records.length, valid: records.length - invalid.length, invalid, duplicatesInFile: dupFile, existingMatches: existing, operatorConflicts: conflicts };
}

export interface ImportResult { vehicles: VehicleRecord[]; added: number; updated: number; skipped: number; }

/** Produces the new vehicle list for ONE base; invalid rows and in-file duplicates are never saved. */
export function applyImport(existing: VehicleRecord[], incoming: VehicleRecord[], mode: ImportMode, baseOperator = ""): ImportResult {
  const withOp = (r: VehicleRecord) => ({ ...r, operator: r.operator || baseOperator || undefined });
  const valid = incoming.map(withOp).filter((r) => recordIssues(r).every((x) => x.startsWith("Brak marki")));
  const seen = new Set<string>(); const unique: VehicleRecord[] = []; let skipped = incoming.length - valid.length;
  for (const r of valid) { const k = recordKey(r)!; if (seen.has(k)) { skipped++; continue; } seen.add(k); unique.push(r); }
  if (!baseOperator) unique.forEach((r) => { if (!r.operator) delete r.operator; });
  if (mode === "replace") return { vehicles: unique.map((r) => ({ ...r, id: newId() })), added: unique.length, updated: 0, skipped };
  const list = existing.map((r) => ({ ...r }));
  const index = new Map(list.map((r, i) => [recordKey(r), i] as const));
  let added = 0; let updated = 0;
  for (const r of unique) {
    const at = index.get(recordKey(r));
    if (at === undefined) { list.push({ ...r, id: newId() }); index.set(recordKey(r), list.length - 1); added++; }
    else if (mode === "update") {
      const merged = { ...list[at] };
      for (const f of VEHICLE_FIELDS) if (r[f]) merged[f] = r[f];
      list[at] = merged; updated++;
    } else skipped++;
  }
  return { vehicles: list, added, updated, skipped };
}

// ---------- form integration ----------
export function operatorsOf(bases: VehicleBase[]): string[] {
  const out = new Map<string, string>();
  for (const b of bases) {
    if (b.operator.trim()) out.set(norm(b.operator), b.operator.trim());
    for (const v of b.vehicles) if (v.operator?.trim() && !out.has(norm(v.operator))) out.set(norm(v.operator), v.operator.trim());
  }
  return [...out.values()];
}

export function mergeCarrierOptions(builtin: string[], bases: VehicleBase[]): string[] {
  const seen = new Set(builtin.map(norm));
  return [...builtin, ...operatorsOf(bases).filter((o) => !seen.has(norm(o)) && seen.add(norm(o)))];
}

const recOperator = (b: VehicleBase, r: VehicleRecord) => r.operator || b.operator;
export const operatorMatches = (b: VehicleBase, r: VehicleRecord, operator: string) =>
  !operator.trim() || norm(recOperator(b, r)) === norm(operator);

export function findLocalVehicle(base: VehicleBase | undefined, operator: string, number: string): VehicleRecord | undefined {
  const n = norm(number);
  if (!base || !n) return undefined;
  return base.vehicles.find((r) => operatorMatches(base, r, operator) && (norm(r.vehicle_number) === n || (!r.vehicle_number && (norm(r.fleet_id) === n || norm(r.registration_number) === n))));
}

export function suggestLocalVehicles(base: VehicleBase | undefined, operator: string, query: string, limit = 6): VehicleRecord[] {
  const terms = norm(query).split(" ").filter(Boolean);
  if (!base || terms.length === 0) return [];
  return base.vehicles
    .filter((r) => operatorMatches(base, r, operator))
    .filter((r) => { const t = norm([r.vehicle_number, r.brand, r.model, r.registration_number, r.fleet_id, r.depot].join(" ")); return terms.every((x) => t.includes(x)); })
    .slice(0, limit);
}

export function formTypeOf(vehicleType?: string): "autobus" | "tramwaj" | "pociag" | "inny" | undefined {
  const t = norm(vehicleType);
  if (!t) return undefined;
  if (t.startsWith("autobus") || t === "bus") return "autobus";
  if (t.startsWith("tramwaj") || t === "tram") return "tramwaj";
  if (t.startsWith("pociag") || t.includes("train") || t.includes("kolej")) return "pociag";
  return "inny";
}

export function exportPayload(base: VehicleBase) {
  const { vehicles, ...meta } = base;
  return { database: meta, vehicles: vehicles.map(({ id: _id, ...rest }) => rest) };
}
