# NeuroExpert Execution Sequence

This is the locked Product Factory OS execution sequence for NeuroExpert.

All future work on this project must move through these stages in order unless the user explicitly changes the sequence.

## Current Rule

- Work strictly by stage and point.
- Do not skip a stage because later work depends on earlier gates.
- Before changing code, identify the active stage and scope.
- After each meaningful change, run relevant gates and update `.codex-memory/STATE.json`.
- Keep product data authentic: no fake questions, no fake AI answers, no silent substitutions.

## Stage 1. Restore Login And Basic Availability

Goal: users can register, log in, and reach the product reliably.

1. Refill/fix Yandex 360 balance and remove viewing mode.
2. Restart `supabase-auth`.
3. Verify magic link: `/otp` must return `200`.
4. Add a mailer health check for SMTP/magic-link readiness before release.
5. Improve login error UX: do not show raw `Error sending magic link`; show a clear user-facing message and log the technical reason server-side.

Gate:

- Login magic link works for a real email.
- `supabase-auth` logs contain no `SMTP disabled` for a test request.
- Main public pages and `/api/health` return `200`.

## Stage 2. Unblock AI And Worker Pipeline

Goal: background jobs process real data without quota loops.

1. Resolve OpenAI quota: refill billing, replace key, or move `expand_query` to Claude/YandexGPT fallback.
2. Clean or restart failed and pending `expand_query` jobs after the quota fix.
3. Fix GigaChat env consistency: code must use `GIGACHAT_CLIENT_ID` and `GIGACHAT_CLIENT_SECRET`, not stale `GIGACHAT_API_KEY` checks.
4. Add backoff/rate-limit behavior for LLM jobs to avoid queue flooding on 429.
5. Add worker state visibility: pending/failed/completed counts by job type.

Gate:

- Worker logs show no repeated quota-loop failures.
- Failed queue is understood and either retried or archived.
- New `collect_demand -> find_gaps -> generate_orders` flow completes for a test niche.

## Stage 3. Close The Core User E2E Flow

Goal: the primary value chain works repeatedly for real experts.

Flow:

1. Expert registration.
2. Telegram linking.
3. Niche selection.
4. Order generation.
5. Order acceptance through web and Telegram.
6. Voice recording.
7. Transcription.
8. Content generation.
9. Review and edit.
10. Publish.
11. Public article page.
12. Lead form submission.
13. Telegram notification to expert.
14. Lead appears in dashboard.

Gate:

- The full chain succeeds five times in a row on real or controlled pilot accounts.
- No fake content, fake questions, or fake AI answers are introduced.

## Stage 4. Fix Web Dashboard Breaks

Goal: dashboard actions match implemented backend routes.

1. Create `/api/orders/accept`.
2. Create `/api/orders/skip`.
3. Verify `/content/new` creates a voice job and links to accepted order when applicable.
4. Verify `/content/[id]`: save, publish, delete, and ownership boundaries.
5. Verify `/profile`: slug uniqueness, public profile publishing, and E-E-A-T fields.
6. Fix `/billing` cancellation flow; `subscribe("free")` is not a valid cancellation mechanism.

Gate:

- Dashboard order actions work from the UI.
- Content management operations work only for the owner.
- Billing UI does not offer a non-working cancellation path.

## Stage 5. Monetization

Goal: paid conversion and subscription state work end to end.

1. Configure production YuKassa keys.
2. Verify payment creation.
3. Verify `payment.succeeded` webhook.
4. Verify `subscription_tier` update.
5. Verify tier limits: niches, orders, content formats, API keys.
6. Add cancellation and subscription expiration behavior.
7. Run one full test payment lifecycle.

Gate:

- A paid subscription can be purchased and reflected in the product.
- Webhook handling is secure and idempotent.

## Stage 6. Data Authenticity And Demand Quality

Goal: audit and product recommendations use real demand and real provider responses.

1. Keep audit questions sourced from real Wordstat data.
2. Verify all 20 niches have enough Wordstat questions.
3. Improve question quality filtering beyond minimum word count.
4. Store AI answer source and check timestamp.
5. Do not show a platform result unless a real provider answer was received.

Gate:

- Audit output is explainable from stored real sources.
- No placeholder/fake provider responses are displayed.

## Stage 7. Security And Trust

Goal: public launch does not expose abuse paths or trust-breaking behavior.

1. Stop auto-publishing reviews; add moderation.
2. Add anti-spam controls to public forms: leads, reviews, audit, scan.
3. Audit all API routes that use service role.
4. Close or protect public APIs that should not be public.
5. Verify RLS for new tables: teams, bookings, api_keys, referrals, reviews.
6. Add security smoke tests.

Gate:

- Public unauthenticated actions are rate-limited and abuse-resistant.
- Private data access is covered by auth/RLS or server-side ownership checks.

## Stage 8. Test Coverage

Goal: the product is guarded by meaningful regression tests.

1. Unit tests: tiers, API key auth, slug, content validator, Wordstat parser, LLM fallback policy.
2. API integration tests: audit, scan, leads, reviews, bookings, subscribe webhook.
3. Worker tests: collect_demand, find_gaps, generate_orders, transcribe mock, generate_content mock.
4. E2E Playwright tests: register/login, dashboard, order accept, voice upload, publish, lead.
5. Production smoke script after deploy: health, login mailer, audit, scan, worker queue.

Gate:

- Tests cover the core value chain and the previously broken flows.
- CI blocks regressions in core flows.

## Stage 9. Promotion Readiness

Goal: move from technical MVP to sellable product.

1. Run 3-5 pilot experts through the full flow.
2. Publish real articles from those pilots.
3. Collect real cases: question, expert answer, article, lead/citation/search result.
4. Start expert outreach after repeatable E2E success.
5. Move B2B/agency promotion after B2C pipeline stability.

Gate:

- The product can demonstrate real outcomes.
- Marketing claims match actual functionality and evidence.

## Current Active Stage

Stage 1: Restore Login And Basic Availability.

Next action: after Yandex 360 balance is restored, restart `supabase-auth` and verify magic link.
