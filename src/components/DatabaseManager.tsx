import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Copy, Database, Download, FileJson, FileSpreadsheet, Loader2, Pencil, Plus, Search, Trash2, Upload, CheckCircle2, Star, GraduationCap, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BaseTutorial, AiPromptView } from "@/components/DatabaseHelp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  applyImport, autoMapHeaders, cleanRecord, createBase, FIELD_LABELS, mapRows, newId, norm, recordIssues, recordKey, resolveOperators, validateImport, VEHICLE_FIELDS, VEHICLE_TYPE_OPTIONS,
  type BaseMeta, type ColumnMapping, type ConflictChoice, type ImportMode, type ParsedImport, type VehicleBase, type VehicleField, type VehicleRecord,
} from "@/lib/vehicleBases";
import { deleteBase, friendlyError, saveBase, setBaseActive, useVehicleBases } from "@/lib/vehicleBaseStore";
import { downloadAllJson, downloadJson, downloadJsonTemplate, downloadXlsx, downloadXlsxTemplate, readImportFile } from "@/lib/vehicleFiles";

type View = { name: "home" } | { name: "editor"; draft: VehicleBase; isNew: boolean } | { name: "import" } | { name: "tutorial" } | { name: "prompt" };
type Confirm = { title: string; text: string; action: string; run: () => void } | null;

const fmt = (iso: string) => new Date(iso).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
const shortId = (id: string) => id.slice(0, 8);

export default function DatabaseManager({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const store = useVehicleBases();
  const [view, setView] = useState<View>({ name: "home" });
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);

  const leave = (after: () => void) => {
    if (dirty) setConfirm({ title: "Odrzucić niezapisane zmiany?", text: "Zmiany wprowadzone w tym widoku nie zostaną zapisane.", action: "Odrzuć zmiany", run: () => { setDirty(false); after(); } });
    else after();
  };
  const close = (o: boolean) => { if (o) return onOpenChange(true); leave(() => { setView({ name: "home" }); onOpenChange(false); }); };
  const back = () => leave(() => setView({ name: "home" }));
  const nameCount = (n: string) => store.bases.filter((b) => norm(b.name) === norm(n)).length;

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-b border-border p-5 pr-12 text-left">
            <div className="flex items-center gap-2">
              {view.name !== "home" && <Button variant="ghost" size="icon" aria-label="Wróć" onClick={back} className="-ml-2 h-8 w-8"><ArrowLeft /></Button>}
              <DialogTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-primary" />
                {view.name === "home" ? "Zarządzaj bazami" : view.name === "import" ? "Importuj zewnętrzną bazę" : view.name === "tutorial" ? "Poradnik" : view.name === "prompt" ? "Prompt dla SI" : view.isNew ? "Nowa baza" : "Edytuj bazę"}
              </DialogTitle>
            </div>
            <DialogDescription>Bazy są zapisywane tylko na tym urządzeniu, w pamięci przeglądarki.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {store.status === "loading" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Wczytywanie baz…</p>}
            {store.status === "error" && <p role="alert" className="text-sm text-destructive">Nie udało się odczytać baz: {store.error}</p>}
            {store.status === "ready" && view.name === "home" && (
              <Home bases={store.bases} activeIds={store.activeIds} nameCount={nameCount}
                onTutorial={() => setView({ name: "tutorial" })} onPrompt={() => setView({ name: "prompt" })}
                onCreate={() => { setDirty(false); setView({ name: "editor", draft: createBase({}), isNew: true }); }}
                onImport={() => { setDirty(false); setView({ name: "import" }); }}
                onEdit={(b) => { setDirty(false); setView({ name: "editor", draft: structuredClone(b), isNew: false }); }}
                onDelete={(b) => setConfirm({ title: `Usunąć bazę „${b.name}”?`, text: `Baza (ID ${shortId(b.id)}) i jej ${b.vehicles.length} pojazdów zostaną trwale usunięte z tego urządzenia.`, action: "Usuń bazę",
                  run: () => deleteBase(b.id).then(() => toast.success("Usunięto bazę")).catch((e) => toast.error(friendlyError(e))) })}
              />
            )}
            {view.name === "editor" && <Editor key={view.draft.id} initial={view.draft} isNew={view.isNew} onDirty={setDirty} onConfirm={setConfirm} onDone={() => { setDirty(false); setView({ name: "home" }); }} onCancel={back} />}
            {view.name === "tutorial" && <BaseTutorial onPrompt={() => setView({ name: "prompt" })} onImport={() => setView({ name: "import" })} />}
            {view.name === "prompt" && <AiPromptView />}
            {view.name === "import" && <Importer bases={store.bases} onDirty={setDirty} onConfirm={setConfirm} onDone={() => { setDirty(false); setView({ name: "home" }); }} onCancel={back} />}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{confirm?.title}</AlertDialogTitle><AlertDialogDescription>{confirm?.text}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { const c = confirm; setConfirm(null); c?.run(); }}>{confirm?.action}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ActionCard({ icon: Icon, title, text, onClick, disabled }: { icon: typeof Upload; title: string; text: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
      <span className="rounded-md bg-primary/10 p-2 text-primary"><Icon className="h-5 w-5" /></span>
      <span><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{text}</span></span>
    </button>
  );
}

