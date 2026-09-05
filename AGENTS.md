## Roomform contributor guide

Roomform is a Vite, React, and TypeScript single-room planner. It renders a
top-down SVG plan in the browser only; do not add a backend, accounts, runtime
network calls, environment secrets, or 3D rendering.

## Module map

| Path | Responsibility |
| --- | --- |
| `src/App.tsx` | React state, forms, pointer interactions, SVG rendering, and user feedback |
| `src/geometry.ts` | Pure polygon, containment, collision, wall projection, and placement logic |
| `src/units.ts` | Centimetre conversion, 1 cm rounding, formatting, and range constants |
| `src/layoutPersistence.ts` | JSON v2 serialization, structural parsing, and v1 compatibility conversion |
| `src/*.test.ts` | Vitest coverage for pure behavior; avoid brittle rendering-only tests |
| `.github/workflows/deploy-pages.yml` | Static GitHub Pages build and deploy workflow |

## Domain rules

- Keep SVG and geometry calculations in their existing internal coordinate
  system. Expose and persist only whole centimetres.
- Round pointer-derived values with `roundToCentimetre`; parse user dimensions
  as whole centimetres before converting them.
- Preserve the last valid state on invalid room, furniture, or opening edits.
  Do not weaken this behavior for convenience.
- Require simple, non-zero-area room polygons. Reject non-adjacent wall
  intersections and zero-length walls.
- Keep every furniture footprint within the complete room polygon, including
  concave boundaries. Reject positive-area furniture overlap, but allow
  edge-only contact.
- Keep openings on their host wall, fully inside the wall interval, and
  non-overlapping with openings on that same wall.
- Save JSON as version 2 with `units: "cm"` and integer centimetre values.
  Treat version 1 explicitly as legacy input: normalize it to centimetres and
  validate it before state replacement. Never guess the units of unknown files.
- Preserve the static-only Pages deployment. Vite derives the Pages base path
  from `GITHUB_REPOSITORY` in GitHub Actions.

## Change workflow

1. Read the affected module and its direct tests before changing behavior.
2. Put deterministic geometry, conversion, and JSON behavior in a pure module.
   Keep browser event plumbing in `App.tsx`.
3. Add or update focused Vitest cases for the changed invariant or edge case.
4. Update `README.md`, `requirements.md`, `design.md`, and `tasks.md` when
   user-visible behavior, format semantics, or architecture changes.
5. Use comments only to capture non-obvious constraints, compatibility logic,
   or geometry rationale. Follow the existing TypeScript formatting and
   type-safe guards; do not introduce `any` or broad exception handling.

## Required validation

Run all commands from the repository root before handing off:

```bash
npm test
npm run lint
npm run build
```
