# Roadmap data

`src/data/roadmap.ts` is the single source of truth for the structure of the site.

- Two levels: **phase** > **topic**. Phases are few (9), topics are many. Every topic has a `group`; on the roadmap a phase shows its groups and each group expands.
- A topic has a stable `slug`, a `title` and an optional `group`. The group only clusters topics under a small heading inside a phase.
- Display numbers (`1.1`, `1.2`, ...) are computed from order. Reordering never breaks a link, because URLs use the slug (`/topics/<slug>`).
- Slugs are unique. Rename a title freely, but avoid changing a slug once an article exists.

## Turning a topic into an article

Not built yet. The plan: an article is a Markdown file named after the slug. A topic is "published" when its file exists and is not marked draft; every other topic page says "Coming soon." Articles are written in English.

## Out of scope for now

Design exercises and interview practice, and reading progress. There is one roadmap for everyone: no separate tracks and no levels.

## The phases

1. **Foundations**: what system design is and how to think in tradeoffs, how a request travels over the network, and the core qualities (performance, scalability, availability, reliability).
2. **APIs, Traffic and Services**: how clients talk to a service, how requests reach many servers and are protected, and how a system is split into services.
3. **Data Storage and Caching**: storage on one machine and caching: relational and NoSQL databases, caching, specialized storage, and storage internals.
4. **Asynchronous Processing**: work that happens outside the request: messaging, events, stream processing and background jobs.
5. **Distributed Systems**: why spreading data over machines is hard, replication, consistency, partitioning, distributed transactions, time and order, coordination, and how replicas converge.
6. **Running in Production**: observability, resilience, capacity and cost, delivery, security, recovery.
7. **Patterns**: recurring problems (scaling reads and writes, traffic spikes, counting, large files, contention, long jobs, fanout, pushing updates) and how the building blocks solve them.
8. **AI Systems**: the building blocks of AI products, and how to evaluate and guard them.
9. **Classic Systems**: the well-known papers and systems, grouped by area.

## Why this order

Each topic should only need what came before it.

- Foundations first: the vocabulary (trade-offs, latency, scalability, availability) and the network a request travels over.
- Then the building blocks in the order a request meets them: the API, the traffic layer, the services, the data, and the asynchronous work behind them.
- The roadmap has to make sense both ways it is read: in order, no topic needs something not yet covered; opened at any phase, that phase is one complete subject. That is why each phase is a single subject: the building blocks (phases 2 to 4), distributed data together with the theory behind it (phase 5), running a system (phase 6), the patterns that combine everything (phase 7), AI systems (phase 8) and the classic papers (phase 9).
- Production concerns come once there is a system to run, patterns once every block they combine has been covered, and the classic papers last, as deep dives that use everything before them.

Inside a phase the same rule holds: concepts before mechanisms, and mechanisms before named products (for example, caching strategies before Redis). Single-node ideas come before distributed ones: ACID transactions sit with databases, two-phase commit and sagas come after partitioning.

## Wording

Titles are short, plain and in Title Case. Hyphens appear only when they are part of a term (B-Trees, Key-Value, Two-Phase Commit). No "Title: subtitle" forms; the group name gives the context instead.

The site teaches concepts. Hands-on exercises ("Design a URL shortener" and the like) and interview practice are deliberately left out.
