---
name: roomform-layout-planning
description: 'Implement or review Roomform room geometry, furniture placement, doors, windows, centimetre precision, SVG interactions, and v1/v2 layout JSON changes.'
---

# Roomform layout planning

Use this skill for changes to room shaping, furniture, doors/windows, metric
display, centimetre conversion, SVG drag behavior, or layout JSON.

## Workflow

1. Read `AGENTS.md` and inspect the affected module plus its related tests.
2. Keep pure constraints in `geometry.ts`, conversion in `units.ts`, and JSON
   structure/compatibility in `layoutPersistence.ts`; limit `App.tsx` to state
   and interaction orchestration.
3. Build and validate a candidate layout before committing interactive changes.
   Preserve the existing valid state and issue feedback when it fails.
4. Add focused Vitest cases for each changed invariant or compatibility path.
5. Update the relevant README, requirements, design, and task records.
6. Run `npm test`, `npm run lint`, and `npm run build`.

## Gotchas

- **Use centimetres at boundaries.** Inputs, labels, pointer results, and v2
  JSON are whole centimetres; call `roundToCentimetre` for pointer values.
- **Keep v1 and v2 distinct.** Save only v2 with `units: "cm"`. Convert a
  recognized v1 file explicitly, then validate it; never infer unknown units.
- **Do not relax spatial constraints.** A room stays a simple polygon, each
  furniture footprint stays inside concave rooms and avoids positive-area
  overlap, and openings stay in non-overlapping host-wall intervals.
- **Keep Pages static.** Do not add APIs, accounts, secrets, network calls, or
  server deployment logic.
