# Memory

## Locked Execution Sequence

As of 2026-05-03, NeuroExpert work must follow the locked Product Factory OS sequence in `.codex-memory/NEUROEXPERT_EXECUTION_SEQUENCE.md`.

Current active stage: Stage 1 — Restore Login And Basic Availability.

Next action: after Yandex 360 balance is restored, restart `supabase-auth` and verify magic link.

Do not skip to later stages until the active stage gate passes.

## Planning Update 2026-05-04

User approved adding a separate SEO/AIO audit gate for project marketing and landing pages.

Added to `LAUNCH_PLAN.md`:
- General procedure: "Как провести SEO/AIO-аудит маркетинга и лендингов проекта".
- Step 2.0.7: SEO/AIO-аудит маркетинга и лендингов проекта.
- Step 2.0 acceptance now requires 0 P0 SEO/AIO findings, with P1 items fixed or tracked in `BACKLOG.md`.

Added to locked execution sequence:
- Stage 9 Promotion Readiness now requires the SEO/AIO marketing and landing audit before outreach.

## Unified Plan 2026-05-04

User clarified that the first item from the 2026-05-03 plan is to pay/refill Yandex 360. Created `CURRENT_PLAN.md` as the single active plan by merging `LAUNCH_PLAN.md` business goals with the staged Product Factory OS execution sequence.

Active first action: restore Yandex 360 billing/viewing mode, restart `supabase-auth`, and verify magic link before moving to AI/worker, E2E, dashboard, YuKassa, data authenticity, security, tests, and promotion readiness.


## Strict Sequence Lock 2026-05-04

User explicitly instructed that all future work on NeuroExpert must move only in the order defined by the latest plan, `CURRENT_PLAN.md`. At each work start, read `AGENTS.md`, then `CURRENT_PLAN.md`, identify the active stage, and do not skip forward. The first active item remains Yandex 360 payment/refill and SMTP/magic-link restoration.
