---
description: 'Apply Roomform geometry, centimetre, SVG interaction, and persistence constraints to planner source modules.'
applyTo: 'src/App.tsx, src/geometry.ts, src/units.ts, src/layoutPersistence.ts'
---

# Roomform planner source

- Keep browser interactions in `App.tsx`; put deterministic calculations and
  format conversion in the existing pure modules.
- Use whole centimetres at form, display, pointer, and persistence boundaries.
  Keep internal geometry representation consistent with `units.ts`.
- Validate a complete candidate before replacing room, furniture, or opening
  state. Preserve the current valid state and provide feedback on rejection.
- Preserve simple-polygon, concave containment, positive-area collision, and
  same-wall opening interval semantics.
- Keep JSON v2 integer-centimetre serialization and the explicit v1
  normalization path. Reject unknown or malformed formats.
- Add comments only for non-obvious geometry, compatibility, or interaction
  constraints. Keep TypeScript strict; do not use `any`.
