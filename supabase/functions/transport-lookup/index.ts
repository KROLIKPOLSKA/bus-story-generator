import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { lookupTransport, type Course, type Store } from '../_shared/transport.ts';

const schema = z.object({ carrier: z.enum(['MPK Rzeszów', 'PKS Rzeszów']), vehicle: z.string().trim().min(1).max(30).regex(/^[\p{L}\p{N} -]+$/u), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/) }).strict();
Deno.serve(async req => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return reply({ error: 'Niedozwolona metoda' }, 405);
  // Intentional public read-only lookup of transport data; no user data or mutation API is exposed.
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return reply({ error: 'Nieprawidłowe dane wyszukiwania' }, 400);
    const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('Missing Cloud binding');
    const db = createClient(url, key, { auth: { persistSession: false } });
    const store: Store = {
      async read(q, instant) {
        const { data, error } = await db.from('transport_course_cache').select('*').eq('carrier', q.carrier).eq('vehicle', q.vehicle).eq('service_date', q.date).gt('expires_at', new Date().toISOString()).lte('starts_at', instant).gt('ends_at', instant).limit(100);
        if (error) throw error;
        return (data ?? []).map(c => ({ id: c.id, vehicle: c.vehicle, line: c.line, direction: c.direction, brigade: c.brigade ?? undefined, startsAt: c.starts_at, endsAt: c.ends_at, evidence: c.evidence, sourceUrl: c.source_url, fetchedAt: c.fetched_at })) as Course[];
      },
      async claim(requestKey) { const { data, error } = await db.rpc('transport_claim', { p_key: requestKey }); if (error) throw error; return data; },
      async finish(requestKey, token, status, courses, q) {
        const { data, error } = await db.rpc('transport_finish', { p_key: requestKey, p_token: token, p_status: status, p_courses: courses.map(c => ({ ...c, carrier: q.carrier, date: q.date })) });
        if (error) throw error; return data === true;
      },
    };
    return reply(await lookupTransport(parsed.data, store));
  } catch (error) {
    console.error('Transport lookup failed', error instanceof Error ? error.message : 'Unknown error');
    return reply({ status: 'unavailable', reason: 'Pamięć kursów jest chwilowo niedostępna. Uzupełnij linię i kierunek ręcznie.' }, 503);
  }
});