-- 018_claim_job_function.sql
-- Atomic job claim function for the worker poller.
--
-- Worker (apps/worker/src/index.ts) calls supabase.rpc("claim_job", { handler_types })
-- expecting one ready job with status='pending'. Without this function PostgREST
-- returns PGRST202 ("Could not find the function") and the worker falls back to
-- a non-atomic pollFallback() — racy across multiple worker replicas.
--
-- Concurrency: FOR UPDATE SKIP LOCKED ensures two pollers never grab the same job.
-- Eligibility: status='pending', scheduled_at<=now(), type in caller's handler list,
-- attempts < max_attempts (do not re-claim jobs that already exhausted retries).

CREATE OR REPLACE FUNCTION public.claim_job(handler_types text[])
RETURNS SETOF public.jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claimed_id uuid;
BEGIN
  SELECT id INTO claimed_id
  FROM public.jobs
  WHERE status = 'pending'
    AND type = ANY(handler_types)
    AND scheduled_at <= now()
    AND attempts < max_attempts
  ORDER BY priority ASC, scheduled_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF claimed_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.jobs
  SET status = 'processing',
      started_at = now(),
      attempts = attempts + 1
  WHERE id = claimed_id
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_job(text[]) TO service_role;

-- Force PostgREST schema cache reload so the function is visible immediately.
NOTIFY pgrst, 'reload schema';
