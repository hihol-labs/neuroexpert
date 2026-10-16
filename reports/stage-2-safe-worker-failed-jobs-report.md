# Stage-2-safe worker failed jobs report

Date: 2026-06-14

Scope: production worker/jobs diagnostics on existing data only. Stage 1 login gate remains BLOCKED by external Yandex 360/SMTP and is not closed.

## Findings

- Production containers were up: web, bot, worker, Supabase db/rest/auth/storage/kong.
- Worker uses internal Supabase URL `http://supabase-kong:8000` and `WORKER_POLL_INTERVAL_MS=5000`.
- Production jobs queue:
  - `completed`: `collect_demand=60`, `find_gaps=16`, `generate_orders=16`, `generate_content=1`, `validate_content=3`.
  - `failed`: `expand_query=754`.
  - `pending=0`, `processing=0`.
- All 754 failed jobs are unique `expand_query` jobs with `payload.question_id`.
- Root cause for failed jobs: OpenAI quota/billing 429. Worker env has `LLM_PRIMARY_PROVIDER=claude`, `LLM_FALLBACK_PROVIDER=openai`, and provider env names present for `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `OPENAI_PROXY_URL`.
- The 754 related questions already have `gap_analyzed_at` and `gap_score`, so `find_gaps -> generate_orders` completed. `sub_queries_total=0`, so fan-out enrichment did not complete.
- No existing `sub_queries` were available for the failed question IDs, so no failed `expand_query` jobs could be safely marked completed without reprocessing.

## Recovered

- Found one stale domain-state mismatch:
  - order `5c24dd48-5c62-419d-9963-74f047720132` was `processing`;
  - linked content package `01a08f05-f617-4101-8829-03ce901bc676` was already `published`;
  - linked voice recording had one completed transcript after two failed earlier recordings.
- Applied guarded production update:
  - update exactly that order to `published`;
  - only if it was still `processing`;
  - only if linked `content_packages.status = 'published'`.
- Result: orders status became `pending=20`, `published=1`, `processing=0`; content/order sync check became `published/published=1`.

## Not Recovered

- Did not reset/retry 754 failed `expand_query` jobs. With current OpenAI quota state they would fail again, and deterministic fake fan-out would violate the no-silent-substitution/data-authenticity rule.
- Did not close Stage 1 login gate.
- Did not run a new email registration.
- Did not create fake provider answers or fake subqueries.

## Next Safe Actions

1. Fix provider quota/billing or switch `expand_query` fallback to a working provider.
2. Add LLM 429 backoff/rate-limit before replaying the 754 failed jobs.
3. Improve `expand_query` error logging so failed jobs preserve both primary Claude error and fallback OpenAI error.
4. After provider fix, replay or archive the 754 failed `expand_query` jobs explicitly.
5. Add worker state visibility to `/api/health` or an operator dashboard: pending/processing/failed/completed by type.
