# Roadmap data

`src/data/roadmap.ts` is the single source of truth for the structure of the site.

- Two levels: **phase** > **topic**. Phases are few (9), topics are many. Every topic has a `group`; on the roadmap a phase shows its groups and each group expands.
- A topic has a stable `slug`, a `title` and an optional `group`. The group only clusters topics under a small heading inside a phase.
- Display numbers (`1.1`, `1.2`, ...) are computed from order. Reordering never breaks a link, because URLs use the slug (`/topics/<slug>`).
- Slugs are unique. Rename a title freely, but avoid changing a slug once an article exists.

## Turning a topic into an article

Not built yet. The plan: an article is a Markdown file named after the slug. A topic is "published" when its file exists and is not marked draft; everything else shows the "Planned" state. Articles are written in English.

## Out of scope for now

A low-level design track (OOP, patterns, small design problems), per-topic difficulty levels, interview practice material, and reading progress.

## The phases

1. **Foundations**: basics, networking, and the core qualities (scale, availability, reliability).
2. **Traffic and APIs**: how requests arrive and are protected, how services are split, and how they talk.
3. **Data Storage and Caching**: databases, storage internals, replication and consistency, partitioning, transactions, specialized stores, caching.
4. **Messaging and Streaming**: queues, event-driven design, batch and stream processing.
5. **Distributed Systems**: what goes wrong across machines and how nodes agree and converge.
6. **Running in Production**: resilience, observability, delivery, security, recovery and cost.
7. **Patterns and Case Studies**: a design method, reusable patterns, then full designs grouped by domain.
8. **AI Systems**: building blocks and case studies for AI products.
9. **Classic Systems**: the well-known papers and systems, grouped by area.

The order follows a request through a system (traffic, then data, then async work), then the theory and operations behind it, then whole designs.
