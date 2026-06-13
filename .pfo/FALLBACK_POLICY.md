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

- LLM providers may fall back only through the shared provider abstraction and only with visible status/logging.
- STT may fall back from Whisper to Yandex SpeechKit only through the transcription abstraction and only with visible status/logging.
- Verification scripts may retry or use an explicit `curl` transport fallback when Node/undici cannot open a network connection, but the checked URL, status, content assertions, and failure output must remain visible; this is a verifier transport fallback, not a substitute for production behavior.
- Worker jobs may retry and then fail explicitly; they must not write fake successful outputs.
- If an external source is unavailable, API/UI responses must return an explicit degraded/unavailable status or cached data with freshness metadata.
- Audit and scan flows may show partial results only when missing platforms are clearly marked.
- Email/Supabase Auth degradation must be visible in health checks or logs; magic-link failures must not be reported as sent.
- Kong config rendering must fail closed if required keys or templates are missing.
- In development/test, fixtures are allowed only outside production paths and must be clearly labeled.
