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

1. **Foundations**: the big picture (what system design is, how a system grows, thinking in tradeoffs), how a request travels over the network, the core qualities, and then turning requirements into numbers.
2. **APIs, Traffic and Services**: how clients talk to a service, how requests reach many servers and are protected, and how a system is split into services.
3. **Data Storage and Caching**: storage on one machine and caching: relational and NoSQL databases, caching, specialized storage, and storage internals.
4. **Asynchronous Processing**: work that happens outside the request: when to go asynchronous, messaging, background jobs, events, and batch and stream processing.
5. **Distributed Systems**: why spreading data over machines is hard, replication, consistency, partitioning, distributed transactions, time and order, coordination, and how replicas converge.
6. **Running in Production**: observability, resilience, capacity and cost, delivery, security, recovery.
7. **Patterns**: problems that come up again and again and can only be solved by combining building blocks from phases 2 to 6, grouped by where the pressure comes from: load (reads, writes, hot spots, spikes, users worldwide), data (large files, hot and cold tiers, copies in sync, counting and ranking, location, tenant isolation), correctness (contention, duplicate work, long multistep work), reaching users (feeds, pushing updates) and evolving a running system (breaking up a monolith, migrating between datastores).
8. **AI Systems**: the building blocks of AI products (inference, serving, embeddings, vector databases, retrieval, agents), and how to evaluate and guard them.
9. **Classic Systems**: the well-known papers and systems, grouped by area.

## Why this order

Each topic should only need what came before it.

- Foundations first: the vocabulary (trade-offs, latency, scalability, availability) and the network a request travels over.
- Then the building blocks in the order a request meets them: the API, the traffic layer, the services, the data, and the asynchronous work behind them.
- The roadmap has to make sense both ways it is read: in order, no topic needs something not yet covered; opened at any phase, that phase is one complete subject. That is why each phase is a single subject: the building blocks (phases 2 to 4), distributed data together with the theory behind it (phase 5), running a system (phase 6), the patterns that combine everything (phase 7), AI systems (phase 8) and the classic papers (phase 9).
- Production concerns come once there is a system to run, patterns once every block they combine has been covered, and the classic papers last, as deep dives that use everything before them.

Inside a phase the same rule holds: concepts before mechanisms, and mechanisms before named products (for example, caching strategies before Redis). Single-node ideas come before distributed ones: ACID transactions sit with databases, two-phase commit and sagas come after partitioning.

## Wording

The roadmap reads like a book's table of contents.

- One idea per topic. A topic that needs "and" to join two unrelated ideas is two topics.
- Titles tell the reader what the chapter does, so the list reads like a story, not a glossary: "Finding Servers with DNS", not "DNS". The key term stays in the title, because search matches titles. A real choice is named as one: "Choosing Between REST, RPC and GraphQL". No "vs".
- Group names stay short labels ("Networking", "Caching", "Background Jobs"). Groups are for finding your way while they are collapsed; the story is told by the topic titles inside them.
- Patterns are named by what you do: "Scaling Reads", "Handling Contention".
- A group often opens with the problem before the fixes ("Cascading Failures" before timeouts and circuit breakers) and ends with the tools that implement it ("Redis and Memcached" after the caching ideas).
- Products appear only as a pair to compare ("Redis and Memcached") or in Classic Systems.
- No two topics teach the same thing. Where a building block and a pattern touch (Idempotency and Avoiding Duplicate Work), the building block explains the mechanism and the pattern combines it with others.
- Hyphens appear only when they are part of a term (B-Trees, Key-Value, Two-Phase Commit). No "Title: subtitle" forms; the group name gives the context.

The site teaches concepts. Hands-on exercises ("Design a URL shortener" and the like) and interview practice are deliberately left out.
