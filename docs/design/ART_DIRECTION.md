# NeuroExpert visual direction

## Position

NeuroExpert is an operating system for local demand, not another analytics dashboard. The interface should feel like an experienced commercial operator: direct, precise, calm, and visibly grounded in real signals.

## Direction: Editorial operations

- Editorial scale and composition instead of a repeated SaaS card grid.
- Warm paper surfaces and near-black ink establish seriousness without default corporate blue everywhere.
- Acid-lime marks live demand and action; cobalt is reserved for navigation and decisions; signal-orange marks loss or urgency.
- A serif display face gives the brand a recognizable voice. Neutral sans-serif and monospace carry operational data.
- Borders, rhythm, and deliberate asymmetry create hierarchy. Shadows are reserved for actual layered product surfaces.

## Tokens

The canonical CSS custom properties live in `apps/web/app/globals.css`:

- `--nx-ink`, `--nx-ink-soft`
- `--nx-paper`, `--nx-paper-bright`
- `--nx-line`
- `--nx-accent`, `--nx-accent-strong`
- `--nx-signal`, `--nx-cobalt`
- `--nx-display`, `--nx-sans`

## Composition rules

1. Start each route with one dominant idea and one primary action.
2. Do not place every concept in a rounded card. Use type, rules, spacing, and contrast before containers.
3. Product evidence must look like an operating surface and contain legible labels, values, and a next action.
4. Large headings use `nx-display`; operational labels use `nx-kicker`.
5. Focus states are visible. Interactive targets remain at least 40px high.
6. Desktop and mobile retain the same hierarchy; mobile is a composed layout, not a compressed desktop.

## G-001 reference surface

The homepage is the reference implementation for the new direction. Required viewport evidence: 1440×1000 and 390×844. It establishes the design tokens, typography, navigation treatment, data console, operating-loop narrative, and paired conversion routes used by later units.
