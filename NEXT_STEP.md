# Next Step

This is the user-facing steering checkpoint.

## Where We Are

- Product: neuroexpert
- Current outcome: Stage 1 remains externally blocked by Yandex 360/SMTP, but Stage 1-safe auth UX hardening is done locally. Login/magic-link errors now distinguish rate limits, SMTP/mail outage, invalid email, missing Supabase public env, and network failures; registration also handles network failures without leaving loading stuck. Stage-2-safe worker/DTR smoke remains done. Optional web deploy for richer `/api/health` remains deferred because this environment still cannot verify production over HTTPS/SSH.
- Recommended next step: Restore the external blocker first: pay/refill Yandex 360, remove viewing mode, restart `supabase-auth`, verify `/otp`, and verify a real magic-link email. For optional web deploy, first restore production health/SSH observability and check current `/api/health` shape.
- Approval status: BLOCKED_EXTERNAL_YANDEX_360_AND_PROD_ACCESS_FOR_OPTIONAL_WEB_DEPLOY

## Visible Roadmap

| Step | Outcome | Status |
|---|---|---|
| 1 | Analyze existing project | done |
| 2 | Complete technical stabilization checks | done |
| 3 | Improve Stage 1-safe login/register error UX | done-local |
| 4 | Pay/refill Yandex 360 and remove viewing mode | blocked-external |
| 5 | Restart `supabase-auth` and verify `/otp` | waiting |
| 6 | Verify real magic-link email and close Stage 1 login gate | waiting |
| 7 | Restore/verify production HTTPS/SSH channel for optional web health deploy | blocked-access |

## Decision Needed

User/account owner must confirm Yandex 360 is paid and SMTP viewing mode is removed before Stage 1 can close. Do not replay/archive the 754 failed `expand_query` jobs before provider quota/fallback is fixed. Do not deploy web without a reliable post-deploy smoke channel.
