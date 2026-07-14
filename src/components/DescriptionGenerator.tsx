import { useState, useEffect, useMemo, KeyboardEvent } from "react";
import { format } from "date-fns";
import { mpkRzeszowFleet } from "@/data/mpkRzeszowFleet";
import { pl } from "date-fns/locale";
import {
  CalendarIcon,
  Copy,
  Sparkles,
  CalendarCheck,
  Video,
  Camera,
  Loader2,
  RefreshCw,
  Pencil,
  Plus,
  History,
  X,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

type VehicleType = "autobus" | "tramwaj" | "pociag" | "inny";
type ContentMode = "film" | "zdjecie";


interface HistoryEntry {
  id: string;
  text: string;
  title: string;
  createdAt: number;
}

const vehicleConfig: Record<VehicleType, { label: string; emoji: string; brandPlaceholder: string; modelPlaceholder: string }> = {
  autobus: { label: "Autobus", emoji: "🚌", brandPlaceholder: "np. Solaris", modelPlaceholder: "np. Urbino 12" },
  tramwaj: { label: "Tramwaj", emoji: "🚃", brandPlaceholder: "np. PESA", modelPlaceholder: "np. Twist" },
  pociag: { label: "Pociąg", emoji: "🚂", brandPlaceholder: "np. PESA", modelPlaceholder: "np. Seria/Typ lokomotywy" },
  inny: { label: "Inny", emoji: "🚐", brandPlaceholder: "np. Producent", modelPlaceholder: "np. Model pojazdu" },
};

const carrierOptions = ["MPK Rzeszów", "PKS Rzeszów"];
const CUSTOM_CARRIER = "__custom__";

const defaultHashtags = [
  "#komunikacjamiejska",
  "#autobusy",
  "#tramwaje",
  "#pociągi",
  "#transport",
];

const LS_KEYS = {
  recentCarriers: "gen_recent_carriers",
  recentCities: "gen_recent_cities",
  history: "gen_history",
};

const loadLS = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const saveLS = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

const pushRecent = (list: string[], value: string, max = 5): string[] => {
  const v = value.trim();
  if (!v) return list;
  const filtered = list.filter((x) => x.toLowerCase() !== v.toLowerCase());
  return [v, ...filtered].slice(0, max);
};

const DescriptionGenerator = () => {
  const [mode, setMode] = useState<ContentMode>("film");
  const [collapsible, setCollapsible] = useState<boolean>(false);
  const [date, setDate] = useState<Date>();
  const [city, setCity] = useState("");
  const [cityError, setCityError] = useState(false);
  const [carrierChoice, setCarrierChoice] = useState<string>("MPK Rzeszów");
  const [customCarrier, setCustomCarrier] = useState("");
  const carrier = carrierChoice === CUSTOM_CARRIER ? customCarrier : carrierChoice;
  const [vehicleType, setVehicleType] = useState<VehicleType>("autobus");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [sideNumber, setSideNumber] = useState("");
  const [lineNumber, setLineNumber] = useState("");
  const [direction, setDirection] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [coAuthor, setCoAuthor] = useState("");
  const [withEmoji, setWithEmoji] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customHashtags, setCustomHashtags] = useState<string[]>([]);
  const [newHashtag, setNewHashtag] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(["basic"]);

  const [recentCarriers, setRecentCarriers] = useState<string[]>(() =>
    loadLS<string[]>(LS_KEYS.recentCarriers, [])
  );
  const [recentCities, setRecentCities] = useState<string[]>(() =>
    loadLS<string[]>(LS_KEYS.recentCities, [])
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    loadLS<HistoryEntry[]>(LS_KEYS.history, [])
  );

  const config = vehicleConfig[vehicleType];
  const allHashtags = useMemo(
    () => [...defaultHashtags, ...customHashtags],
    [customHashtags]
  );

  // Auto-fill brand/model from MPK Rzeszów fleet by side number
  useEffect(() => {
    const key = sideNumber.trim();
    if (!key) return;
    const c = carrier.trim();
    if (c && c !== "MPK Rzeszów") return;
    const match = mpkRzeszowFleet[key];
    if (match) {
      setBrand(match.brand);
      setModel(match.model);
    }
  }, [carrier, sideNumber]);

  useEffect(() => {
    if (cityError && city.trim()) setCityError(false);
  }, [city, cityError]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addCustomHashtag = () => {
    let v = newHashtag.trim();
    if (!v) return;
    if (!v.startsWith("#")) v = "#" + v;
    v = v.replace(/\s+/g, "");
    if (v.length < 2) return;
    if (allHashtags.includes(v)) {
      setSelectedTags((prev) => (prev.includes(v) ? prev : [...prev, v]));
      setNewHashtag("");
      return;
    }
    setCustomHashtags((prev) => [...prev, v]);
    setSelectedTags((prev) => [...prev, v]);
    setNewHashtag("");
  };

  const handleHashtagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomHashtag();
    }
  };

  // Section field counters
  const basicFilled = [date, city.trim()].filter(Boolean).length;
  const basicTotal = 2;
  const vehicleFields = [
    carrier.trim(),
    lineNumber.trim(),
    sideNumber.trim(),
    direction.trim(),
    brand.trim(),
    model.trim(),
  ];
  const vehicleFilled = vehicleFields.filter(Boolean).length + 1; // +1 for vehicleType always selected
  const vehicleTotal = 7;
  const descFields = [customDesc.trim(), coAuthor.trim()];
  const descFilledBase = descFields.filter(Boolean).length;
  const descFilled = descFilledBase + (selectedTags.length > 0 ? 1 : 0);
  const descTotal = 3;

  const totalFilled = basicFilled + vehicleFilled + descFilled;
  const totalFields = basicTotal + vehicleTotal + descTotal;
  const progress = Math.round((totalFilled / totalFields) * 100);

  const buildOutput = () => {
    const e = withEmoji;
    const lines: string[] = [];
    const dateLabel = mode === "film" ? "Data nagrania" : "Data wykonania zdjęcia";
    if (date) lines.push(`${e ? "📅 " : ""}${dateLabel}: ${format(date, "dd.MM.yyyy", { locale: pl })}`);
    lines.push(`${e ? "📍 " : ""}Miejsce: ${city.trim()}`);

    if (carrier.trim()) lines.push(`${e ? "🏢 " : ""}Przewoźnik: ${carrier.trim()}`);
    if (lineNumber.trim()) lines.push(`${e ? "🔢 " : ""}Linia: ${lineNumber.trim()}`);
    if (direction.trim()) lines.push(`${e ? "➡️ " : ""}Kierunek: ${direction.trim()}`);
    if (brand.trim() || model.trim()) {
      const vehicle = [brand.trim(), model.trim()].filter(Boolean).join(" ");
      lines.push(`${e ? config.emoji + " " : ""}Pojazd: ${vehicle}`);
    }
    if (sideNumber.trim()) lines.push(`${e ? "🔖 " : ""}Nr boczny: ${sideNumber.trim()}`);
    if (customDesc.trim()) lines.push(`${e ? "📝 " : ""}Opis: ${customDesc.trim()}`);
    if (coAuthor.trim()) lines.push(`${e ? "👤 " : ""}Współautor: ${coAuthor.trim()}`);
    if (selectedTags.length > 0) {
      lines.push("");
      lines.push(selectedTags.join(" "));
    }

    const text = lines.join("\n");

    const vehicleParts = [brand.trim(), model.trim()].filter(Boolean).join(" ");
    const titleParts: string[] = [];
    const head = [vehicleParts, sideNumber.trim()].filter(Boolean).join(" ");
    if (head) titleParts.push(head);
    if (lineNumber.trim()) titleParts.push(`jako linia ${lineNumber.trim()}`);
    if (direction.trim()) titleParts.push(`w Kierunku ${direction.trim()}`);
    return { text, title: titleParts.join(" ") };
  };

  const runGenerate = () => {
    if (!city.trim()) {
      setCityError(true);
      toast.error("Miasto jest wymagane");
      // Ensure basic section is open
      if (!openSections.includes("basic")) setOpenSections((s) => [...s, "basic"]);
      return;
    }

    setIsGenerating(true);
    setIsEditing(false);
    setTimeout(() => {
      const { text, title } = buildOutput();
      setGeneratedText(text);
      setGeneratedTitle(title);

      // Update recents
      const newCarriers = pushRecent(recentCarriers, carrier);
      const newCities = pushRecent(recentCities, city);
      setRecentCarriers(newCarriers);
      setRecentCities(newCities);
      saveLS(LS_KEYS.recentCarriers, newCarriers);
      saveLS(LS_KEYS.recentCities, newCities);

      // Update history
      const entry: HistoryEntry = {
        id: Date.now().toString(),
        text,
        title,
        createdAt: Date.now(),
      };
      const newHistory = [entry, ...history].slice(0, 3);
      setHistory(newHistory);
      saveLS(LS_KEYS.history, newHistory);

      setIsGenerating(false);
    }, 400);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedText);
    toast.success("Skopiowano do schowka!", { duration: 2000 });
  };

  const handleCopyTitle = async () => {
    await navigator.clipboard.writeText(generatedTitle);
    toast.success("Skopiowano tytuł!", { duration: 2000 });
  };

  const reuseHistory = (entry: HistoryEntry) => {
    setGeneratedText(entry.text);
    setGeneratedTitle(entry.title);
    setIsEditing(false);
    toast.success("Wczytano poprzedni opis");
  };

  const clearHistory = () => {
    setHistory([]);
    saveLS(LS_KEYS.history, []);
  };



  const RecentChips = ({
    items,
    onPick,
  }: {
    items: string[];
    onPick: (v: string) => void;
  }) => {
    if (items.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <History className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground/70">Ostatnio:</span>
        {items.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onPick(v)}
            className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            {v}
          </button>
        ))}
      </div>
    );
  };

  // ---- Field renderers (reused between quick & advanced) ----
  const CityField = (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">
        {mode === "film" ? "Miasto nagrania" : "Miasto"}{" "}
        <span className="text-xs text-destructive">*</span>
      </Label>
      <Input
        placeholder="np. Warszawa"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className={cn(
          "bg-background border-border focus-visible:border-primary/50",
          cityError && "border-destructive focus-visible:border-destructive"
        )}
      />
      {cityError && (
        <p className="text-xs text-destructive">To pole jest wymagane</p>
      )}
      <RecentChips items={recentCities} onPick={setCity} />
    </div>
  );

  const DateField = (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">
        {mode === "film" ? "Data nagrania" : "Data wykonania zdjęcia"}
      </Label>
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal bg-background border-border hover:border-primary/50 transition-colors",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "d MMMM yyyy", { locale: pl }) : "Wybierz datę"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDate(new Date())}
          className="shrink-0 bg-background border-border hover:border-primary/50 transition-colors"
          title="Ustaw dzisiejszą datę"
        >
          <CalendarCheck className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const CarrierField = (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">
        Przewoźnik <span className="text-xs text-muted-foreground/60">— Opcjonalne</span>
      </Label>
      <Select value={carrierChoice} onValueChange={setCarrierChoice}>
        <SelectTrigger className="bg-background border-border focus:border-primary/50">
          <SelectValue placeholder="Wybierz przewoźnika" />
        </SelectTrigger>
        <SelectContent>
          {carrierOptions.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_CARRIER}>Wpisz własnego przewoźnika…</SelectItem>
        </SelectContent>
      </Select>
      {carrierChoice === CUSTOM_CARRIER && (
        <Input
          placeholder="np. MKS Dębica"
          value={customCarrier}
          onChange={(e) => setCustomCarrier(e.target.value)}
          className="bg-background border-border focus-visible:border-primary/50"
        />
      )}
      <RecentChips
        items={recentCarriers}
        onPick={(v) => {
          if (carrierOptions.includes(v)) {
            setCarrierChoice(v);
          } else {
            setCarrierChoice(CUSTOM_CARRIER);
            setCustomCarrier(v);
          }
        }}
      />
    </div>
  );

  const LineField = (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">
        Numer linii <span className="text-xs text-muted-foreground/60">— Opcjonalne</span>
      </Label>
      <Input
        placeholder="np. 180"
        value={lineNumber}
        onChange={(e) => setLineNumber(e.target.value)}
        className="bg-background border-border focus-visible:border-primary/50"
      />
    </div>
  );

  const HashtagsField = (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-muted-foreground">Hashtagi</Label>
      <div className="flex flex-wrap gap-2">
        {allHashtags.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30 ring-1 ring-primary/40"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 pt-1">
        <Input
          placeholder="Dodaj własny hashtag i naciśnij Enter"
          value={newHashtag}
          onChange={(e) => setNewHashtag(e.target.value)}
          onKeyDown={handleHashtagKey}
          className="bg-background border-border focus-visible:border-primary/50"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={addCustomHashtag}
          className="shrink-0 border-border hover:border-primary/50"
          title="Dodaj hashtag"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[600px]"
      >
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Generator opisów {mode === "film" ? "filmowych" : "do zdjęć"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stwórz opis do {mode === "film" ? "filmów" : "zdjęć"} z komunikacji miejskiej
          </p>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as ContentMode)} className="mb-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="film" className="gap-2">
              <Video className="h-4 w-4" />
              Film
            </TabsTrigger>
            <TabsTrigger value="zdjecie" className="gap-2">
              <Camera className="h-4 w-4" />
              Zdjęcie
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mb-4 flex items-center justify-end gap-2">
          <Label htmlFor="collapsible-switch" className="text-xs text-muted-foreground cursor-pointer">
            Sekcje zwijane
          </Label>
          <Switch
            id="collapsible-switch"
            checked={collapsible}
            onCheckedChange={setCollapsible}
          />
        </div>

        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-5">
          {(() => {
            const BasicFields = (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {DateField}
                {CityField}
              </div>
            );
            const VehicleFields = (
              <div className="space-y-5">
                {CarrierField}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">Rodzaj pojazdu</Label>
                    <Select value={vehicleType} onValueChange={(v) => setVehicleType(v as VehicleType)}>
                      <SelectTrigger className="bg-background border-border focus:border-primary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(vehicleConfig).map(([key, { label, emoji }]) => (
                          <SelectItem key={key} value={key}>
                            {emoji} {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {LineField}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Nr boczny <span className="text-xs text-muted-foreground/60">— Opcjonalne</span>
                    </Label>
                    <Input
                      placeholder="np. 1234"
                      value={sideNumber}
                      onChange={(e) => setSideNumber(e.target.value)}
                      className="bg-background border-border focus-visible:border-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Kierunek / Przystanek <span className="text-xs text-muted-foreground/60">— Opcjonalne</span>
                    </Label>
                    <Input
                      placeholder="np. Wilanów"
                      value={direction}
                      onChange={(e) => setDirection(e.target.value)}
                      className="bg-background border-border focus-visible:border-primary/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Marka <span className="text-xs text-muted-foreground/60">— Opcjonalne</span>
                    </Label>
                    <Input
                      placeholder={config.brandPlaceholder}
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="bg-background border-border focus-visible:border-primary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Model <span className="text-xs text-muted-foreground/60">— Opcjonalne</span>
                    </Label>
                    <Input
                      placeholder={config.modelPlaceholder}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="bg-background border-border focus-visible:border-primary/50"
                    />
                  </div>
                </div>
              </div>
            );
            const DescFields = (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Opis własny <span className="text-xs text-muted-foreground/60">— Opcjonalne</span>
                  </Label>
                  <Textarea
                    placeholder="Dodatkowe informacje o nagraniu..."
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    rows={3}
                    className="bg-background border-border focus-visible:border-primary/50 resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Współautor <span className="text-xs text-muted-foreground/60">— Opcjonalne</span>
                  </Label>
                  <Input
                    placeholder="np. Jan Kowalski"
                    value={coAuthor}
                    onChange={(e) => setCoAuthor(e.target.value)}
                    className="bg-background border-border focus-visible:border-primary/50"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg bg-background border border-border px-4 py-3">
                  <Label htmlFor="emoji-switch" className="text-sm font-medium text-muted-foreground cursor-pointer">
                    Włącz emotki
                  </Label>
                  <Switch id="emoji-switch" checked={withEmoji} onCheckedChange={setWithEmoji} />
                </div>
                {HashtagsField}
              </div>
            );

            if (!collapsible) {
              return (
                <div className="space-y-6">
                  {BasicFields}
                  {VehicleFields}
                  {DescFields}
                </div>
              );
            }
            return (
              <Accordion
                type="multiple"
                value={openSections}
                onValueChange={setOpenSections}
                className="space-y-2"
              >
                <AccordionItem value="basic" className="border border-border rounded-lg px-3 bg-background/40">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <span className="flex items-center gap-2 text-sm font-medium">Podstawowe informacje</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pb-2 pt-1">{BasicFields}</div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="vehicle" className="border border-border rounded-lg px-3 bg-background/40">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <span className="flex items-center gap-2 text-sm font-medium">Przewoźnik i pojazd</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pb-2 pt-1">{VehicleFields}</div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="desc" className="border border-border rounded-lg px-3 bg-background/40">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <span className="flex items-center gap-2 text-sm font-medium">Opis i personalizacja</span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pb-2 pt-1">{DescFields}</div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            );
          })()}


          {/* Generate button */}
          <Button
            onClick={runGenerate}
            disabled={isGenerating}
            className="w-full font-semibold"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generowanie...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generuj opis
              </>
            )}
          </Button>

          {/* Preview below button */}
          <AnimatePresence>
            {generatedText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="rounded-lg bg-background border border-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-sm font-medium text-muted-foreground">Opis</Label>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={generatedText}
                      onChange={(e) => setGeneratedText(e.target.value)}
                      rows={10}
                      className="bg-background border-border focus-visible:border-primary/50 font-mono text-sm"
                    />
                  ) : (
                    <pre className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {generatedText}
                    </pre>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button onClick={handleCopy} variant="outline" className="border-border hover:border-primary/50">
                    <Copy className="mr-2 h-4 w-4" />
                    Kopiuj
                  </Button>
                  <Button
                    onClick={runGenerate}
                    variant="outline"
                    className="border-border hover:border-primary/50"
                    disabled={isGenerating}
                  >
                    <RefreshCw className={cn("mr-2 h-4 w-4", isGenerating && "animate-spin")} />
                    Regeneruj
                  </Button>
                  <Button
                    onClick={() => setIsEditing((v) => !v)}
                    variant="outline"
                    className="border-border hover:border-primary/50"
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    {isEditing ? "Gotowe" : "Edytuj"}
                  </Button>
                </div>

                {generatedTitle && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium text-muted-foreground">Tytuł</Label>
                    <div className="mt-2 rounded-lg bg-background border border-border p-4">
                      <pre className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {generatedTitle}
                      </pre>
                    </div>
                    <Button
                      onClick={handleCopyTitle}
                      variant="outline"
                      className="w-full mt-3 border-border hover:border-primary/50"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Kopiuj tytuł
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>


          {/* Recent descriptions */}
          {history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Ostatnie opisy
                </Label>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-xs text-muted-foreground/70 hover:text-foreground flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Wyczyść
                </button>
              </div>
              <div className="space-y-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-lg border border-border bg-background p-3 flex items-start gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">
                        {h.title || h.text.split("\n")[0]}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 truncate">
                        {h.text.split("\n").slice(0, 2).join(" · ")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reuseHistory(h)}
                      className="shrink-0 h-8 text-xs border-border hover:border-primary/50"
                    >
                      Użyj ponownie
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DescriptionGenerator;
