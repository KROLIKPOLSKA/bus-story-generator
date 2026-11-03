import { useState } from "react";
import { useTheme } from "next-themes";
import { Database, Menu, Moon, Settings, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VehicleBrowser from "@/components/VehicleBrowser";
import DatabaseManager from "@/components/DatabaseManager";
import { setBaseActive, useVehicleBases } from "@/lib/vehicleBaseStore";
import { AppLogo } from "@/components/AppLogo";

interface AppMenuProps {
  collapsible: boolean;
  onCollapsibleChange: (value: boolean) => void;
}

export default function AppMenu({ collapsible, onCollapsibleChange }: AppMenuProps) {
  const { theme, setTheme } = useTheme();
  const bases = useVehicleBases();
  const [managerOpen, setManagerOpen] = useState(false);

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
            <SheetTitle className="flex items-center gap-2"><AppLogo className="h-7" /> Generator opisów autobusowych</SheetTitle>
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
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase text-muted-foreground">Autouzupełnianie i bazy pojazdów</h2>
                <div className="space-y-2 border-b border-border py-4">
                  <p className="text-sm font-medium">Aktywne bazy lokalne</p>
                  <p className="text-xs text-muted-foreground">Możesz zaznaczyć kilka baz — autouzupełnianie przeszuka je wszystkie. Bazy wbudowane działają zawsze.</p>
                  {bases.bases.length === 0 && <p className="text-xs text-muted-foreground">Brak własnych baz — używane są tylko bazy wbudowane.</p>}
                  <ul className="space-y-1">
                    {bases.bases.map((b) => (
                      <li key={b.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-accent">
                          <Checkbox checked={bases.activeIds.includes(b.id)} onCheckedChange={(c) => setBaseActive(b.id, c === true)} />
                          <span className="min-w-0 flex-1 truncate">{b.name} <span className="text-xs text-muted-foreground">· #{b.id.slice(0, 8)} ({b.vehicles.length})</span></span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full" onClick={() => setManagerOpen(true)}><Database /> Zarządzaj bazami</Button>
                </div>
              </section>
            </TabsContent>
            <TabsContent value="vehicles" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
              <VehicleBrowser bases={bases.bases} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
      <DatabaseManager open={managerOpen} onOpenChange={setManagerOpen} />
      <AppLogo className="h-8" />
      <span className="text-sm font-medium text-muted-foreground">Generator opisów autobusowych</span>
    </header>
  );
}