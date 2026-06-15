# Next Step

This is the user-facing steering checkpoint.

## Where We Are

- Product: neuroexpert
- Current outcome: Stage 1 technical stabilization gate is complete, and Stage-2-safe worker/DTR smoke is done. Optional web deploy for richer `/api/health` was checked but deferred because this environment cannot currently verify production over HTTPS/SSH.
- Recommended next step: Either restore production access and verify `/api/health` shape before any web deploy, or return to the external Stage 1 blocker: pay/refill Yandex 360, remove viewing mode, restart `supabase-auth`, verify `/otp`, and verify a real magic-link email.
- Approval status: BLOCKED_EXTERNAL_YANDEX_360_AND_PROD_ACCESS_FOR_OPTIONAL_WEB_DEPLOY

## Visible Roadmap

| Step | Outcome | Status |
|---|---|---|
| 1 | Analyze existing project | done |
| 2 | Complete technical stabilization checks | done |
| 3 | Pay/refill Yandex 360 and remove viewing mode | blocked-external |
| 4 | Restart `supabase-auth` and verify `/otp` | waiting |
| 5 | Verify real magic-link email and close Stage 1 login gate | waiting |
| 6 | Restore/verify production HTTPS/SSH channel for optional web health deploy | blocked-access |

## Decision Needed

User/account owner must confirm Yandex 360 is paid and SMTP viewing mode is removed before Stage 1 can continue. For the optional Stage-2-safe web deploy, first make production health/SSH observable again; do not deploy web without a post-deploy smoke path. Do not replay/archive the 754 failed `expand_query` jobs before provider quota/fallback is fixed.
