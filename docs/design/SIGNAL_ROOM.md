# Signal Room — art direction and motion system

## Idea

The website behaves like the product: it notices demand, connects fragmented
signals and turns them into one concrete next action. The visual centerpiece is
not a decorative illustration or a dashboard screenshot. It is a live,
product-specific signal field.

## Visual language

- Base: matte graphite `#0a0b0d`, warm white `#f2f0e9`, muted steel
  `#8d9299`, signal orange `#ff4f2e`.
- Type: compact modern grotesk; maximum hero size 72px desktop / 44px mobile.
- Grid: 12 columns, generous negative space, hairline separators. Surfaces are
  flat and architectural; radius is reserved for interactive controls.
- Imagery: live data, geographic coordinates, routes and decisions. No stock
  photos, generated illustrations, gradient blobs or ornamental charts.
- Copy: short operational statements. Every section contains a visual proof,
  not a paragraph explaining an abstraction.

## Motion grammar

Motion is causal, quiet and looped over 12 seconds:

1. **Detect (0–3s):** local demand nodes appear with low-amplitude pulses.
2. **Connect (3–6s):** routes travel from sources to the business coordinate.
3. **Assess (6–9s):** the loss counter and source labels update.
4. **Act (9–12s):** a single recommended action enters and holds.

Micro-interactions use 180–420ms transitions. Entrance animation is used once;
continuous motion is limited to the signal field. `prefers-reduced-motion`
freezes the scene in its fully readable final state.

## Anti-slop constraints

- No oversized editorial serif headlines.
- No feature-card grid in the first two viewports.
- No neon-on-cream palette, glassmorphism or arbitrary glow.
- No motion without product meaning.
- No more than one accent color and two font families (the second is mono for
  machine labels only).
- No section may be text-only.
