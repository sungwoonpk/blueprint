> A **tradeoff** is giving up some of one thing to get more of another. In system design, almost every decision is one.

You've made tradeoffs since your algorithms class. A hash table finds a key in O(1) on average but spends extra memory. A sorted array saves that memory but needs O(log n). Neither is better. It depends on what you need.

Systems work the same way, with bigger stakes: money, uptime, and how fast your team can ship.

## Choices Come With Costs

Look back at [From One Server to Many](/system-design/one-server-to-many). Every step fixed one problem and paid for it somewhere else. Replicas, extra copies of the database that serve reads, took load off the primary but let data fall behind. A queue, a line of jobs for workers to do later, made pages fast but added jobs that can run twice.

That's the pattern everywhere. Making a system better at one thing usually makes it worse at another, or more expensive, or harder to run.

## The Tradeoffs You'll Meet Most

A handful of tradeoffs come up again and again. Each one is a dial between two sides. Take how long a cache keeps a copy of the data:

<figure class="diagram">
<div class="scale">
<div class="line"></div>
<div class="dot" style="--x: 5%"><span>No Cache</span></div>
<div class="dot" style="--x: 40%"><span>10 Seconds</span></div>
<div class="dot" style="--x: 95%"><span>5 Minutes</span></div>
<div class="ends"><span>Always current, more database load</span><span>Faster, less database load</span></div>
</div>
<figcaption>One dial: how long a cache keeps a copy</figcaption>
</figure>

The same shape shows up in each row below.

| Tradeoff | Lean One Way | Lean the Other Way |
| --- | --- | --- |
| Latency and Throughput | Handle each request at once: each is fast, less done per second | Batch requests: more done per second, each waits a little |
| Freshness and Speed | Read the database: always current, slower | Read a cache: faster, maybe out of date |
| Consistency and Availability | Refuse to answer when copies may disagree: always current, sometimes down | Answer anyway: always up, maybe out of date |
| Reads and Writes | Do the work when data is written: cheap reads, costly writes | Do the work when data is read: cheap writes, costly reads |
| Cost and Reliability | One copy of everything: cheap, one failure loses it | Three copies: survives failures, costs about 3× |
| Simplicity and Flexibility | One codebase: easy to build and run, crowded as teams grow | Many services: teams move on their own, harder to run |

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
| Worst outcome | "add to cart" fails and the sale is lost | The same seat is sold to two people |
| Smaller problem | A removed item shows up again | A buyer sees an error and tries again |
| So it picks | Availability | Consistency |

Amazon built its cart this way. Its Dynamo storage system, described in a 2007 paper, was designed to keep accepting "add to cart" even when servers or networks fail, and accepts that a deleted item may occasionally come back.

The textbook app, our running example of students trading used books, needs both answers. Browsing listings can show data a few seconds old, so a cache is fine there. Marking a book as sold can't be: two students must never buy the same copy.

## How to Decide

When you face a tradeoff, go through it in order:

1. **List the options**: at least two, or you haven't looked
2. **Pick the criteria**: what matters here, taken from the requirements
3. **Compare them side by side**
4. **Choose, and say what you give up**

Here's that for one question in the textbook app: where should listing pages read from? The options are the primary database, which takes every write, a replica, a copy that serves reads, and a cache, a fast copy kept in memory.

|  | Primary Database | Replica | Cache |
| --- | --- | --- | --- |
| Freshness | Always current | Usually under a second behind | Up to 10 seconds old |
| Speed | Database speed | Database speed | Much faster, from memory |
| Reads the Primary Handles | All of them | None | Only cache misses |
| Extra Parts to Run | None | The replica | The cache |

Browsing doesn't need perfect freshness and gets the most traffic, so listing pages read from the cache. The "mark as sold" check reads from the primary, because only the primary is always current. We give up some freshness on browse pages and pay for one more part to run.

## Can You Undo It?

Some decisions are cheap to reverse. Others lock you in for years. Jeff Bezos described them in a letter to Amazon's shareholders as **two way doors** you can walk back through and **one way doors** you can't.

Easy to undo:

- How long the cache keeps data: change one setting
- Server size: resize and restart
- Adding a replica: remove it again

Hard to undo:

- Which database you use: every piece of data has to move
- How data is split across shards, the sharding from [From One Server to Many](/system-design/one-server-to-many): data has to move between machines
- A public API others depend on: other teams' code would break

Decide two way doors quickly and change them if they turn out wrong. Slow down on one way doors: gather numbers, write it down, get a second opinion.

## Saying It Out Loud

"It depends" is true, but on its own it isn't an answer. A full answer has four parts:

- **What it depends on**: "how fresh listings must be"
- **Your pick for these requirements**: "a few seconds old is fine, so browse pages read from the cache"
- **What you give up**: "a sold book may show as available for a moment"
- **What would change your mind**: "if students complain about seeing sold books, we'd keep listings in the cache for less time"

This is what interviewers often listen for, and it's how teams record decisions at work. Many teams write each one down as an **architecture decision record** (ADR): the context, the decision, and its consequences. The cache decision from above could read:

```markdown
# ADR 7: Serve listing pages from a cache

Context: Browsing is most of our traffic and
can be a few seconds old.

Decision: Listing pages read from a cache kept
for 10 seconds. "Mark as sold" reads the primary.

Consequences: A sold book may show as available
for up to 10 seconds. We run one more service.
```

## Key Points

- A tradeoff gives up some of one thing to get more of another. Almost every design decision is one
- The same few come back again and again: latency and throughput, freshness and speed, consistency and availability, reads and writes, cost and reliability, simplicity and flexibility
- <u>The requirements decide which side wins</u>, by asking which failure hurts more
- Decide reversible choices fast. Slow down on the ones you can't undo
- Say what you chose, what you gave up and what would change your mind
