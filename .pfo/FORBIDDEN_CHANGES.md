# Forbidden Changes

These changes are blocked unless explicitly approved in the task scope.

## Always Forbidden Without Explicit Scope

- Replacing real data with synthetic data.
- Labeling mock/demo/fixture/fallback data as real production output.
- Changing user-facing semantics while working on a dependency-only or infrastructure-only task.
- Bypassing provider, auth, billing, payment, compliance, or security checks.
- Removing tests or quality gates to make a build pass.

## Project-Specific Forbidden Changes

- Deploying PFO/runtime-only commits as product releases.
- Moving work out of the active `CURRENT_PLAN.md` stage without explicit user direction.
- Publishing or selling `/local-sales`, `/marketing-os`, or `/agency` as production-ready before their gates are met.
- Deploying new runtime routes/jobs without migrations `021`-`024`, generated DB types, `jobs_type_check`, PFO gate, and smoke checks.
- Committing `.env`, `.env.local`, production secrets, API keys, service role keys, webhook secrets, or provider tokens.
- Removing executable bit from deploy scripts.
- Replacing real provider, billing, auth, or analytics data with invented production output.
- Weakening RLS, ownership checks, API key permissions, webhook signature checks, or service role boundaries.
- Running risky scraping of maps, Avito, 2GIS, or similar platforms when it violates source rules.
- Mass outreach, public case claims, or fixed-client-result promises before the login/worker/core E2E gates pass.
