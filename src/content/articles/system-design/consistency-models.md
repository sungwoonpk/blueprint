> A **consistency model** is a rule about which orderings of reads and writes a system is allowed to show its clients. A strong model makes the system behave like one machine and is easy to reason about, and a weak model allows surprises and costs less in latency and availability.

The last three topics gave the textbook app followers, several leaders and replicas with no leader.

Each answers a read in a different way, and each can give a different answer to the same question: is this book still for sale? Words like "eventually consistent" and "strongly consistent" are used loosely, and engineers argue about them for that reason.

This topic gives each level a precise meaning, so that a database's promise can be compared with what an app needs.

## Two Families

The models fall into two families. One is about a single object, such as one key: how its reads and writes line up in time. The other is about transactions that touch several objects, and how they interleave. The strongest model unifies both.

<figure class="diagram">
<p class="rowname">Single Object Models</p>
<div class="flow">
<div class="node">Linearizable</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Sequential</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Causal</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">PRAM</div>
</div>
<p class="rowname">Transaction Models</p>
<div class="flow">
<div class="node hot">Strict Serializable</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Serializable</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Snapshot Isolation</div>
</div>
<figcaption>Each model implies the ones after it, and strict serializable is also linearizable</figcaption>
</figure>

An arrow means that a system with the first guarantee also has the second. Repeatable read sits beside snapshot isolation, and the two are incomparable, since neither is strictly stronger than the other. Read committed lies below both, and it comes up again below.

## Linearizability: The Strongest Single Object Model

A system is **linearizable** if each operation appears to take effect atomically at one moment between its start and its finish, and those moments respect real time. If operation A finishes before B starts, B must see A's effect.

For the textbook app, suppose Ana's purchase of a book completes at 9:00:01. Ben opens the page at 9:00:02, and a linearizable system must show the book as sold.

This rules out stale reads, and a read that returns a new value and a later read that returns an older one. It also allows compare and set, so a mutex or a unique stock count can be built on top.

The scope matters. What counts as "an object" depends on the system: a key, a table or a database, and not several tables or separate databases. The cost is that it can't stay available during a partition: some nodes can't make progress.

## Serializability: The Strongest Transaction Model

**Serializability** says that transactions behave as if they ran one at a time, in some order, with no interleaving of their steps. It covers many objects, including queries over a set of rows.

It says little about time. A read after a completed write may not see it, and a process may miss its own earlier writes, because the legal order can place a transaction anywhere.

A small example: with `x = 1; x = x + 1; puts x` running as transactions, serializability allows printing nil, 1 or 2. Beware too that the word SERIALIZABLE in SQL often means something weaker, such as snapshot isolation, which is the territory of [Isolation Levels](/system-design/isolation-levels).

**Strict serializability** adds linearizability's real time rule to serializability. It is the model of a database that behaves like one machine running one transaction at a time, and the strongest one on the map.

## Sequential and Causal

Two models sit between the strong ones and the session guarantees.

**Sequential consistency** means operations appear in one order, and each process's operations appear in its own order. There is no real time rule, so a process can be behind, but once it has seen something it doesn't see older data. Take an upload: the uploader sees the video go from missing to processing to ready, and others may see it go from missing to ready. If the uploader refreshed and saw no video, that would break the model.

**Causal consistency** means operations that are causally related appear in the same order to each process, and unrelated ones may appear in different orders. Take a chat in which Attiya asks "lunch?" and two people answer yes and no. Each person sees the question first, and the answers can arrive in either order. The causal chains are the happened-before relation from [Physical and Logical Clocks](/system-design/clocks).

## Session Guarantees

Below causal consistency are the small promises that fix the strangest effects of [Replication Lag](/system-design/replication-lag):

**Read your writes** means a process that wrote a value sees it, or newer, in its later reads. **Monotonic reads** means a process's later reads don't show an older state than an earlier read. **PRAM** means a process's writes are seen everywhere in the order it made them, and it is equivalent to read your writes, monotonic reads and monotonic writes together.

