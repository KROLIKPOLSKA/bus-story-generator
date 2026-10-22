import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createCourseLookup, unavailableCourseProvider, type CourseQuery, type VehicleCourse } from "@/lib/courseLookup";

const lookup = createCourseLookup(unavailableCourseProvider);
type LookupState =
  | { status: "idle" | "loading" | "invalid-time" }
  | { status: "unavailable"; reason: string }
  | { status: "available"; courses: VehicleCourse[] };

interface Props {
  query: CourseQuery;
  onApply: (course: VehicleCourse, replace: boolean) => void;
  onClear: () => void;
}

export default function CourseLookup({ query, onApply, onClear }: Props) {
  const { carrier, vehicle, date, time } = query;
  const [state, setState] = useState<LookupState>({ status: "idle" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    onClear();
    if (!vehicle.trim() || !date || !time || carrier !== "MPK Rzeszów") {
      setState({ status: "idle" });
      return () => controller.abort();
    }
    setState({ status: "loading" });
    const timer = setTimeout(async () => {
      try {
        const result = await lookup({ carrier, vehicle, date, time }, controller.signal);
        if (controller.signal.aborted) return;
        setState(result);
        if (result.status === "available" && result.courses.length === 1 && result.courses[0].evidence === "confirmed") {
          onApply(result.courses[0], false);
        }
      } catch {
        if (!controller.signal.aborted) setState({ status: "unavailable", reason: "Źródło danych jest chwilowo niedostępne" });
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [carrier, vehicle, date, time, retry, onApply, onClear]);

  if (state.status === "idle") return null;
  return (
    <div className="space-y-3 border-y border-border py-3 text-sm">
      <div className="flex items-center justify-between gap-3">
        <p role="status" className="flex min-w-0 items-center gap-2 text-muted-foreground">
          {state.status === "loading" && <Loader2 className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />}
          {state.status === "loading" ? "Wyszukiwanie danych…"
            : state.status === "unavailable" ? "Wyszukiwanie kursu niedostępne"
            : state.status === "invalid-time" ? "Nie można jednoznacznie ustalić godziny w strefie Warszawy"
            : state.status === "available" && state.courses.length ? "Znaleziono dane"
            : "Nie znaleziono kursu dla podanej daty i godziny"}
        </p>
        <Button size="icon" variant="ghost" aria-label="Wyszukaj kurs ponownie" title="Wyszukaj kurs ponownie" disabled={state.status === "loading"} onClick={() => setRetry((value) => value + 1)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {state.status === "unavailable" && <p className="text-xs text-muted-foreground">{state.reason}</p>}
      {state.status === "available" && state.courses.map((course) => (
        <div key={course.id} className="space-y-2 border-l-2 border-primary pl-3">
          <p className="font-medium text-foreground">Linia: {course.line} · Kierunek: {course.direction}</p>
          <p className="text-xs text-muted-foreground">Pojazd: {course.vehicle}{course.brigade ? ` · Brygada: ${course.brigade}` : ""} · {date} {time} (Warszawa)</p>
          <p className="text-xs text-muted-foreground">{course.evidence === "confirmed" ? "Potwierdzone w źródle" : "Według rozkładu — wykonanie kursu niepotwierdzone"}</p>
          <p className="break-words text-xs text-muted-foreground">Obowiązuje: {course.startsAt} – {course.endsAt}</p>
          <p className="break-words text-xs text-muted-foreground"><a href={course.sourceUrl} target="_blank" rel="noreferrer" className="underline">Źródło danych</a> · Pobrano: {course.fetchedAt}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onApply(course, false)}>Uzupełnij puste pola</Button>
            <Button size="sm" variant="outline" onClick={() => onApply(course, true)}>Zastąp linię i kierunek</Button>
          </div>
        </div>
      ))}
    </div>
  );
}