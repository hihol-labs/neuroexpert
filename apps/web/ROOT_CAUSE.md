# Root Cause

Recorded: 2026-08-09

## Summary

The redesign was published to an isolated Signal Room preview host rather than the canonical `neuroexpertise.ru` production environment, while completion was reported without a live route-matrix check.

## Reproduction

- Open the canonical public site and navigate beyond the home route.
- The existing production environment continues to serve its prior route implementations because it was not updated by the Signal Room deployment.

## Evidence

- `.openai/hosting.json` contains only a Sites project identifier and no canonical-domain deployment configuration.
- The successful publication URL is on the separate `chatgpt.site` host, not `neuroexpertise.ru`.
- The design goal records route work as verified, but no live canonical-domain browser evidence is recorded for the public route matrix.

## Fix Hypothesis

Locate the repository's real production delivery path for `neuroexpertise.ru`, publish the already-redesigned route set through that path, and make a live route-matrix check a release requirement before reporting completion.

## Regression Test

- A release smoke script must assert that the canonical host serves the expected Signal Room marker and route-specific heading for every public marketing route: `/`, `/for-business`, `/how-it-works`, `/launch`, `/pricing`, `/scan`, `/audit`, `/for-experts`, and `/for-agencies`.

## Constraints

- Fix the canonical deployment path, not the preview host.
- Do not claim a page is released until the canonical host passes the route-matrix check.
