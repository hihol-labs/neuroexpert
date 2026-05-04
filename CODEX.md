# CODEX

This project is adopted into the Product Factory OS workspace methodology.

## Rules

- Follow `/home/hihol/projects/CODEX.md` unless project-local rules override it.
- Save significant session context in `.codex-memory/`.
- Run review and tests before deploy or broad changes.
- Work on this project must follow `CURRENT_PLAN.md`.
- At the start of every NeuroExpert task, read `AGENTS.md` and `CURRENT_PLAN.md`, identify the active stage, and work only inside that stage until its gate passes.
- Do not skip ahead: complete the current stage gates in `CURRENT_PLAN.md` before moving to the next stage.
- Scope lock: do not change audit/Wordstat/AI-answer behavior while working on auth, billing, deployment, or unrelated modules unless the user explicitly requests it.
