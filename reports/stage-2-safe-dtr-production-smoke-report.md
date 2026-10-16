# Stage-2-safe Demand-to-Revenue production smoke report

Date: 2026-06-14

Scope: production/DB controlled smoke for Demand-to-Revenue worker handlers while Stage 1 login remains externally BLOCKED by Yandex 360/SMTP. No replay/archive was performed for the historical failed `expand_query` jobs.

## Preconditions

- Production `business_accounts` and related Demand-to-Revenue tables were empty before this smoke.
- Created an explicit controlled fixture:
  - `business_id`: `a4a9a5ad-39c2-47af-a2c5-d6f520ac0f92`
  - `slug`: `codex-stage2-smoke-20260614`
  - `source`: `codex_stage2_smoke`
  - owner profile: `90171bf6-432b-415e-9c04-a66b0aa60e31`
- Historical failed queue was left untouched: `expand_query failed=754`.

## First run finding

Initial smoke jobs completed, but `analyze_behavior_signals` returned `signals_created=2` while `behavior_signals` contained `0` rows. Production worker container still had the old handler that wrote page URLs into UUID `content_id` and ignored Supabase insert errors.

Fix applied:

- `apps/worker/src/jobs/demand-to-revenue-os.ts` now inserts behavior signals through `insertBehaviorSignal()`.
- Supabase insert errors are thrown, so jobs fail visibly instead of reporting false success.
- Production worker was rebuilt and restarted after a targeted transfer of the fixed worker source file.

## Verification

Local:

- `pnpm --dir apps/worker build` OK
- `pnpm dtr:smoke` OK

Production repeat smoke:

- `smoke_run_id`: `stage2-dtr-smoke-20260614-2324`
- All 6 jobs completed with `attempts=1`, `max_attempts=1`:
  - `analyze_behavior_signals` -> `{"signals_created": 4}`
  - `generate_daily_growth_tasks` -> `{"created": 5}`
  - `calculate_unit_economics` -> `{"upserted": 2}`
  - `generate_b2b_page_draft` -> page `fe402b50-81ba-402e-ab57-af07f98e5256`
  - `generate_local_weekly_report` -> report `b87d90e0-6993-464f-80aa-3ae3e1114dd8`
  - `generate_agency_report` -> report `7faac85c-8322-4114-9dea-6c8b5cb94b08`, export `ace505ba-6b17-45de-a77a-55c9444f9854`

Production artifacts after repeat smoke:

- `behavior_signals=4`
- `growth_tasks=10`
- `channel_unit_economics=2`
- `local_generated_pages=2`
- `local_page_sections=10`
- `local_weekly_reports=2`
- `agency_reports=2`
- `agency_report_exports=2`
- `result_loop_events=12`

Queue status:

- DTR job types: completed only.
- `expand_query`: still `failed=754`, intentionally untouched.
- `/api/health`: `200`, `worker.pending_jobs=0`, `worker.failed_jobs=754`.

## Next

- Stage 1 login remains BLOCKED until Yandex 360/SMTP is fixed and real magic-link email is verified.
- Do not replay/archive the 754 `expand_query` jobs until provider quota/fallback is fixed.
- Next safe technical item: deploy/sync web if the newer `/api/health` worker totals/by_type shape is required on production; current production health endpoint still returns the older compact worker shape.
