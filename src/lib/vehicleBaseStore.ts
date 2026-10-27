// Browser-local persistence for user vehicle databases (IndexedDB) + active-base pointer (localStorage).
// Nothing here is synchronized with the server.
import { useSyncExternalStore } from "react";
import type { VehicleBase } from "./vehicleBases";

const DB_NAME = "gen_vehicle_bases";
const STORE = "bases";
const ACTIVE_KEY = "gen_active_base";

type State = { status: "loading" | "ready" | "error"; bases: VehicleBase[]; activeId: string | null; error?: string };
let state: State = { status: "loading", bases: [], activeId: null };
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

function readActive() { try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; } }

export async function loadBases() {
  try {
    const bases = ((await tx<VehicleBase[]>("readonly", (s) => s.getAll())) ?? []).filter((b) => b && b.id && Array.isArray(b.vehicles));
    bases.sort((a, b) => a.name.localeCompare(b.name, "pl") || a.created_at.localeCompare(b.created_at));
    const saved = readActive();
    emit({ status: "ready", bases, activeId: bases.some((b) => b.id === saved) ? saved : null, error: undefined });
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
  emit({ bases: state.bases.filter((b) => b.id !== id), activeId: state.activeId === id ? null : state.activeId });
  if (readActive() === id) try { localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ }
}

export function setActiveBase(id: string | null) {
  try { if (id) localStorage.setItem(ACTIVE_KEY, id); else localStorage.removeItem(ACTIVE_KEY); } catch { /* ignore */ }
  emit({ activeId: id });
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
let started = false;
export function useVehicleBases() {
  if (!started && typeof window !== "undefined") { started = true; void loadBases(); }
  const s = useSyncExternalStore(subscribe, () => state);
  return { ...s, active: s.bases.find((b) => b.id === s.activeId) };
}
