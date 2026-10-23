import { supabase } from '@/integrations/supabase/client';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { warsawInstant, matchingCourses, type CourseQuery, type CourseDayResponse } from './courseLookup';

export async function serverCourseLookup(query: CourseQuery, signal: AbortSignal) {
  const instant = warsawInstant(query.date, query.time);
  if (!instant) return { status: 'invalid-time' as const };
  const { data, error } = await supabase.functions.invoke('transport-lookup', { body: { ...query, vehicle: query.vehicle.trim() }, signal });
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  if (error) {
    const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
    console.error('transport-lookup:', details);
    return { status: 'unavailable' as const, reason: 'Wyszukiwanie jest chwilowo niedostępne. Możesz uzupełnić pola ręcznie.' };
  }
  const response = data as CourseDayResponse | { status: 'invalid-time' };
  if (response.status === 'available') return { status: 'available' as const, courses: matchingCourses(response.courses, query.vehicle, instant) };
  if (response.status === 'unavailable' || response.status === 'invalid-time') return response;
  return { status: 'unavailable' as const, reason: 'Nieprawidłowa odpowiedź źródła. Uzupełnij pola ręcznie.' };
}