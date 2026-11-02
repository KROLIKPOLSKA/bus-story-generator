import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { carrierFleets } from "@/data/vehicleDatabase";
import { formTypeOf, norm, type VehicleBase } from "@/lib/vehicleBases";

const LS = "gen_vehicle_sections";
type Row = { key: string; number: string; brand: string; model: string; operator: string; city: string; type: string; depot: string; source: string; extra: string };

function rowsFrom(bases: VehicleBase[]): Row[] {
  const builtin = carrierFleets.flatMap(({ carrier, fleet }) =>
    Object.entries(fleet).map(([number, v]) => ({ key: `b:${carrier}:${number}`, number, brand: v.brand, model: v.model, operator: carrier, city: "Rzeszów", type: "autobus", depot: "", source: "Wbudowana", extra: "" })));
  const local = bases.flatMap((b) => b.vehicles.map((v) => ({
    key: `l:${b.id}:${v.id}`, number: v.vehicle_number || v.fleet_id || v.registration_number || "—", brand: v.brand ?? "", model: v.model ?? "",
    operator: v.operator || b.operator, city: v.city || b.city, type: v.vehicle_type ?? "", depot: v.depot ?? "", source: b.name, extra: [v.registration_number, v.production_year, v.fuel_type].filter(Boolean).join(" · "),
  })));
  return [...builtin, ...local];
}

const typeGroup = (t: string) => { const n = norm(t); if (n.startsWith("trolejbus")) return "Trolejbusy"; const f = formTypeOf(t); return f === "autobus" ? "Autobusy" : f === "tramwaj" ? "Tramwaje" : "Inne pojazdy"; };

export default function VehicleBrowser({ bases }: { bases: VehicleBase[] }) {
  const [query, setQuery] = useState("");
  const [open, setOpenState] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem(LS) ?? "[]"); } catch { return []; } });
  const setOpen = (v: string[]) => { setOpenState(v); try { localStorage.setItem(LS, JSON.stringify(v)); } catch { /* ignore */ } };

  const all = useMemo(() => rowsFrom(bases), [bases]);
  const rows = useMemo(() => {
    const terms = norm(query).split(" ").filter(Boolean);
    return all.filter((r) => { const t = norm(`${r.operator} ${r.number} #${r.number} ${r.brand} ${r.model} ${r.city} ${r.depot} ${r.source} ${r.extra}`); return terms.every((x) => t.includes(x)); })
      .sort((a, b) => a.number.localeCompare(b.number, "pl", { numeric: true }));
  }, [all, query]);
  const sections = useMemo(() => {
    const by = (prefix: string, pick: (r: Row) => string) => {
      const m = new Map<string, Row[]>();
      rows.forEach((r) => { const k = pick(r); if (k) m.set(k, [...(m.get(k) ?? []), r]); });
      return [...m.entries()].sort(([a], [b]) => a.localeCompare(b, "pl")).map(([k, v]) => ({ id: `${prefix}:${k}`, title: k, group: prefix, rows: v }));
    };
    return [
      { id: "all", title: "Wszystkie pojazdy", group: "", rows },
      ...["Autobusy", "Tramwaje", "Trolejbusy", "Inne pojazdy"].map((t) => ({ id: `type:${t}`, title: t, group: "", rows: rows.filter((r) => typeGroup(r.type) === t) })),
      ...by("Według miasta", (r) => r.city), ...by("Według przewoźnika", (r) => r.operator), ...by("Według zajezdni", (r) => r.depot),
    ].filter((s) => s.rows.length > 0);
  }, [rows]);

  let lastGroup = "";
  return (
    <>
      <div className="relative shrink-0">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input aria-label="Szukaj pojazdu" placeholder="Numer, marka, model lub przewoźnik" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 pr-10" />
        {query && <Button variant="ghost" size="icon" className="absolute right-0 top-0" aria-label="Wyczyść wyszukiwanie" onClick={() => setQuery("")}><X /></Button>}
      </div>
      <div className="my-3 flex shrink-0 items-center justify-between">
        <p role="status" className="text-xs text-muted-foreground">Pojazdy: {rows.length}</p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setOpen(sections.map((s) => s.id))}>Rozwiń wszystkie</Button>
          <Button variant="ghost" size="sm" onClick={() => setOpen([])}>Zwiń wszystkie</Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {sections.map((s) => {
          const header = s.group && s.group !== lastGroup ? s.group : null;
          if (s.group) lastGroup = s.group;
          const isOpen = open.includes(s.id);
          return (
            <div key={s.id}>
              {header && <h3 className="pb-1 pt-4 text-xs font-semibold uppercase text-muted-foreground">{header}</h3>}
              <Collapsible open={isOpen} onOpenChange={(o) => setOpen(o ? [...open, s.id] : open.filter((x) => x !== s.id))}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border-b border-border py-3 text-left text-sm font-semibold hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span>{s.title}</span>
                  <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">{s.rows.length}<ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} /></span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {isOpen && <ul className="divide-y divide-border">
                    {s.rows.slice(0, 300).map((v) => (
                      <li key={v.key} className="flex items-start gap-3 py-3">
                        <span className="w-12 shrink-0 rounded-md bg-primary/10 py-1 text-center font-mono text-sm font-medium text-primary">{v.number}</span>
                        <div className="min-w-0"><p className="text-sm font-medium">{v.brand || "—"}</p><p className="break-words text-xs leading-relaxed text-muted-foreground">{[v.model, v.operator, v.source !== v.operator ? v.source : "", v.extra].filter(Boolean).join(" · ")}</p></div>
                      </li>
                    ))}
                    {s.rows.length > 300 && <li className="py-3 text-xs text-muted-foreground">Pokazano 300 z {s.rows.length}. Zawęź wyszukiwanie.</li>}
                  </ul>}
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}
        {rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nie znaleziono pojazdów.</p>}
      </div>
    </>
  );
}
