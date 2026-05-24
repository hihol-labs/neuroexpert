# Scope Lock

## Current Task

- Finalize PFO adoption contracts and make the repository clean without product or deployment changes.

## Allowed Change Areas

- PFO runtime and contract files under `.pfo/`.
- PFO state/report files: `.codex-memory/STATE.json`, `PFO_CONTRACT_GATE.json`, `PFO_EXISTING_PROJECT_ANALYSIS.json`, `PFO_REPORT.md`.
- PFO entrypoint docs: `AGENTS.md`, `CODEX.md`.
- PFO navigation aliases: `ARCHITECTURE.md`, `MASTER_CONTEXT.md`, `PROGRESS.md`, `TASKS.md`, `TESTING.md`.

## Forbidden Change Areas

- Application code under `apps/` and `packages/`.
- Database migrations and generated database types.
- Docker, nginx, Traefik, Supabase, Kong, deploy script logic, and production runtime config.
- `.env`, `.env.local`, secrets, provider credentials, and production state.
- Product copy, pricing, user-facing behavior, worker behavior, auth behavior, billing behavior, and API behavior.

## Review Rule

If the diff touches an area outside allowed scope, pause and reclassify the task before continuing.
