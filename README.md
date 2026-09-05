---
post_title: Roomform layout planner
author1: GitHub Copilot
post_slug: roomform-layout-planner
microsoft_alias: n-a
featured_image: n-a
categories: []
tags: [react, vite, svg]
ai_note: Created with GitHub Copilot.
summary: A browser-only centimetre room and furniture planner.
post_date: 2026-09-05
---

## Roomform

Roomform is a practical, browser-only planner for arranging one top-down room.
It is intentionally a 2D plan editor rather than a 3D interior-design tool.
The room, furniture, doors, and windows are drawn in SVG and work entirely in
the browser: there is no account, backend, or runtime network dependency.

## Plan a room

Start from the default 600 cm by 400 cm room or enter a new rectangular width
and length. Values are whole centimetres, with 1 cm precision. Choosing a new
rectangle while the plan has contents displays a confirmation because replacing
the room clears its furniture and openings.

To make an irregular room, select **Add corner**, click a wall, then drag the
new round corner handle. A room must remain a simple closed polygon with
non-zero area, so edits that self-intersect or exclude placed furniture are
rejected and the last valid plan stays in place.

The SVG grid uses 10 cm squares. Dimension annotations show the room's current
bounding width and length in centimetres.

## Manage furniture

Enter a name, width, length, and colour, then select **Add to room**. Roomform
finds the first available valid position, so several pieces can be added
without overlap. Click any piece to select it, edit its details, rotate it by
90 degrees, or remove it. Dragging is unrestricted by a visual snap grid but
is recorded to the nearest centimetre. The SVG canvas captures an active drag,
so it continues across furniture labels and canvas edges without selecting text.

Every furniture footprint must remain entirely inside the room, including
concave areas, and cannot overlap another footprint. Shared edges are allowed;
positive-area intersections are rejected.

## Add doors and windows

Choose a wall and add a door or window. The opening stays attached to its host
wall, can be dragged along it, and exposes size and wall-offset controls in
whole centimetres. Doors and windows have distinct plan symbols. Openings must
fit fully on their wall and cannot overlap another opening on that wall.

## Save and load layouts

**Save layout** downloads `room-layout-v2-cm.json`. Version 2 JSON declares
`"units": "cm"` and stores all room coordinates, furniture coordinates and
dimensions, and opening offsets and sizes as integer centimetres.
Roomform creates a temporary browser object URL, triggers the download, then
releases it after the browser has consumed the file.

**Load layout** validates the file's version, structure, numeric values, room
geometry, furniture containment, collisions, and opening constraints before
replacing the current plan. Invalid files leave the visible plan unchanged.
Legacy version 1 files are recognized, rounded to whole centimetres, revalidated,
and reported as converted before they are applied.

## Local development

Install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Run the project validation commands:

```bash
npm test
npm run lint
npm run build
```

## GitHub Pages

The static deployment workflow is at
`.github/workflows/deploy-pages.yml`. Push the project to GitHub, then open
**Settings** > **Pages** and set the source to **GitHub Actions**. Pushes to
`main` build and deploy the static `dist` artifact.

Vite uses `/` during local development and derives the repository path from
`GITHUB_REPOSITORY` in GitHub Actions, so repository Pages URLs work without
hard-coding a repository name.

## Contributor and AI guidance

Read [AGENTS.md](AGENTS.md) for the project map, domain invariants, and
required validation. Repository-wide Copilot guidance is in
[.github/copilot-instructions.md](.github/copilot-instructions.md); focused
planner, test, and documentation rules are in
[.github/instructions](.github/instructions). The
[Roomform maintainer agent](.github/agents/roomform-maintainer.agent.md) and
[layout planning skill](.github/skills/roomform-layout-planning/SKILL.md)
provide task-specific guidance for safe planner changes.