We checked what read policies give. In a simulation of one key written at 500 ms intervals with 3 followers, each normally 20 ms behind and 3 seconds behind for 2 percent of the time, 50 clients read at 50 reads a second in total. The leader's reads were the reference:

| Read Policy | Stale Reads | Reads That Went Back for a Client | Own Write Missed 50 ms Later |
| --- | --- | --- | --- |
| Leader | 0% | 0% | 0% |
| Random Follower | 7.15% | 1.80% | 3.17% |
| Follower Chosen by Client | 7.22% | 0% | 3.17% |

Reading from the leader gave linearizable reads for this key. A random follower was stale in about 7 percent of reads, and sometimes went back in time.

Pinning each client to one follower removed the backwards reads, which is monotonic reads, and didn't fix staleness or the missed own write. Each guarantee needs its own mechanism, as [Replication Lag](/system-design/replication-lag) described.

## What Each Model Costs

The models group by what they can do during a partition on an asynchronous network:

| Group | Models | During a Partition |
| --- | --- | --- |
| Total Availability | Monotonic reads, read committed | Every node keeps answering |
| Sticky Availability | Read your writes, PRAM, causal | A client must keep using one server |
| Unavailable | Sequential, linearizable, serializable | Some nodes can't make progress |

This is why stronger models cost latency too. Azure Cosmos DB shows it in numbers: its strong level, which is linearizable, reads from 2 of 4 replicas and so costs twice the request units of the weaker levels.

With several regions, strong writes take about twice the round trip between the two farthest regions plus 10 ms, and accounts that span more than 5,000 miles can't use it by default. The theory behind this trade is in [The CAP Theorem](/system-design/cap) and [PACELC](/system-design/pacelc).

## Models in Real Systems

Here is a way to compare.

etcd makes reads linearizable by default. A serializable read is an opt in that can be stale and avoids waiting on consensus, which trades freshness for speed.

Google Spanner's default gives external consistency, behavior as if transactions ran serially in the order commits can be seen, which is what strict serializability means. Reads are strong by default, and a stale read at a chosen age is available, with 15 seconds a reasonable value for performance.

Amazon S3 gives strong read after write for puts and deletes of objects. A key is updated atomically, and there is no atomic update across keys. Concurrent puts to one key are settled by last writer wins.

Azure Cosmos DB offers five levels, strong, bounded staleness, session, consistent prefix and eventual, from the strongest to the weakest, and each request can pick.

Claims need checking, since a database can say more than it does. Independent testing of MongoDB 4.2.6 in 2020 found that operations in a transaction ignored the collection level read concern and used the default `local`, and that the default write concern was one node.

In a run with partitions, updates to 8 documents were acknowledged and later disappeared.

Even with the strongest settings, they saw anomalies: in a fault free run of about 100 transactions a second, 1,461 of 13,914 transactions, about 10 percent, were in cycles of dependencies that no serial order allows.

MongoDB traced them to a retry bug and scheduled a patch. The lesson is to test the promise as well as read it.

## Choosing

| Screen or Operation | Model That Fits |
| --- | --- |
| Reserving the last copy of a book | Linearizable on that item |
| A purchase that touches stock, wallet and orders | Serializable, or a saga with compensation |
| "My Listings" after a post | Read your writes |
| A listing's replies thread | Causal |
| A counter of views | Eventual |

Pay for strength where wrong answers cost money, and use the weaker models for the rest. Distributed transactions across services come later, in [Two-Phase Commit](/system-design/two-phase-commit) and [Sagas](/system-design/sagas).

## Key Points

- A consistency model is the set of histories a system may show, and there are two families: single object models and transaction models
- <u>Linearizability adds real time to single object operations</u>, serializability gives a serial order of transactions with no real time, and strict serializability has both
- Sequential and causal consistency sit lower, and session guarantees such as read your writes and monotonic reads fix specific lag effects
- In our simulation, leader reads were not stale, random follower reads were stale 7.15 percent of the time, and pinning a client removed backwards reads but not stale ones
- Stronger models cost availability and latency, so pick them per operation, and test the promise, as the MongoDB test results show
