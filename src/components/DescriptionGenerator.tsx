import { useState } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon, Copy, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

const vehicleConfig: Record<VehicleType, { label: string; emoji: string; brandPlaceholder: string; modelPlaceholder: string }> = {
  autobus: { label: "Autobus", emoji: "🚌", brandPlaceholder: "np. Solaris", modelPlaceholder: "np. Urbino 12" },
  tramwaj: { label: "Tramwaj", emoji: "🚃", brandPlaceholder: "np. PESA", modelPlaceholder: "np. Twist" },
  pociag: { label: "Pociąg", emoji: "🚂", brandPlaceholder: "np. PESA", modelPlaceholder: "np. Seria/Typ lokomotywy" },
  inny: { label: "Inny", emoji: "🚐", brandPlaceholder: "np. Producent", modelPlaceholder: "np. Model pojazdu" },
};

const DescriptionGenerator = () => {
  const [date, setDate] = useState<Date>();
  const [city, setCity] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("autobus");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [withEmoji, setWithEmoji] = useState(false);
  const [generatedText, setGeneratedText] = useState("");

  const config = vehicleConfig[vehicleType];

  const handleGenerate = () => {
    if (!date || !city.trim()) return;

    const e = withEmoji;
    const lines: string[] = [];
    lines.push(`${e ? "📅 " : ""}Data nagrania: ${format(date, "dd.MM.yyyy", { locale: pl })}`);
    lines.push(`${e ? "📍 " : ""}Miejsce: ${city.trim()}`);

    if (brand.trim() || model.trim()) {
      const vehicle = [brand.trim(), model.trim()].filter(Boolean).join(" ");
      lines.push(`${e ? config.emoji + " " : ""}Pojazd: ${vehicle}`);
    }

    if (customDesc.trim()) {
      lines.push(`${e ? "📝 " : ""}Opis: ${customDesc.trim()}`);
    }

    setGeneratedText(lines.join("\n"));
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedText);
    toast.success("Skopiowano do schowka!", { duration: 2000 });
  };

  const isValid = !!date && city.trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[600px]"
      >
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Generator opisów filmowych
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Stwórz opis do filmów z komunikacji miejskiej
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          {/* Row 1: Date + City — two columns on desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Data nagrania</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-background border-border hover:border-primary/50 transition-colors",
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
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Miasto nagrania</Label>
              <Input
                placeholder="np. Warszawa"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="bg-background border-border focus-visible:border-primary/50"
              />
            </div>
          </div>

          {/* Row 2: Vehicle type + Brand — two columns on desktop */}
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
          </div>

          {/* Model */}
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

          {/* Opis własny */}
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

          {/* Emoji switch */}
          <div className="flex items-center justify-between rounded-lg bg-background border border-border px-4 py-3">
            <Label htmlFor="emoji-switch" className="text-sm font-medium text-muted-foreground cursor-pointer">
              Dodaj emotki do opisu
            </Label>
            <Switch id="emoji-switch" checked={withEmoji} onCheckedChange={setWithEmoji} />
          </div>

          {/* Generate button */}
          <Button onClick={handleGenerate} disabled={!isValid} className="w-full font-semibold" size="lg">
            <Sparkles className="mr-2 h-4 w-4" />
            Generuj opis
          </Button>

          {/* Output */}
          <AnimatePresence>
            {generatedText && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="mt-1 rounded-lg bg-background border border-border p-4">
                  <pre className="font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {generatedText}
                  </pre>
                </div>
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className="w-full mt-3 border-border hover:border-primary/50 transition-colors"
                  size="lg"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Kopiuj do schowka
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default DescriptionGenerator;
