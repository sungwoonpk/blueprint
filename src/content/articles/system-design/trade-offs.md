> A **tradeoff** is giving up some of one thing to get more of another. In system design, almost every decision is one.

You've made tradeoffs since your algorithms class. A hash table finds a key in O(1) on average but spends extra memory. A sorted array saves that memory but needs O(log n). Neither is better. It depends on what you need.

Systems work the same way, with bigger stakes: money, uptime, and how fast your team can ship.

## Every Choice Costs Something

Look back at [From One Server to Many](/system-design/one-server-to-many). Every step fixed one problem and paid for it somewhere else. Replicas took load off the primary but let data fall behind. A queue made pages fast but added jobs that can run twice.

That's the pattern everywhere. Making a system better at one thing usually makes it worse at another, or more expensive, or harder to run.

## The Tradeoffs You'll Meet Most

A handful of tradeoffs come up again and again. Each one is a dial between two sides.

| Tradeoff | Lean One Way | Lean the Other Way |
| --- | --- | --- |
| Latency and Throughput | handle each request at once: each is fast, less done per second | batch requests: more done per second, each waits a little |
| Freshness and Speed | read the database: always current, slower | read a cache: faster, maybe out of date |
| Consistency and Availability | refuse to answer when copies may disagree: always current, sometimes down | answer anyway: always up, maybe out of date |
| Reads and Writes | do the work when data is written: cheap reads, costly writes | do the work when data is read: cheap writes, costly reads |
| Cost and Reliability | one copy of everything: cheap, one failure loses it | three copies: survives failures, costs about 3× |
| Simplicity and Flexibility | one codebase: easy to build and run, crowded as teams grow | many services: teams move on their own, harder to run |

Each of these gets its own topic later:

- [Latency and Throughput](/system-design/latency-throughput)
- [Cache Invalidation](/system-design/cache-invalidation)
- [The CAP Theorem](/system-design/cap)
- [Building News Feeds and Timelines](/system-design/feeds)
- [Redundancy and Failover](/system-design/redundancy-failover)
- [When to Split into Microservices](/system-design/monoliths-microservices)

## Let the Requirements Decide

The same tradeoff can have opposite answers. What decides it is which failure hurts more.

|  | Amazon's Shopping Cart | Concert Tickets |
| --- | --- | --- |
| Worst outcome | "add to cart" fails and the sale is lost | the same seat is sold to two people |
| Smaller problem | a removed item shows up again | a buyer sees an error and tries again |
| So it picks | availability | consistency |

Amazon built its cart this way. Its Dynamo storage system, described in a 2007 paper, was designed so "add to cart" never fails, even when servers are down, and accepts that a deleted item may occasionally come back.

The textbook app needs both answers. Browsing listings can show data a few seconds old, so a cache is fine there. Marking a book as sold can't be: two students must never buy the same copy.

## How to Decide

When you face a tradeoff, go through it in order:

1. **List the options**: at least two, or you haven't looked
2. **Pick the criteria**: what matters here, taken from the requirements
3. **Compare them side by side**
4. **Choose, and say what you give up**

Here's that for one question in the textbook app: where should listing pages read from?

|  | Primary Database | Replica | Cache |
| --- | --- | --- | --- |
| Freshness | always current | usually under a second behind | a few seconds old |
| Speed | database speed | database speed | much faster, from memory |
| Load on the primary | all of it | none | none |
| Extra parts to run | none | the replica | the cache |

Browsing doesn't need perfect freshness and gets the most traffic, so listing pages read from the cache. The "mark as sold" check reads from the primary, because only the primary is always current. We give up some freshness on browse pages and pay for one more part to run.

## Can You Undo It?

Some decisions are cheap to reverse. Others lock you in for years. Jeff Bezos described them as **two way doors** you can walk back through and **one way doors** you can't.

| Decision | Undo | Why |
| --- | --- | --- |
| How long the cache keeps data | easy | change one setting |
| Server size | easy | resize and restart |
| Adding a replica | easy | remove it again |
| Which database you use | hard | every piece of data has to move |
| How data is split across shards | hard | data has to move between machines |
| A public API others depend on | hard | other teams' code would break |

Decide two way doors quickly and change them if they turn out wrong. Slow down on one way doors: gather numbers, write it down, get a second opinion.

## Saying It Out Loud

"It depends" is true, but on its own it isn't an answer. A full answer has four parts:

- **What it depends on**: "how fresh listings must be"
- **Your pick for these requirements**: "a few seconds old is fine, so browse pages read from the cache"
- **What you give up**: "a sold book may show as available for a moment"
- **What would change your mind**: "if students complain about seeing sold books, we'd keep listings in the cache for less time"

This is what interviewers listen for, and it's how teams record decisions at work. Many teams write each one down as an **architecture decision record** (ADR): the context, the decision, and its consequences.

## Key Points

- A tradeoff gives up some of one thing to get more of another. Almost every design decision is one
- The same few come back again and again: latency and throughput, freshness and speed, consistency and availability, reads and writes, cost and reliability, simplicity and flexibility
- <u>The requirements decide which side wins</u>, by asking which failure hurts more
- Decide reversible choices fast. Slow down on the ones you can't undo
- Say what you chose, what you gave up and what would change your mind
