// Browser-local persistence for user vehicle databases (IndexedDB) + active-base pointer (localStorage).
// Nothing here is synchronized with the server.
import { useSyncExternalStore } from "react";
import type { VehicleBase } from "./vehicleBases";

const DB_NAME = "gen_vehicle_bases";
const STORE = "bases";
const ACTIVE_KEY = "gen_active_base";

type State = { status: "loading" | "ready" | "error"; bases: VehicleBase[]; activeIds: string[]; error?: string };
let state: State = { status: "loading", bases: [], activeIds: [] };
const listeners = new Set<() => void>();
const emit = (next: Partial<State>) => { state = { ...state, ...next }; listeners.forEach((l) => l()); };

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Ta przeglądarka nie obsługuje lokalnej bazy danych (IndexedDB)."));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Nie udało się otworzyć lokalnej bazy danych."));
  });
  return dbPromise;
}

const tx = <T,>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void) =>
  openDb().then((db) => new Promise<T | undefined>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? (req.result as T) : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error("Operacja została przerwana."));
  }));

export function friendlyError(e: unknown): string {
  const name = (e as { name?: string })?.name;
  if (name === "QuotaExceededError") return "Brak miejsca w pamięci przeglądarki. Usuń niepotrzebne bazy lub zwolnij miejsce.";
  return e instanceof Error && e.message ? e.message : "Nieznany błąd zapisu danych.";
}

// Stored as a JSON array; an older single-id string is still accepted.
function readActive(): string[] {
  try { const raw = localStorage.getItem(ACTIVE_KEY); if (!raw) return []; try { const v = JSON.parse(raw); return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [String(v)]; } catch { return [raw]; } }
  catch { return []; }
}
function writeActive(ids: string[]) { try { if (ids.length) localStorage.setItem(ACTIVE_KEY, JSON.stringify(ids)); else localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ } }

export async function loadBases() {
  try {
    const bases = ((await tx<VehicleBase[]>("readonly", (s) => s.getAll())) ?? []).filter((b) => b && b.id && Array.isArray(b.vehicles));
    bases.sort((a, b) => a.name.localeCompare(b.name, "pl") || a.created_at.localeCompare(b.created_at));
    const saved = readActive();
    emit({ status: "ready", bases, activeIds: saved.filter((id) => bases.some((b) => b.id === id)), error: undefined });
  } catch (e) { emit({ status: "error", error: friendlyError(e) }); }
}

/** Writes a whole base atomically (one IndexedDB put); the in-memory list updates only after success. */
export async function saveBase(base: VehicleBase) {
  const next = { ...base, updated_at: new Date().toISOString() };
  await tx("readwrite", (s) => s.put(next));
  const others = state.bases.filter((b) => b.id !== next.id);
  emit({ bases: [...others, next].sort((a, b) => a.name.localeCompare(b.name, "pl")) });
  return next;
}

export async function deleteBase(id: string) {
  await tx("readwrite", (s) => s.delete(id));
  const activeIds = state.activeIds.filter((x) => x !== id);
  emit({ bases: state.bases.filter((b) => b.id !== id), activeIds });
  writeActive(activeIds);
}

/** Several bases may be active at once; autofill searches them all. */
export function setBaseActive(id: string, on: boolean) {
  const activeIds = on ? [...new Set([...state.activeIds, id])] : state.activeIds.filter((x) => x !== id);
  writeActive(activeIds);
  emit({ activeIds });
}
export function clearActiveBases() { writeActive([]); emit({ activeIds: [] }); }

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
let started = false;
export function useVehicleBases() {
  if (!started && typeof window !== "undefined") { started = true; void loadBases(); }
  const s = useSyncExternalStore(subscribe, () => state);
  return { ...s, actives: s.bases.filter((b) => s.activeIds.includes(b.id)) };
}
