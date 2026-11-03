import { toast } from "sonner";
import { CheckCircle2, Copy, FileJson, Settings, Sparkles, Star, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_LABELS, VEHICLE_FIELDS, VEHICLE_TYPE_OPTIONS } from "@/lib/vehicleBases";

export const AI_PROMPT = `Przygotuj plik JSON z bazą pojazdów komunikacji do importu w aplikacji „Generator opisów autobusowych”.

Zwróć WYŁĄCZNIE poprawny JSON (bez komentarzy i tekstu przed ani po), w dokładnie takiej strukturze:

{
  "database": {
    "name": "nazwa bazy, np. MKS Dębica",
    "city": "miasto, np. Dębica",
    "operator": "przewoźnik, np. MKS Dębica",
    "category": "kategoria, np. autobusy",
    "description": "krótki opis bazy"
  },
  "vehicles": [
    {
${VEHICLE_FIELDS.map((f) => `      "${f}": "${FIELD_LABELS[f]}"`).join(",\n")}
    }
  ]
}

Zasady:
- Każdy pojazd to osobny obiekt w tablicy "vehicles". Wszystkie wartości zapisuj jako tekst (w cudzysłowie), także numery i lata.
- "vehicle_number" (numer taborowy) jest wymagany i musi być unikalny w obrębie przewoźnika. Zachowaj zera wiodące, np. "012".
- "vehicle_type" może mieć tylko jedną z wartości: ${VEHICLE_TYPE_OPTIONS.map((t) => `"${t}"`).join(", ")}.
- "brand" to sam producent (np. "Solaris", "Mercedes-Benz", "Autosan"), a "model" to sam model bez marki (np. "Urbino 12", "Citaro C2").
- "production_year" to czterocyfrowy rok, np. "2019".
- Nie dodawaj innych pól niż wymienione. Jeśli informacji nie znasz, pomiń pole albo zostaw pusty tekst "" — nie zgaduj i nie wymyślaj danych.
- Pisz poprawną polszczyzną, z polskimi znakami i wielkimi literami w nazwach własnych.

Dane źródłowe (lista pojazdów, tabela lub opis):
[WKLEJ TUTAJ SWOJE DANE]`;

export function AiPromptView() {
  const copy = async () => {
    try { await navigator.clipboard.writeText(AI_PROMPT); toast.success("Skopiowano prompt do schowka!"); }
    catch { toast.error("Nie udało się skopiować — zaznacz tekst i skopiuj ręcznie."); }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Skopiuj polecenie, wklej je do ChatGPT, Gemini lub innej SI i na końcu dopisz swoje dane (np. wklejoną tabelę pojazdów). Odpowiedź zapisz jako plik <span className="font-mono">.json</span> i zaimportuj go w aplikacji.</p>
      <Textarea readOnly value={AI_PROMPT} rows={16} aria-label="Treść promptu dla SI" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <Button onClick={copy} className="w-full sm:w-auto"><Copy /> Kopiuj prompt</Button>
    </div>
  );
}

const steps = [
  { icon: Sparkles, title: "Przygotuj dane", text: "Najprościej: skopiuj „Prompt dla SI”, wklej go do ChatGPT razem z listą pojazdów i zapisz odpowiedź jako plik .json. Możesz też pobrać szablon JSON lub Excel i uzupełnić go samodzielnie.",
    art: (
      <div className="space-y-1.5 rounded-md bg-muted p-3 font-mono text-[10px] leading-tight text-muted-foreground">
        <div>{"{"} <span className="text-primary">"vehicle_number"</span>: "714",</div>
        <div className="pl-3"><span className="text-primary">"vehicle_type"</span>: "Autobus",</div>
        <div className="pl-3"><span className="text-primary">"brand"</span>: "Solaris", <span className="text-primary">"model"</span>: "Urbino 12" {"}"}</div>
      </div>
    ) },
  { icon: Upload, title: "Zaimportuj plik", text: "Kliknij „Importuj zewnętrzną bazę”, wybierz plik i sprawdź podgląd. Aplikacja sama dopasuje kolumny i pokaże raport błędów i duplikatów, zanim cokolwiek zapisze.",
    art: (
      <div className="flex flex-col items-center gap-1 rounded-md border-2 border-dashed border-primary/40 p-3 text-xs text-muted-foreground">
        <FileJson className="h-6 w-6 text-primary" /> moja_baza.json · 42 rekordy
      </div>
    ) },
  { icon: Star, title: "Włącz bazę", text: "Przy bazie na liście „Twoje bazy” kliknij „Włącz”. Aktywnych może być kilka naraz — autouzupełnianie przeszuka wszystkie. To samo zrobisz w menu → Ustawienia.",
    art: (
      <div className="space-y-1.5">
        {["MKS Dębica", "PKS Mielec"].map((n, i) => (
          <div key={n} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-xs">
            {n}<span className={`rounded px-2 py-0.5 ${i === 0 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{i === 0 ? "Aktywna" : "Włącz"}</span>
          </div>
        ))}
      </div>
    ) },
  { icon: CheckCircle2, title: "Generuj opisy", text: "W formularzu wybierz przewoźnika i wpisz numer taborowy — marka, model i rodzaj pojazdu uzupełnią się same. Edytować bazę możesz w każdej chwili ikoną ołówka.",
    art: (
      <div className="space-y-1.5 rounded-md border border-border p-3 text-xs">
        <div className="rounded border border-border bg-background px-2 py-1">714</div>
        <div className="flex gap-1.5"><div className="flex-1 rounded border border-primary/50 bg-primary/10 px-2 py-1">Solaris</div><div className="flex-1 rounded border border-primary/50 bg-primary/10 px-2 py-1">Urbino 12</div></div>
      </div>
    ) },
];

export function BaseTutorial({ onPrompt, onImport }: { onPrompt: () => void; onImport: () => void }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">Własne bazy pozwalają autouzupełniać pojazdy dowolnych przewoźników. Zapisują się tylko na tym urządzeniu.</p>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={s.title} className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_14rem]">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{i + 1}</span><s.icon className="h-4 w-4 text-primary" /> {s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
            <div aria-hidden="true" className="self-center">{s.art}</div>
          </li>
        ))}
      </ol>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Settings className="h-4 w-4" /> Najedź kursorem na ikonę przy bazie, aby zobaczyć, do czego służy.</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onPrompt}><Sparkles /> Prompt dla SI</Button>
        <Button variant="outline" onClick={onImport}><Upload /> Importuj bazę</Button>
      </div>
    </div>
  );
}
