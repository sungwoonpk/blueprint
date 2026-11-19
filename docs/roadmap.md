# Roadmap data

Each subject has one data file, `src/data/system-design.ts` and `src/data/algorithms.ts`, and `src/data/subjects.ts` lists the subjects. The shared shape and helpers (numbering, grouping) are in `src/lib/roadmap.ts`.

- Two levels: **phase** > **topic**. Phases are few (9 to 11), topics are many. Every topic has a `group`; on the roadmap a phase shows its groups and each group expands.
- A topic has a stable `slug`, a `title` and an optional `group`. The group only clusters topics under a small heading inside a phase.
- Display numbers (`1.1`, `1.2`, ...) are computed from order. Reordering never breaks a link, because URLs use the slug (`/<subject>/<slug>`).
- Slugs are unique. Rename a title freely, but avoid changing a slug once an article exists.

## Turning a topic into an article

An article is a Markdown file at `src/content/articles/<subject>/<slug>.md`, for example `src/content/articles/system-design/what-is-system-design.md`. A topic is published when its file exists; every other topic page says "Coming soon." The page supplies the number and the title, so the file starts with the first paragraph. Articles are written in English, following [writing.md](writing.md).

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
8. **AI Systems**: how models run and what they cost, retrieval (embeddings, vector databases, RAG, and when to fine-tune instead), building applications and agents within a context window, and keeping them good and safe in production.
9. **Classic Systems**: the well-known papers and systems, grouped by area and ordered by year, each one tied back to the chapters it illustrates (for example Dataflow to windowing and watermarks, Borg to container orchestration).

## The Algorithms phases

The reader is a computer science student in the later years of a degree, or an engineer early in a career: someone who should know what a senior algorithms course covers and what coding interviews test. See [decision 0007](decisions/0007-algorithms-roadmap-revised.md).

1. **Foundations**: what an algorithm is, proving it correct, measuring it with Big O, recursion, and how to approach a problem.
2. **Core Data Structures**: arrays (with amortized analysis, which needs the dynamic array as its example), strings and matrices, linked lists, stacks and queues (with turning recursion into an explicit stack), hashing, and combining structures.
3. **Sorting and Searching**: the classic sorts, the n log n lower bound and the linear time sorts that sidestep it, how real library sorts work, then binary search, which needs sorted data.
4. **Array Techniques** (they work on strings too): two pointers and sliding windows, rearranging in place, prefix sums and maximum subarrays, monotonic structures, intervals.
5. **Trees and Heaps**: binary trees, search trees and ordered maps, heaps (top K, two heaps, merging K lists), and the range query trees that extend prefix sums (Fenwick before segment trees).
6. **Design Strategies**: exhaustive search, divide and conquer with recurrences, greedy with its proofs, randomness.
7. **Graphs**: traversal, structure, shortest paths, spanning trees, advanced graphs, flows and matching.
8. **Bits and Math**: how integers are stored and bit manipulation, then number theory and combinatorics.
9. **Strings**: pattern matching (rolling hashes need modular arithmetic, so math comes first), then indexes over text: tries and suffix arrays.
10. **Dynamic Programming**: fundamentals (from recursion to memoization to tables, then states, reconstruction and recognizing a DP problem), classic problems, advanced forms.
11. **Hard Problems**: P and NP, reductions, NP-completeness, and what to do when no fast algorithm is known: exact exponential algorithms, approximation, heuristics.

The order follows what a learner needs next. Correctness, complexity and recursion come before anything that uses them; data structures before the techniques that run on them; sorting before binary search, which needs sorted input. Strategies come before graphs, because graph algorithms are those strategies applied (DFS is backtracking, Dijkstra and Prim are greedy, Bellman-Ford is dynamic programming). Bits and math come before strings and dynamic programming, which use them (rolling hashes, counting modulo a prime, bitmask states). Dynamic programming comes late because it draws on most of what came before it (trees, DAGs, strings, bits) and is the hardest step for most learners. Hard problems come last, since coping with them uses backtracking, greedy and dynamic programming together.

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
- Titles read like a book's chapters. A named algorithm or concept is simply its name ("Depth-First Search", "Circuit Breakers"). Words are added only when they add meaning ("Binary Search on the Answer", "Building Reliable Systems from Unreliable Parts"), never to dress a title up. The key term always stays in the title, because search matches titles. A real choice is named as one: "Choosing Between REST, RPC and GraphQL". No "vs".
- Group names stay short labels ("Networking", "Caching", "Background Jobs"). Groups are for finding your way while they are collapsed; the story is told by the topic titles inside them.
- Patterns are named by what you do: "Scaling Reads", "Handling Contention".
- A group often opens with the problem before the fixes ("Cascading Failures" before timeouts and circuit breakers) and ends with the tools that implement it ("Redis and Memcached" after the caching ideas).
- Products appear only as a pair to compare ("Redis and Memcached") or in Classic Systems.
- No two topics teach the same thing. Where a building block and a pattern touch (Idempotency and Avoiding Duplicate Work), the building block explains the mechanism and the pattern combines it with others.
- Hyphens appear only when they are part of a term or a name (B-Trees, Key-Value, Two-Phase Commit, Depth-First Search, Bellman-Ford). Anything else is rephrased ("Columnar Storage", not "Column-Oriented Storage"). No "Title: subtitle" forms; the group name gives the context.

The site teaches concepts. Hands-on exercises ("Design a URL shortener" and the like) and interview practice are deliberately left out.