function IconAction({ label, onClick, className, children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild><Button variant="ghost" size="icon" aria-label={label} onClick={onClick} className={className}>{children}</Button></TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Home({ bases, activeIds, nameCount, onCreate, onImport, onEdit, onDelete, onTutorial, onPrompt }: {
  bases: VehicleBase[]; activeIds: string[]; nameCount: (n: string) => number; onTutorial: () => void; onPrompt: () => void;
  onCreate: () => void; onImport: () => void; onEdit: (b: VehicleBase) => void; onDelete: (b: VehicleBase) => void;
}) {
  const duplicate = (b: VehicleBase) => {
    const copy: VehicleBase = { ...structuredClone(b), id: newId(), name: `${b.name} (kopia)`, created_at: new Date().toISOString(), vehicles: b.vehicles.map((v) => ({ ...v, id: newId() })) };
    saveBase(copy).then(() => toast.success("Utworzono kopię bazy")).catch((e) => toast.error(friendlyError(e)));
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionCard icon={GraduationCap} title="Poradnik" text="Krok po kroku: jak przygotować, zaimportować i włączyć własną bazę pojazdów." onClick={onTutorial} />
        <ActionCard icon={Sparkles} title="Prompt dla SI" text="Skopiuj gotowe polecenie dla ChatGPT lub innej SI, które przygotuje poprawny plik JSON." onClick={onPrompt} />
        <ActionCard icon={Upload} title="Importuj zewnętrzną bazę" text="Wczytaj pojazdy z pliku JSON lub Excel, sprawdź podgląd i zatwierdź zapis." onClick={onImport} />
        <ActionCard icon={Plus} title="Utwórz bazę w aplikacji" text="Utwórz pustą bazę, np. „MPK Kraków”, i dodawaj pojazdy w formularzu." onClick={onCreate} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={downloadJsonTemplate}><FileJson /> Pobierz szablon JSON</Button>
        <Button variant="outline" size="sm" onClick={downloadXlsxTemplate}><FileSpreadsheet /> Pobierz szablon Excel</Button>
        {bases.length > 0 && <Button variant="outline" size="sm" onClick={() => downloadAllJson(bases)}><Download /> Kopia zapasowa wszystkich baz</Button>}
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Twoje bazy</h3>
          {bases.length > 1 && <span className="text-xs text-muted-foreground">Aktywnych może być kilka naraz</span>}
        </div>
        {bases.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nie masz jeszcze własnych baz. Zaimportuj plik lub utwórz bazę w aplikacji.</p>}
        <TooltipProvider delayDuration={200}>
        <ul className="space-y-2">
          {bases.map((b) => { const isActive = activeIds.includes(b.id); return (
            <li key={b.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">{b.name}
                    {nameCount(b.name) > 1 && <span className="font-mono text-xs font-normal text-muted-foreground">#{shortId(b.id)}</span>}
                    {isActive && <Badge>Aktywna</Badge>}</p>
                  <p className="text-xs text-muted-foreground">{[b.city, b.operator, b.category].filter(Boolean).join(" · ") || "Brak metadanych"} · {b.vehicles.length} pojazdów</p>
                  <p className="text-xs text-muted-foreground">Utworzono {fmt(b.created_at)} · zmieniono {fmt(b.updated_at)}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild><Button variant={isActive ? "secondary" : "outline"} size="sm" onClick={() => setBaseActive(b.id, !isActive)} aria-pressed={isActive}><Star /> {isActive ? "Aktywna" : "Włącz"}</Button></TooltipTrigger>
                    <TooltipContent>{isActive ? "Wyłącz tę bazę z autouzupełniania" : "Używaj tej bazy w autouzupełnianiu (razem z innymi aktywnymi)"}</TooltipContent>
                  </Tooltip>
                  <IconAction label="Edytuj bazę i jej pojazdy" onClick={() => onEdit(b)}><Pencil /></IconAction>
                  <IconAction label="Utwórz kopię bazy" onClick={() => duplicate(b)}><Copy /></IconAction>
                  <IconAction label="Pobierz bazę jako plik JSON" onClick={() => downloadJson(b)}><FileJson /></IconAction>
                  <IconAction label="Pobierz bazę jako plik Excel" onClick={() => downloadXlsx(b)}><FileSpreadsheet /></IconAction>
                  <IconAction label="Usuń bazę" onClick={() => onDelete(b)} className="text-destructive"><Trash2 /></IconAction>
                </div>
              </div>
            </li>
          ); })}
        </ul>
        </TooltipProvider>
      </section>
    </div>
  );
}

function MetaFields({ meta, onChange }: { meta: Partial<BaseMeta>; onChange: (m: Partial<BaseMeta>) => void }) {
  const f = (k: keyof BaseMeta, label: string, ph: string) => (
    <div className="space-y-1.5"><Label htmlFor={`meta-${k}`}>{label}</Label><Input id={`meta-${k}`} placeholder={ph} value={meta[k] ?? ""} onChange={(e) => onChange({ ...meta, [k]: e.target.value })} /></div>
  );
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {f("name", "Nazwa bazy", "np. MPK Kraków")}{f("city", "Miasto / obszar", "np. Kraków")}
      {f("operator", "Przewoźnik", "np. MPK Kraków")}{f("category", "Kategoria pojazdów", "np. autobusy")}
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="meta-description">Opis (opcjonalnie)</Label><Textarea id="meta-description" rows={2} value={meta.description ?? ""} onChange={(e) => onChange({ ...meta, description: e.target.value })} /></div>
    </div>
  );
}

const emptyForm = (): Partial<Record<VehicleField, string>> => ({});

function Editor({ initial, isNew, onDirty, onConfirm, onDone, onCancel }: {
  initial: VehicleBase; isNew: boolean; onDirty: (d: boolean) => void; onConfirm: (c: Confirm) => void; onDone: () => void; onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<VehicleField>("vehicle_number");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const firstField = useRef<HTMLInputElement>(null);
  const update = (d: VehicleBase) => { setDraft(d); onDirty(true); };

  const list = useMemo(() => {
    const terms = norm(query).split(" ").filter(Boolean);
    return draft.vehicles
      .filter((v) => !onlyIssues || recordIssues(v).length > 0)
      .filter((v) => { const t = norm(VEHICLE_FIELDS.map((f) => v[f] ?? "").join(" ")); return terms.every((x) => t.includes(x)); })
      .sort((a, b) => (a[sort] ?? "").localeCompare(b[sort] ?? "", "pl", { numeric: true }));
  }, [draft.vehicles, query, sort, onlyIssues]);

  const submit = (again: boolean) => {
    const rec = cleanRecord(form, editingId ?? newId());
    const issues = recordIssues(rec).filter((x) => !x.startsWith("Brak marki"));
    if (issues.length) return setFormError(issues.join(". "));
    const key = recordKey({ ...rec, operator: rec.operator || draft.operator });
    if (draft.vehicles.some((v) => v.id !== rec.id && recordKey({ ...v, operator: v.operator || draft.operator }) === key)) return setFormError("Pojazd o tym identyfikatorze i przewoźniku już istnieje w tej bazie.");
    update({ ...draft, vehicles: editingId ? draft.vehicles.map((v) => (v.id === editingId ? rec : v)) : [...draft.vehicles, rec] });
    setFormError(""); setEditingId(null);
    setForm(again ? { city: rec.city, operator: rec.operator, vehicle_type: rec.vehicle_type, depot: rec.depot } : emptyForm());
    if (again) firstField.current?.focus();
  };
  const save = async () => {
    if (!draft.name.trim()) return toast.error("Podaj nazwę bazy.");
    setSaving(true);
    try { await saveBase({ ...draft, name: draft.name.trim() }); toast.success(isNew ? "Utworzono bazę" : "Zapisano zmiany"); onDone(); }
    catch (e) { toast.error(friendlyError(e)); } finally { setSaving(false); }
  };
  const conflict = (v: VehicleRecord) => draft.operator && v.operator && norm(v.operator) !== norm(draft.operator);

  return (
    <div className="space-y-6">
      <MetaFields meta={draft} onChange={(m) => update({ ...draft, ...m })} />
      <section className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="text-sm font-semibold">{editingId ? "Edytuj pojazd" : "Dodaj pojazd"}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {VEHICLE_FIELDS.map((f, i) => (
            <div key={f} className={f === "notes" ? "space-y-1.5 sm:col-span-3" : "space-y-1.5"}>
              <Label htmlFor={`veh-${f}`} className="text-xs">{FIELD_LABELS[f]}</Label>
              {f === "vehicle_type" ? (
                <Select value={form.vehicle_type || "__none"} onValueChange={(v) => setForm({ ...form, vehicle_type: v === "__none" ? "" : v })}>
                  <SelectTrigger id={`veh-${f}`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="__none">— nie wybrano —</SelectItem>{VEHICLE_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
              <Input id={`veh-${f}`} ref={i === 0 ? firstField : undefined} value={form[f] ?? ""} inputMode={f === "production_year" ? "numeric" : undefined}
                placeholder={f === "operator" && draft.operator ? draft.operator : undefined}
                onChange={(e) => setForm({ ...form, [f]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && submit(true)} />)}
            </div>
          ))}
        </div>
        {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => submit(false)}>{editingId ? "Zapisz pojazd" : "Dodaj pojazd"}</Button>
          {!editingId && <Button size="sm" variant="outline" onClick={() => submit(true)}>Dodaj i kolejny</Button>}
          {(editingId || Object.values(form).some(Boolean)) && <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm()); setFormError(""); }}>Wyczyść formularz</Button>}
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Szukaj w bazie" placeholder="Szukaj w bazie" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" /></div>
          <Select value={sort} onValueChange={(v) => setSort(v as VehicleField)}>
            <SelectTrigger className="sm:w-48" aria-label="Sortuj według"><SelectValue /></SelectTrigger>
            <SelectContent>{(["vehicle_number", "brand", "model", "operator", "production_year", "depot"] as VehicleField[]).map((f) => <SelectItem key={f} value={f}>Sortuj: {FIELD_LABELS[f]}</SelectItem>)}</SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm"><Checkbox checked={onlyIssues} onCheckedChange={(c) => setOnlyIssues(c === true)} /> Tylko z problemami</label>
        </div>
        <p role="status" className="text-xs text-muted-foreground">Rekordy: {list.length} z {draft.vehicles.length}</p>
        {draft.vehicles.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Baza jest pusta. Dodaj pierwszy pojazd w formularzu powyżej.</p>}
        <ul className="divide-y divide-border rounded-lg border border-border">
          {list.map((v) => {
            const issues = recordIssues(v);
            return (
              <li key={v.id} className="flex items-start gap-3 p-3">
                <span className="w-14 shrink-0 rounded-md bg-primary/10 py-1 text-center font-mono text-sm font-medium text-primary">{v.vehicle_number || "—"}</span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">{[v.brand, v.model].filter(Boolean).join(" ") || "Brak marki i modelu"}</p>
                  <p className="break-words text-xs text-muted-foreground">{[v.operator, v.city, v.vehicle_type, v.production_year, v.depot].filter(Boolean).join(" · ")}</p>
                  {issues.length > 0 && <p className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" /> {issues.join(", ")}</p>}
                  {conflict(v) && <p className="mt-1 flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" /> Przewoźnik różni się od przewoźnika bazy ({draft.operator})</p>}
                </div>
                <Button variant="ghost" size="icon" aria-label={`Edytuj pojazd ${v.vehicle_number ?? ""}`} onClick={() => { setEditingId(v.id); setForm({ ...v }); setFormError(""); firstField.current?.focus(); }}><Pencil /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" aria-label={`Usuń pojazd ${v.vehicle_number ?? ""}`}
                  onClick={() => onConfirm({ title: "Usunąć pojazd?", text: `Pojazd ${v.vehicle_number} zostanie usunięty z tej bazy po zapisaniu zmian.`, action: "Usuń", run: () => update({ ...draft, vehicles: draft.vehicles.filter((x) => x.id !== v.id) }) })}><Trash2 /></Button>
              </li>
            );
          })}
        </ul>
      </section>
      <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-border bg-background p-4">
        <Button variant="outline" onClick={onCancel}>Anuluj</Button>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="animate-spin" />} {isNew ? "Utwórz bazę" : "Zapisz zmiany"}</Button>
      </div>
    </div>
  );
}

const NEW_TARGET = "__new__";
const modeLabels: Record<ImportMode, string> = { add: "Dodaj rekordy", update: "Aktualizuj istniejące", replace: "Zastąp zawartość bazy" };

function Importer({ bases, onDirty, onConfirm, onDone, onCancel }: {
  bases: VehicleBase[]; onDirty: (d: boolean) => void; onConfirm: (c: Confirm) => void; onDone: () => void; onCancel: () => void;
}) {
  const [parsed, setParsed] = useState<(ParsedImport & { file: string }) | null>(null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [target, setTarget] = useState(NEW_TARGET);
  const [meta, setMeta] = useState<Partial<BaseMeta>>({});
  const [mode, setMode] = useState<ImportMode>("add");
  const [choice, setChoice] = useState<ConflictChoice>("record");
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async (file?: File) => {
    if (!file) return;
    setError(""); setReading(true);
    try {
      const p = await readImportFile(file);
      setParsed({ ...p, file: file.name }); setMapping(autoMapHeaders(p.headers));
      setMeta({ name: p.meta.name || file.name.replace(/\.[^.]+$/, ""), city: p.meta.city, operator: p.meta.operator, category: p.meta.category, description: p.meta.description });
      setTarget(NEW_TARGET); setMode("add"); onDirty(true);
    } catch (e) { setParsed(null); setError(e instanceof Error ? e.message : "Nie udało się odczytać pliku."); }
    finally { setReading(false); if (inputRef.current) inputRef.current.value = ""; }
  };

  const targetBase = bases.find((b) => b.id === target);
  const baseOperator = (targetBase ? targetBase.operator : meta.operator ?? "").trim();
  const records = useMemo(() => (parsed ? resolveOperators(mapRows(parsed.rows, mapping), baseOperator, choice) : []), [parsed, mapping, baseOperator, choice]);
  const rawConflicts = useMemo(() => (parsed ? validateImport(mapRows(parsed.rows, mapping), { operator: baseOperator, vehicles: [] }).operatorConflicts.length : 0), [parsed, mapping, baseOperator]);
  const report = useMemo(() => validateImport(records, { operator: baseOperator, vehicles: targetBase?.vehicles ?? [] }), [records, baseOperator, targetBase]);
  const mappedId = Object.values(mapping).some((f) => f === "vehicle_number");
  const committing = useRef(false);

  const commit = async () => {
    // ref guard: a fast double click must never create two bases
    if (committing.current || summary) return;
    committing.current = true;
    setBusy(true);
    try {
      const base = targetBase ? structuredClone(targetBase) : createBase(meta);
      const res = applyImport(base.vehicles, records, targetBase ? mode : "add", base.operator);
      await saveBase({ ...base, vehicles: res.vehicles });
      setSummary(`Zapisano bazę „${base.name}”: dodano ${res.added}, zaktualizowano ${res.updated}, pominięto ${res.skipped}. Łącznie pojazdów: ${res.vehicles.length}.`);
      onDirty(false); toast.success("Import zakończony");
    } catch (e) { committing.current = false; toast.error(`Import nie został zapisany: ${friendlyError(e)}`); }
    finally { setBusy(false); }
  };
  const start = () => {
    if (targetBase && mode === "replace") onConfirm({ title: `Zastąpić zawartość „${targetBase.name}”?`, text: `Wszystkie ${targetBase.vehicles.length} pojazdów tej bazy zostaną zastąpione rekordami z pliku. Inne bazy pozostaną bez zmian.`, action: "Zastąp", run: commit });
    else void commit();
  };

  if (summary) return (
    <div className="space-y-4 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
      <p className="text-sm">{summary}</p>
      <Button onClick={onDone}>Gotowe</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); void load(e.dataTransfer.files[0]); }}
        className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-primary bg-primary/5" : "border-border"}`}>
        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm">Przeciągnij tutaj plik .json, .xlsx lub .xls albo</p>
        <input ref={inputRef} type="file" accept=".json,.xlsx,.xls,application/json" className="sr-only" id="import-file" aria-label="Wybierz plik bazy" onChange={(e) => void load(e.target.files?.[0])} />
        <Button className="mt-3" variant="outline" onClick={() => inputRef.current?.click()} disabled={reading}>{reading ? <><Loader2 className="animate-spin" /> Wczytywanie…</> : "Wybierz plik z urządzenia"}</Button>
        {parsed && <p className="mt-2 text-xs text-muted-foreground">Plik: {parsed.file} · rekordów: {parsed.rows.length}</p>}
        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
      {parsed && (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Baza docelowa</h3>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger aria-label="Baza docelowa"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_TARGET}>Utwórz nową bazę</SelectItem>
                {bases.map((b) => <SelectItem key={b.id} value={b.id}>{b.name} · #{shortId(b.id)} ({b.vehicles.length})</SelectItem>)}
              </SelectContent>
            </Select>
            {target === NEW_TARGET ? <MetaFields meta={meta} onChange={setMeta} /> : (
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(modeLabels) as ImportMode[]).map((m) => (
                  <Button key={m} variant={mode === m ? "default" : "outline"} size="sm" aria-pressed={mode === m} onClick={() => setMode(m)}>{modeLabels[m]}</Button>
                ))}
              </div>
            )}
          </section>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Mapowanie kolumn</h3>
            {!mappedId && <p role="alert" className="text-sm text-destructive">Nie rozpoznano kolumny z identyfikatorem pojazdu. Przypisz ręcznie kolumnę z numerem taborowym.</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {parsed.headers.map((h) => (
                <div key={h} className="flex items-center gap-2">
                  <span className="w-1/2 truncate text-sm" title={h}>{h}</span>
                  <Select value={mapping[h] || "__skip"} onValueChange={(v) => setMapping({ ...mapping, [h]: v === "__skip" ? "" : (v as VehicleField) })}>
                    <SelectTrigger className="h-9 w-1/2" aria-label={`Pole dla kolumny ${h}`}><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="__skip">Pomiń kolumnę</SelectItem>{VEHICLE_FIELDS.map((f) => <SelectItem key={f} value={f}>{FIELD_LABELS[f]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Podgląd (pierwsze 10 rekordów)</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted"><tr>{["vehicle_number", "operator", "brand", "model", "vehicle_type", "production_year"].map((f) => <th key={f} className="whitespace-nowrap p-2 text-left font-medium">{FIELD_LABELS[f as VehicleField]}</th>)}</tr></thead>
                <tbody>{records.slice(0, 10).map((r, i) => (
                  <tr key={i} className={`border-t border-border ${report.invalid.some((x) => x.index === i) ? "text-destructive" : ""}`}>
                    {(["vehicle_number", "operator", "brand", "model", "vehicle_type", "production_year"] as VehicleField[]).map((f) => <td key={f} className="whitespace-nowrap p-2">{r[f] ?? ""}</td>)}
                  </tr>))}</tbody>
              </table>
            </div>
          </section>
          <section className="space-y-2 rounded-lg border border-border p-4 text-sm" aria-label="Raport walidacji">
            <h3 className="font-semibold">Raport walidacji</h3>
            <p>Rekordów w pliku: {report.total} · poprawnych: {report.valid}</p>
            {report.invalid.length > 0 && <p className="text-destructive">Błędne rekordy (nie zostaną zapisane): {report.invalid.length} — np. wiersz {report.invalid[0].index + 1}: {report.invalid[0].issues.join(", ") || "brak identyfikatora"}</p>}
            {report.duplicatesInFile.length > 0 && <p className="text-destructive">Duplikaty w pliku (zapisany zostanie tylko pierwszy): {report.duplicatesInFile.length}</p>}
            {targetBase && <p>Pasujące do istniejących rekordów: {report.existingMatches.length} — {mode === "add" ? "zostaną pominięte" : mode === "update" ? "zostaną zaktualizowane" : "cała baza zostanie zastąpiona"}</p>}
            {rawConflicts > 0 && (
              <div className="space-y-2 rounded-md bg-destructive/10 p-3">
                <p className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> {rawConflicts} rekordów ma innego przewoźnika niż baza ({baseOperator}).</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={choice === "record" ? "default" : "outline"} aria-pressed={choice === "record"} onClick={() => setChoice("record")}>Zachowaj przewoźnika z rekordu</Button>
                  <Button size="sm" variant={choice === "base" ? "default" : "outline"} aria-pressed={choice === "base"} onClick={() => setChoice("base")}>Użyj przewoźnika bazy</Button>
                </div>
              </div>
            )}
          </section>
          <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-border bg-background p-4">
            <Button variant="outline" onClick={onCancel}>Anuluj</Button>
            <Button onClick={start} disabled={busy || report.valid === 0 || (target === NEW_TARGET && !meta.name?.trim())}>{busy && <Loader2 className="animate-spin" />} Zatwierdź import</Button>
          </div>
        </>
      )}
    </div>
  );
}
