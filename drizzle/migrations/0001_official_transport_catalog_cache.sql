CREATE TABLE public.transport_source_cache (source_key text PRIMARY KEY, payload jsonb NOT NULL, fetched_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT public.transport_next_noon(now()));
GRANT ALL ON public.transport_source_cache TO service_role;
ALTER TABLE public.transport_source_cache ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.transport_cleanup_source_cache() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF NEW.status='success' THEN DELETE FROM public.transport_source_cache WHERE expires_at <= ((NEW.local_date + time '12:00') AT TIME ZONE 'Europe/Warsaw'); END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.transport_cleanup_source_cache() FROM PUBLIC;
CREATE TRIGGER transport_cleanup_catalog AFTER UPDATE ON public.transport_cleanup_runs FOR EACH ROW EXECUTE FUNCTION public.transport_cleanup_source_cache();