---
description: 'Apply focused Vitest practices to Roomform pure geometry, units, and layout-persistence tests.'
applyTo: 'src/**/*.test.ts'
---

# Roomform tests

- Test pure observable behavior from `geometry.ts`, `units.ts`, and
  `layoutPersistence.ts`; do not add brittle SVG or React rendering snapshots.
- Cover changed constraints with valid and invalid cases: concavity, boundary
  contact versus overlap, centimetre rounding, and v1/v2 JSON semantics.
- Use explicit coordinates and centimetre values that make the assertion easy
  to audit. Keep fixtures local to the test file unless shared behavior needs
  one common fixture.
- Assert that invalid parsing returns no layout and that invalid geometry is
  rejected by the relevant validation path.
- Run `npm test` after changing tests or the pure modules they exercise.
