# Data Policy

## Real Data

- Production users, profiles, expert data, content packages, leads, orders, jobs, bookings, reviews, payments, API keys, scan results, citation checks, analytics, and subscriptions must come from Supabase or approved production integrations.
- AI/search visibility, SERP, demand, crawler, PageSpeed, Pixel Tools, GptFox, and provider-response data must keep source, timestamp, confidence, provider status, or raw evidence where available.
- Payment and subscription state must come from YooKassa webhooks/API or explicit admin/manual records marked as such.
- Telegram events must come from the bot/webhook runtime and must keep enough context to trace user action.

## Synthetic Data

- Seed data is allowed for initial niches/questions and local development when clearly separated from production evidence.
- Fixtures, mocks, and generated examples are allowed in tests, local development, docs, and non-production demos.
- Generated content is allowed only when the generation source and job path are clear; it must not be mislabeled as independent external evidence.
- Manual/concierge data is allowed for early Local Sales OS work only when owner, source, collection date, and confidence are explicit.

## Production Rules

- Synthetic data must not be presented as real production data.
- If a real source is unavailable, return an explicit unavailable/degraded status or use an approved transparent fallback.
- Do not invent provider answers, customer results, citations, search positions, payment states, or leads.
- Public pages, dashboards, API responses, reports, and Telegram notifications must not hide stale, partial, or unavailable data.

## Evidence Required

- Database rows need ownership context and timestamps.
- External provider data needs source/provider name, collected time, and confidence/status where the schema supports it.
- Jobs need status, retry/failure state, and logs sufficient for debugging.
- Payments need provider payment ID, event type, amount, status, and signature/webhook verification path.
- Production release claims need smoke-test evidence recorded in `PFO_REPORT.md`, `.codex-memory/STATE.json`, or the active task notes.
