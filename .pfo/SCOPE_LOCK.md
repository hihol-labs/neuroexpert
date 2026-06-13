# Scope Lock

## Current Task

- Run the Stage 1 technical stabilization gate that is explicitly allowed while SMTP is blocked: verify/apply migrations `021`-`024`, refresh generated DB types, verify PostgREST/jobs/health/AEO smoke, and close deploy-script permission blockers without claiming Stage 1 login completion.

## Allowed Change Areas

- PFO runtime and contract files under `.pfo/`.
- PFO state/report files: `.codex-memory/STATE.json`, `PFO_CONTRACT_GATE.json`, `PFO_EXISTING_PROJECT_ANALYSIS.json`, `PFO_REPORT.md`.
- PFO entrypoint docs: `AGENTS.md`, `CODEX.md`.
- PFO navigation aliases: `ARCHITECTURE.md`, `MASTER_CONTEXT.md`, `PROGRESS.md`, `TASKS.md`, `TESTING.md`.
- Active plan/status documentation: `CURRENT_PLAN.md`.
- Generated database types: `packages/shared/src/types/database.ts`.
- AEO smoke verifier: `scripts/validate-aeo-site.js`.
- Deploy script executable permissions only: `scripts/deploy.sh`, `scripts/fix-prod.sh`, `scripts/generate-env.sh`, `scripts/render-kong.sh`.

## Forbidden Change Areas

- Application behavior under `apps/` and `packages/`, except generated database type declarations listed above.
- Database migrations, except read-only verification of `021`-`024` and explicitly requested application if missing.
- Docker, nginx, Traefik, Supabase, Kong, deploy script logic, and production runtime config.
- `.env`, `.env.local`, secrets, provider credentials, and production state.
- Product copy, pricing, user-facing behavior, worker behavior, auth behavior, billing behavior, and API behavior.
- SMTP/login success claims, magic-link E2E claims, and production release claims before Яндекс 360 is paid and a real magic link email is verified.

## Review Rule

If the diff touches an area outside allowed scope, pause and reclassify the task before continuing.
