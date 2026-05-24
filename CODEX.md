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

<!-- PFO_PROJECT_RUNTIME_START -->
## Product Factory OS Runtime

This existing project is adopted into Product Factory OS.

- Workspace: `/home/hihol/projects`
- Methodology: `/home/hihol/projects/product-factory-os`
- Project: `/home/hihol/projects/neuroexpert`

Before implementation, Codex must enforce full PFO adoption automatically:

```bash
pfo adopt /home/hihol/projects/neuroexpert
```

Then route work through `/task`, write `HANDOFF.md` before session or role transfer, update `.codex-memory/STATE.json`, and respect `.pfo/` contracts. Project-local rules may add constraints, but they do not replace PFO gates, memory, or scope/data/fallback contracts.
<!-- PFO_PROJECT_RUNTIME_END -->
