import { useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Database, Menu, Moon, Search, Settings, Sun, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchVehicles } from "@/data/vehicleDatabase";
import { AppLogo } from "@/components/AppLogo";

interface AppMenuProps {
  collapsible: boolean;
  onCollapsibleChange: (value: boolean) => void;
}

export default function AppMenu({ collapsible, onCollapsibleChange }: AppMenuProps) {
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const groups = useMemo(() => searchVehicles(query), [query]);
  const resultCount = groups.reduce((total, group) => total + group.vehicles.length, 0);

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Otwórz menu aplikacji" title="Menu aplikacji">
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex w-[calc(100%-1rem)] flex-col gap-6 p-5 sm:w-full sm:max-w-md" aria-describedby={undefined}>
          <SheetHeader className="pr-8 text-left">
            <SheetTitle className="flex items-center gap-2"><AppLogo className="h-7" /> Generator opisów</SheetTitle>
          </SheetHeader>
          <Tabs defaultValue="settings" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mb-5 grid w-full shrink-0 grid-cols-2">
              <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Ustawienia</TabsTrigger>
              <TabsTrigger value="vehicles" className="gap-2"><Database className="h-4 w-4" /> Baza Pojazdów</TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="mt-0 space-y-6 overflow-y-auto">
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground">Wygląd</h2>
                <div className="flex items-center justify-between gap-4 border-b border-border py-4">
                  <Label htmlFor="light-mode" className="flex cursor-pointer items-center gap-3 text-sm"><Sun className="h-5 w-5 text-primary" /> Jasny motyw</Label>
                  <Switch id="light-mode" checked={theme === "light"} onCheckedChange={(light) => setTheme(light ? "light" : "dark")} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">{theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />} {theme === "light" ? "Motyw jasny" : "Motyw ciemny"}</div>
              </section>
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground">Formularz</h2>
                <div className="flex items-center justify-between gap-4 border-b border-border py-4">
                  <Label htmlFor="collapsible-switch" className="cursor-pointer text-sm">Sekcje zwijane</Label>
                  <Switch id="collapsible-switch" checked={collapsible} onCheckedChange={onCollapsibleChange} />
                </div>
              </section>
            </TabsContent>
            <TabsContent value="vehicles" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
              <div className="relative shrink-0">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input aria-label="Szukaj pojazdu" placeholder="Numer, marka, model lub przewoźnik" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9 pr-10" />
                {query && <Button variant="ghost" size="icon" className="absolute right-0 top-0" aria-label="Wyczyść wyszukiwanie" onClick={() => setQuery("")}><X /></Button>}
              </div>
              <p role="status" className="my-3 shrink-0 text-xs text-muted-foreground">Pojazdy: {resultCount}</p>
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
                {groups.filter((group) => group.vehicles.length > 0).map((group) => (
                  <section key={group.carrier} aria-label={group.carrier}>
                    <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background py-3">
                      <h2 className="text-sm font-semibold">{group.carrier}</h2>
                      <span className="text-xs text-muted-foreground">{group.vehicles.length} / {group.total}</span>
                    </div>
                    <ul className="divide-y divide-border">
                      {group.vehicles.map((vehicle) => (
                        <li key={vehicle.number} className="flex items-start gap-3 py-3">
                          <span className="w-12 shrink-0 rounded-md bg-primary/10 py-1 text-center font-mono text-sm font-medium text-primary">{vehicle.number}</span>
                          <div className="min-w-0"><p className="text-sm font-medium">{vehicle.brand}</p><p className="break-words text-xs leading-relaxed text-muted-foreground">{vehicle.model}</p></div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                {resultCount === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Nie znaleziono pojazdów.</p>}
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
      <AppLogo className="h-8" />
      <span className="text-sm font-medium text-muted-foreground">Generator opisów</span>
    </header>
  );
}