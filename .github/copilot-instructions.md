## Roomform repository guidance

Work within the existing Vite React TypeScript application. Build precise,
small changes; preserve the static, browser-only architecture and avoid adding
network dependencies, credentials, server APIs, or unrelated packages.

Use `src/geometry.ts`, `src/units.ts`, and `src/layoutPersistence.ts` for pure
domain behavior. Keep SVG interaction and React state orchestration in
`src/App.tsx`. Prefer extending the existing pure modules over duplicating
constraint logic in components.

## Non-negotiable planner behavior

- Present and save dimensions as whole centimetres. Apply
  `roundToCentimetre` to pointer-derived values.
- Validate room polygons, furniture containment/collisions, and opening wall
  intervals before replacing state. Invalid operations keep the existing plan.
- Save version 2 JSON with `units: "cm"` and validate imported files before
  applying them. Only parse known legacy version 1 files through their
  explicit centimetre-normalization path.
- Keep GitHub Pages static. Do not replace the repository-aware Vite base path
  or expand workflow permissions without a concrete requirement.

Add focused Vitest coverage for changed pure behavior. Use comments only where
they explain geometry, unit, persistence, or interaction constraints. Run:

```bash
npm test
npm run lint
npm run build
```

Read [AGENTS.md](../AGENTS.md) for the module map and detailed invariants.
