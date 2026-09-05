---
description: 'Maintain Roomform project documentation and the static GitHub Pages workflow without contradicting implementation behavior.'
applyTo: 'README.md, requirements.md, design.md, tasks.md, .github/workflows/**/*.yml'
---

# Roomform documentation and Pages

- Keep documentation specific to this 2D, browser-only, single-room planner.
  Describe centimetres, JSON v2, legacy v1 conversion, and constraint
  preservation accurately.
- Update requirements in testable EARS-style statements and update the design
  when module responsibilities or data flow changes.
- Keep `tasks.md` as an accurate implementation and validation record; do not
  duplicate README prose.
- Preserve static-only Pages deployment with minimal workflow permissions and
  official GitHub actions. Do not add deployment secrets or server steps.
- Use concise headings, fenced commands, and links that resolve within this
  repository.
