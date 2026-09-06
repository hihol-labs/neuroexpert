# Fallback Policy

## Allowed Fallbacks

- Retry.
- Queue for later processing.
- Explicit degraded/unavailable status.
- Cached data with freshness metadata.
- Test/dev fixtures outside production paths.

## Forbidden Fallbacks

- Fake production results.
- Invented provider responses.
- Synthetic real-world data presented as real.
- Silent substitution without user/developer-visible status.

## Project-Specific Fallbacks

- Not supplied during adoption; fail closed and ask the project owner before relying on this field.
