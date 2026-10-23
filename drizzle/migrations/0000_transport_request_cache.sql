CREATE FUNCTION public.transport_next_noon(p_at timestamptz) RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT ((p_at AT TIME ZONE 'Europe/Warsaw')::date + CASE WHEN (p_at AT TIME ZONE 'Europe/Warsaw')::time >= time '12:00' THEN 1 ELSE 0 END + time '12:00') AT TIME ZONE 'Europe/Warsaw' $$;
REVOKE ALL ON FUNCTION public.transport_next_noon(timestamptz) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.transport_next_noon(timestamptz) TO service_role;
CREATE TABLE public.transport_course_cache (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), carrier text NOT NULL, vehicle text NOT NULL, service_date date NOT NULL,
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, brigade text, line text NOT NULL CHECK(length(trim(line))>0), direction text NOT NULL CHECK(length(trim(direction))>0),
 source_url text NOT NULL CHECK(source_url LIKE 'https://%'), evidence text NOT NULL CHECK(evidence IN ('confirmed','scheduled')), fetched_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT public.transport_next_noon(now()),
 CHECK(ends_at>starts_at), UNIQUE(carrier,vehicle,service_date,starts_at,ends_at,line,direction,source_url)
);
GRANT ALL ON public.transport_course_cache TO service_role;
ALTER TABLE public.transport_course_cache ENABLE ROW LEVEL SECURITY;
CREATE INDEX transport_cache_lookup ON public.transport_course_cache(carrier,vehicle,service_date,expires_at,starts_at,ends_at);
CREATE TABLE public.transport_lookup_requests (request_key text PRIMARY KEY, token uuid NOT NULL, lease_until timestamptz NOT NULL, retry_after timestamptz NOT NULL, failures integer NOT NULL DEFAULT 0, status text NOT NULL CHECK(status IN ('loading','complete','no-data','error')), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.transport_lookup_requests TO service_role;
ALTER TABLE public.transport_lookup_requests ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.transport_request_budget (bucket text PRIMARY KEY, window_start timestamptz NOT NULL, used integer NOT NULL);
GRANT ALL ON public.transport_request_budget TO service_role;
ALTER TABLE public.transport_request_budget ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.transport_cleanup_runs (local_date date PRIMARY KEY, started_at timestamptz NOT NULL, finished_at timestamptz, status text NOT NULL CHECK(status IN ('running','success','error')), deleted_courses integer NOT NULL DEFAULT 0, deleted_requests integer NOT NULL DEFAULT 0, error_code text);
GRANT ALL ON public.transport_cleanup_runs TO service_role;
ALTER TABLE public.transport_cleanup_runs ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.transport_claim(p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.transport_lookup_requests; b public.transport_request_budget; t uuid:=gen_random_uuid(); n timestamptz:=clock_timestamp();
BEGIN
 IF length(p_key)>300 THEN RAISE EXCEPTION 'Invalid request key'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('transport-request:'||p_key,0));
 SELECT * INTO r FROM public.transport_lookup_requests WHERE request_key=p_key;
 IF FOUND AND r.status='loading' AND r.lease_until>n THEN RETURN jsonb_build_object('status','busy','retryAfter',2); END IF;
 IF r.retry_after>n THEN RETURN jsonb_build_object('status','backoff','retryAfter',ceil(extract(epoch FROM r.retry_after-n))); END IF;
 INSERT INTO public.transport_request_budget VALUES('source',date_trunc('minute',n),0) ON CONFLICT DO NOTHING;
 SELECT * INTO b FROM public.transport_request_budget WHERE bucket='source' FOR UPDATE;
 IF b.window_start<>date_trunc('minute',n) THEN b.used:=0; END IF;
 IF b.used>=30 THEN RETURN jsonb_build_object('status','limited','retryAfter',ceil(extract(epoch FROM date_trunc('minute',n)+interval '1 minute'-n))); END IF;
 UPDATE public.transport_request_budget SET window_start=date_trunc('minute',n),used=b.used+1 WHERE bucket='source';
 INSERT INTO public.transport_lookup_requests(request_key,token,lease_until,retry_after,status) VALUES(p_key,t,n+interval '45 seconds',n,'loading') ON CONFLICT(request_key) DO UPDATE SET token=t,lease_until=n+interval '45 seconds',retry_after=n,status='loading',updated_at=n;
 RETURN jsonb_build_object('status','claimed','token',t);
END $$;
REVOKE ALL ON FUNCTION public.transport_claim(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.transport_claim(text) TO service_role;
CREATE FUNCTION public.transport_finish(p_key text,p_token uuid,p_status text,p_courses jsonb DEFAULT '[]') RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.transport_lookup_requests; c jsonb; n timestamptz:=clock_timestamp();
BEGIN
 SELECT * INTO r FROM public.transport_lookup_requests WHERE request_key=p_key FOR UPDATE;
 IF NOT FOUND OR r.token<>p_token OR r.status<>'loading' OR r.lease_until<=n THEN RETURN false; END IF;
 IF p_status NOT IN ('complete','no-data','error') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 IF p_status='complete' THEN
  IF jsonb_array_length(p_courses)=0 OR jsonb_array_length(p_courses)>100 THEN RAISE EXCEPTION 'Invalid courses'; END IF;
  FOR c IN SELECT value FROM jsonb_array_elements(p_courses) LOOP
   INSERT INTO public.transport_course_cache(carrier,vehicle,service_date,starts_at,ends_at,brigade,line,direction,source_url,evidence,fetched_at,expires_at)
   VALUES(c->>'carrier',c->>'vehicle',(c->>'date')::date,(c->>'startsAt')::timestamptz,(c->>'endsAt')::timestamptz,c->>'brigade',c->>'line',c->>'direction',c->>'sourceUrl',c->>'evidence',n,public.transport_next_noon(n))
   ON CONFLICT(carrier,vehicle,service_date,starts_at,ends_at,line,direction,source_url) DO UPDATE SET brigade=excluded.brigade,evidence=excluded.evidence,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at;
  END LOOP;
 END IF;
 UPDATE public.transport_lookup_requests SET status=p_status,lease_until=n,updated_at=n,failures=CASE WHEN p_status='error' THEN least(failures+1,5) ELSE 0 END,retry_after=n+make_interval(secs=>CASE WHEN p_status='error' THEN least(300,30*power(2,least(failures,4))::integer) ELSE 30 END) WHERE request_key=p_key;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.transport_finish(text,uuid,text,jsonb) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.transport_finish(text,uuid,text,jsonb) TO service_role;
CREATE FUNCTION public.transport_cleanup(p_at timestamptz DEFAULT now()) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d date:=(p_at AT TIME ZONE 'Europe/Warsaw')::date; a integer:=0; b integer:=0;
BEGIN
 IF extract(hour FROM p_at AT TIME ZONE 'Europe/Warsaw')<>12 THEN RETURN jsonb_build_object('status','not-due'); END IF;
 IF NOT pg_try_advisory_xact_lock(hashtextextended('transport-noon-cleanup',0)) THEN RETURN jsonb_build_object('status','busy'); END IF;
 IF EXISTS(SELECT 1 FROM public.transport_cleanup_runs WHERE local_date=d AND status='success') THEN RETURN jsonb_build_object('status','already-complete'); END IF;
 INSERT INTO public.transport_cleanup_runs(local_date,started_at,status) VALUES(d,clock_timestamp(),'running') ON CONFLICT(local_date) DO UPDATE SET started_at=excluded.started_at,status='running',finished_at=NULL,error_code=NULL;
 BEGIN
  DELETE FROM public.transport_course_cache WHERE expires_at<=p_at; GET DIAGNOSTICS a=ROW_COUNT;
  DELETE FROM public.transport_lookup_requests WHERE updated_at<p_at AND lease_until<=p_at AND retry_after<=p_at; GET DIAGNOSTICS b=ROW_COUNT;
  DELETE FROM public.transport_request_budget WHERE window_start<p_at-interval '1 minute';
  UPDATE public.transport_cleanup_runs SET status='success',finished_at=clock_timestamp(),deleted_courses=a,deleted_requests=b WHERE local_date=d;
 EXCEPTION WHEN OTHERS THEN
  UPDATE public.transport_cleanup_runs SET status='error',finished_at=clock_timestamp(),error_code=SQLSTATE WHERE local_date=d;
  RETURN jsonb_build_object('status','error');
 END;
 RETURN jsonb_build_object('status','success','deletedCourses',a,'deletedRequests',b);
END $$;
REVOKE ALL ON FUNCTION public.transport_cleanup(timestamptz) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.transport_cleanup(timestamptz) TO service_role;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;