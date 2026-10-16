# Stage 1-safe Auth UX Hardening Report

Date: 2026-06-15

## Scope

Stage 1 remains blocked by the external Yandex 360/SMTP issue. This change does not close the login gate and does not verify real magic-link delivery.

Allowed work completed:

- Improved `/api/auth/magic-link` error mapping for rate limits, SMTP/mail outage, invalid email, missing Supabase public env, and generic provider failures.
- Added network-failure handling to `/login` magic-link submission so the UI does not fail silently.
- Added network-failure handling to `/register` sign-up and normalized email/full name before sending to Supabase.
- Kept production untouched because HTTPS/SSH verification is still unavailable from this environment.

## Verification

- `pnpm --dir apps/web lint` — OK
- `pnpm --dir apps/web build` — OK

Commands were run in WSL with explicit PATH:

```bash
export PATH=/home/hihol/.local/bin:/usr/local/bin:/usr/bin:/bin
```

## Production Access Check

Production observability remains blocked:

- `neuroexpertise.ru` resolves to `198.18.1.147` in this environment.
- Domain HTTPS healthcheck returns `HTTP=000` timeout.
- Direct-IP HTTPS healthcheck with `--resolve neuroexpertise.ru:443:185.221.213.104` returns `HTTP=000` timeout.
- WSL SSH `hostland` times out during banner exchange.

## Remaining Blockers

- Yandex 360 must be paid/refilled and viewing mode removed before real magic-link email can be verified.
- Do not replay/archive the 754 failed `expand_query` jobs before provider quota/fallback is fixed.
- Do not deploy web until production HTTPS/SSH access is reliable enough for post-deploy smoke.
