# Project Contract

This file is owned by the project. Product Factory OS reads it before planning, editing, reviewing, and deploying.

## Product Invariants

- `CURRENT_PLAN.md` is the ordered source of truth for active work.
- Active phase is Stage 1: restore login and baseline availability.
- Do not move to the next stage until the current gate is closed or the user explicitly changes order.
- Public product outputs must use real production data or show an explicit degraded/unavailable status.
- User-facing AI/search visibility claims must remain tied to measurable sources, citations, pages, jobs, or provider responses.
- PFO/runtime-only commits are not release/product commits and must not trigger deployment by themselves.

## Real Data Sources

- Supabase self-hosted PostgreSQL, Auth, Storage, and PostgREST are the production data backbone.
- Telegram bot and webhook events are real user interaction sources.
- YooKassa webhooks and API responses are the source for payment state.
- OpenAI, YandexGPT, GigaChat, Perplexity, Whisper, Yandex SpeechKit, SerpAPI, XMLRiver, PageSpeed, Pixel Tools, GptFox, Plausible, and Yandex Metrika are approved external provider sources when configured.
- Seed, fixture, generated, or manually entered data must be labeled by context and must not be presented as live production evidence.
- Data freshness, source, confidence, provider IDs, timestamps, or logs are required when a user-facing feature depends on external data.

## Provider/Integration Contracts

- No silent provider substitution. Fallbacks must be visible in logs, API status, job status, or user-facing degraded state.
- Service role keys stay server-side only.
- Supabase API routing depends on Kong and `docker/supabase/kong.yml` rendered from `kong.yml.template` by `scripts/render-kong.sh`.
- Telegram, YooKassa, email, auth, API key, and billing flows must not bypass ownership, signature, or permission checks.
- OpenAI access may require `OPENAI_PROXY_URL`; failures must not be hidden by fake answers.
- Worker jobs must keep retry/backoff behavior and explicit failed/pending/completed status.

## User-Facing Output Contracts

- Audit, scan, dashboard, public pages, API endpoints, Telegram messages, and reports must distinguish real data, stale cached data, unavailable providers, and planned/manual work.
- Content and answers must not invent expert credentials, citations, customer results, platform metrics, payment states, or provider responses.
- API responses that expose licensed knowledge must respect key permissions, quotas, attribution format, and freshness metadata.
- Local Sales OS and Marketing OS pages are not ready for active sales promises until their gates in `CURRENT_PLAN.md` are met.

## Deployment Contracts

- Do not deploy fresh routes/jobs from the 2026-05-23..2026-05-24 changes until migrations `021`-`024`, generated DB types, `jobs_type_check`, PFO gate, and smoke checks are complete.
- Deploy scripts must keep executable bit `100755`.
- Production `.env` files are never committed.
- `docker/supabase/kong.yml` is generated on the server and must stay out of git.
- Production deployment requires explicit user intent and relevant smoke checks, not only a clean git tree.
