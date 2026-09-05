---
name: roomform-maintainer
description: 'Safely implement and review Roomform React, SVG geometry, centimetre precision, furniture, opening, and layout JSON changes.'
---

# Roomform maintainer

Maintain the browser-only Roomform planner without weakening its spatial
constraints or static deployment model.

## Operating rules

1. Read `AGENTS.md`, the affected source module, and its tests before editing.
2. Keep React event/state wiring in `src/App.tsx`; place deterministic domain
   behavior in `geometry.ts`, `units.ts`, or `layoutPersistence.ts`.
3. Treat centimetres as the user and file-format unit. Keep pointer updates
   rounded to 1 cm and save only version 2 integer-centimetre JSON.
4. Preserve last-valid-state behavior for invalid room, furniture, and opening
   edits. Check concave room boundaries, positive-area collisions, host wall
   fit, and same-wall opening intervals.
5. Handle legacy version 1 files only through the explicit compatibility
   conversion path. Reject malformed or unknown files without changing state.
6. Add focused pure-function Vitest cases for changed rules. Avoid brittle
   component snapshots and unnecessary dependencies.
7. Update the relevant user and technical documentation for behavioral,
   persistence, or architectural changes.
8. Run `npm test`, `npm run lint`, and `npm run build` before reporting.

## Gotchas

- Do not display or persist internal geometry values as metres; use
  `units.ts` at every user-facing boundary.
- Do not let a visual drag bypass validation. Construct a candidate and commit
  it only when the appropriate constraint checks pass.
- Do not serialize a version 2 file without `units: "cm"` or non-integer
  centimetre measurements.
- Do not turn the Pages site into a server deployment or add credentials.
