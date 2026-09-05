---
post_title: Roomform requirements
author1: GitHub Copilot
post_slug: roomform-requirements
microsoft_alias: n-a
featured_image: n-a
categories: []
tags: [requirements]
ai_note: Created with GitHub Copilot.
summary: Testable requirements for the room planner.
post_date: 2026-09-05
---

## Scope and constraints

Roomform is a standalone, static, browser-based planner for a single,
top-down room. It does not provide 3D rendering, user accounts, server APIs,
or runtime network access.

## Room requirements

- WHEN a user enters valid whole-centimetre width and length values from 10 cm
  through 10,000 cm, THE SYSTEM SHALL create an origin-based rectangular room.
- WHEN a user adds, moves, or removes a wall vertex, THE SYSTEM SHALL retain
  the edit only when the result is a simple, non-zero-area polygon.
- IF a room edit would exclude a placed furniture footprint or invalidate a
  wall opening, THEN THE SYSTEM SHALL retain the prior valid layout and
  display feedback.
- IF replacing a rectangular room would clear content, THEN THE SYSTEM SHALL
  require explicit confirmation before clearing it.

## Furniture requirements

- WHEN a user creates, edits, drags, or rotates furniture, THE SYSTEM SHALL
  use whole-centimetre dimensions and positions.
- WHEN a furniture change produces a positive-area collision or moves any
  footprint outside the room, THEN THE SYSTEM SHALL reject the change and
  retain the last valid state.
- WHEN furniture footprints touch at their edges only, THE SYSTEM SHALL allow
  the placement.
- WHEN a user adds furniture, THE SYSTEM SHALL find a non-overlapping
  in-room position when one is available.

## Opening requirements

- WHEN a user adds or moves a door or window, THE SYSTEM SHALL keep it on its
  selected host wall with whole-centimetre size and offset values.
- IF an opening would extend past the host wall or overlap another opening on
  that wall, THEN THE SYSTEM SHALL reject the edit and retain the last valid
  opening state.

## Persistence and delivery requirements

- WHEN a user saves a layout, THE SYSTEM SHALL emit version 2 JSON with
  `units` set to `cm` and integer-centimetre measurements.
- WHEN a user loads a version 2 file, THE SYSTEM SHALL validate its structure,
  units, integer values, and layout constraints before applying it.
- WHEN a user loads a legacy version 1 file, THE SYSTEM SHALL convert its
  values to nearest centimetres, revalidate the result, and report the
  conversion before applying it.
- IF a file fails parsing or validation, THEN THE SYSTEM SHALL leave the
  existing plan unchanged and report the failure.
- WHERE deployed to GitHub Pages, THE SYSTEM SHALL publish only static files.
