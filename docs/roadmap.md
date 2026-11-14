# Roadmap data

`src/data/roadmap.ts` is the single source of truth for the structure of the site.

- Two levels: **phase** > **topic**. Phases are few (8), topics are many.
- A topic has a stable `slug`, a `title` and an optional `group`. The group only clusters topics under a small heading inside a phase.
- Display numbers (`1.1`, `1.2`, ...) are computed from order. Reordering never breaks a link, because URLs use the slug (`/topics/<slug>`).
- Slugs are unique. Rename a title freely, but avoid changing a slug once an article exists.

## Turning a topic into an article

Not built yet. The plan: an article is a Markdown file named after the slug. A topic is "published" when its file exists and is not marked draft; everything else shows the "Planned" state. Articles are written in English.

## Out of scope for now

A low-level design track (OOP, patterns, small design problems), per-topic difficulty levels, search, and reading progress.
