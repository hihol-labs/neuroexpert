# Golden Flows

Golden flows are the smallest set of user journeys that prove the product still works.

| Flow | Entry Point | Expected Result | Verification |
|---|---|---|---|
| Public availability | `/`, public pages, `/api/health` | HTTP 200 and health does not hide auth/provider degradation | automated/manual |
| Magic link login | `/login` | Real email receives magic link, `/auth/callback` returns the user to the app, `/otp` path works when used | manual |
| Expert content pipeline | Telegram voice or dashboard content request | STT/job/content package path reaches explicit completed or failed state; no fake successful output | automated/manual |
| Publish and lead capture | Published article/profile page | Public page renders, lead form creates a real lead and notification path is traceable | automated/manual |
| Knowledge API access | `/api/v1/*` with API key | Permissions, quotas, attribution, and freshness metadata are enforced | automated/manual |
| Production deploy safety | `scripts/render-kong.sh`, deploy flow | Kong config is rendered from template, scripts keep executable bit, smoke checks pass | manual |

## Blocking Rule

If a task touches a golden flow, the flow must be verified before deployment.
