> **Dynamo** is a highly available key value store that Amazon built for services that must keep accepting writes. It places keys on a ring with consistent hashing, copies each key to N nodes, lets the application choose how many copies must answer a read or a write, and keeps conflicting versions side by side with vector clocks instead of refusing one of them. It gives up strong consistency to stay available.

The textbook app lets a student keep a cart of books during registration week. At 9:00 AM thousands of carts change at once, and a student who taps "add" and sees an error will go to another site.

For this data, a failed write costs a sale and a slightly stale cart costs little. A cart that briefly shows one book too few can be repaired when the student looks again, and a cart that can't be saved can't. If a data center loses power during the rush, the cart service should still take writes.

That was Amazon's situation around 2007, with a shopping cart that had to accept an "add to cart" at any moment. The store they built, Dynamo, chose a path that most databases avoid: when the network splits, keep accepting writes on both sides, and sort out the differences later.

This topic follows that choice through the design, and tests its main ideas on small simulations of our own. It builds on [The CAP Theorem](/system-design/cap) and [PACELC](/system-design/pacelc), which name the trade, and on [Consistent Hashing](/system-design/consistent-hashing) and [Leaderless Replication and Quorums](/system-design/leaderless-replication), which supply two of its parts.

## A Store That Says Yes

Most services at Amazon read and write by primary key and need no part of the machinery of a relational database: no joins, no multi row queries. That machinery costs expensive hardware and skilled people, and the replication in such databases usually favors consistency over availability.

Two needs shaped the design. The first is availability, with an unusual yardstick for speed. A page at Amazon is built by calling over 150 services, so each one must answer quickly, and a service level target built on averages hides the unlucky customers.

The target is therefore stated on the tail: for most Dynamo users, 99.9 percent of reads and writes within 300 ms, at a stated request rate.

The second need is control. Different services want different trade offs between consistency, durability, speed and cost, so Dynamo exposes the dials and doesn't pick for them. Few other stores of the time did.

The price of the first need is that replicas can disagree. When writes keep flowing during a failure, two copies of a cart can change independently, and a store that wants to say yes has to keep both and settle them later. The rest of the design is machinery for that.

## Placing Keys on a Ring

The first problem is where a key lives. Dynamo hashes the key onto a ring and gives each node a stretch of it, the idea of [Consistent Hashing](/system-design/consistent-hashing). Adding or removing a node moves just the stretch next to it.

A node that owns one random point on the ring owns a very uneven stretch, and a fast machine gets the same share as a slow one.

The fix is **virtual nodes**: each physical node takes many positions on the ring, called tokens. A failed node's load spreads over the rest, a new node takes a little from each, and a stronger machine can take more tokens.

We measured how much tokens help in a ring of 30 nodes. The score is the mean load divided by the load of the busiest node, so 1.0 is perfect balance:

| Random Tokens per Node | Balance Score | Tokens Each Node Must Track |
| --- | --- | --- |
| 1 | 0.27 | 30 |
| 10 | 0.56 | 300 |
| 100 | 0.83 | 3,000 |
| 300 | 0.89 | 9,000 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Balance score for four token settings in a ring of 30 nodes">
<div class="hbar peak"><span>1 Token</span><span class="track"><span class="fill" style="--w: 27%"></span></span><span class="value">0.27</span></div>
<div class="hbar"><span>10 Tokens</span><span class="track"><span class="fill" style="--w: 56%"></span></span><span class="value">0.56</span></div>
<div class="hbar"><span>300 Tokens</span><span class="track"><span class="fill" style="--w: 89%"></span></span><span class="value">0.89</span></div>
<div class="hbar"><span>Equal Partitions</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">1.00</span></div>
</div>
<figcaption>Balance score of a ring of 30 nodes, 1.0 being perfect, by token scheme, from our simulation</figcaption>
</figure>

One token gave a busiest node carrying nearly four times the mean. Even 300 tokens left the busiest node about 12 percent above the mean. The cost is bookkeeping: each node tracks the tokens of the others, so the table grows with the number of tokens.

Amazon found a better scheme after running the first one in production. In the first scheme, the position of tokens decides both how data is cut and where it lives, so adding a node changes the cuts.

The fix is to separate the two: cut the ring into equal sized partitions, a number far larger than the number of nodes, and give each node an equal count of whole partitions.

We measured the same ring with 90 partitions and each node holding 3 of them, and the balance score was 1.0, with just 90 entries to track.

Fixed partitions also solved practical problems that random token ranges had caused. A joining node no longer scans the disks of others to find its keys, the repair trees don't need rebuilding each time ranges change, and a snapshot of the key space becomes a copy of whole partitions.

The lesson is the one from [Rebalancing Shards](/system-design/rebalancing): separate the partition of the data from its placement on machines, and move whole partitions.

## Copies and the Preference List

Each key is stored on N nodes, and N is chosen per instance, usually 3. The node that owns the key's position coordinates the write and also copies it to the next N minus 1 nodes clockwise.

The list of nodes that hold a key is its **preference list**, and each node can compute it, so a request can start at any node and be forwarded.

With virtual nodes, the next positions on the ring could belong to the same machine, which would put two copies on one machine. The list is built by skipping positions so that it holds distinct physical nodes, and it holds more than N of them, to leave room for failures.

A client can find a coordinator in two ways: through a load balancer, which picks any node and forwards, or with a library that knows the ring and goes straight to the coordinator.

The second saves a hop and the first saves linking code. Amazon's clients polled a random node at 10 second intervals for membership changes, which makes the library's view up to 10 seconds stale in the worst case.

## Quorums You Can Dial

A read and a write don't need the full set of N copies. Two numbers set how many must answer: W for a write and R for a read.

If R plus W is greater than N, any read set and any write set share at least one node, so a read sees the latest acknowledged write. With fewer, a read can miss it.

The common setting at Amazon was N, R and W of 3, 2 and 2. The settings trade four things, and we measured two of them.

First, availability. In a simulation where each node is down 5 percent of the time, independently, and a key lives on 3 nodes:

| Setting | Writes That Succeed, Strict | Writes That Succeed, Sloppy |
| --- | --- | --- |
| R 1, W 1 | 99.99% | 100.00% |
| R 2, W 2 | 99.26% | 100.00% |
| R 1, W 3 | 85.78% | 99.99% |

Requiring the full set of 3 copies to take a write failed 14 percent of the time, which is the cost of the strictest durability. The sloppy column is the next idea.

Second, staleness. We read 10 ms after a write that reached W copies at once, with the other copies arriving after about 50 ms on average:

| Setting | R Plus W | Stale Reads |
| --- | --- | --- |
| R 1, W 1 | 2 | 54.5% |
| R 1, W 2 | 3 | 27.5% |
| R 2, W 1 | 3 | 22.1% |
| R 2, W 2 | 4 | 0% |
| R 1, W 3 | 4 | 0% |

The pattern is the rule. When R plus W exceeds N, a read overlaps the write, and no read was stale in this case. Below it, the read often missed the new value, until the copies caught up.

Lowering W cuts the write's latency and widens the window in which a crash can lose it, since fewer nodes hold the write. The paper's own warning is that durability and availability don't move together by default: a bigger W shrinks the durability window and raises the chance of refusing a write.

## When the Home Is Down

A strict quorum fails when the home nodes are down. Dynamo uses a **sloppy quorum**: a read or write goes to the first N healthy nodes of the preference list, and those may not be the first N on the ring.

If node A is down during a write, its copy goes to the next node, D, with a hint naming A as the intended owner. D keeps hinted copies in a separate store and checks it from time to time. When A returns, D hands the copy back and deletes it.

This is **hinted handoff**, and it keeps writes succeeding through short outages without lowering the number of copies. The sloppy column of the first table is that effect: with 5 percent of nodes down, writes that needed the full 3 copies went from 85.78 percent to 99.99 percent success.

The cost is subtle. A sloppy quorum no longer guarantees that a read set overlaps a write set, since the hinted copy sits on a node outside the home group.

Until the handoff, a read of the home nodes can miss the write. Applications that want the highest availability can even set W to 1, and Amazon's services in production usually set a higher W for durability.

Hinted handoff covers temporary failures. For permanent ones, nodes compare their data with a hash tree, a Merkle tree, over each key range, which finds the keys that differ without moving the data, as explained in [Repairing Replicas with Hinted Handoff and Merkle Trees](/system-design/repairing-replicas).

## Versions and Vector Clocks

When writes continue on both sides of a split, a key can end with two versions that neither one contains the other. Dynamo treats each write as a new immutable version and tracks the history of versions with a **vector clock**: a list of pairs, a node and a counter.

A version whose counters are each at most those of another is its ancestor and can be dropped. If neither is an ancestor, they are in conflict, and both are kept.

Here is a cart going through the story, with the coordinating node's name in the clock:

| Step | Event | Version | Clock |
| --- | --- | --- | --- |
| 1 | The student adds a book through node X | D1 | X1 |
| 2 | The student adds another through X | D2 | X2 |
| 3 | A second device, through node Y, builds on D2 and adds a book | D3 | X2, Y1 |
| 4 | A third device, through node Z, builds on D2 and removes a book | D4 | X2, Z1 |
| 5 | A read finds D3 and D4, neither an ancestor of the other, and returns both | | |
| 6 | The client merges them and writes the result through X | D5 | X3, Y1, Z1 |

D2 is an ancestor of both D3 and D4, so the system could drop it by itself. D3 and D4 are on parallel branches, so Dynamo can't decide between them and hands both to the client with their clocks. The client merges and writes D5, whose clock covers both branches, which collapses the branches.

The merge for a cart is a union. That keeps each add, at a known price: a deleted item can come back, if one branch deleted it and the other still held it. Amazon accepted that trade for the cart, since a resurfaced book is a small annoyance and a lost add is a lost sale.

To show what the merge buys, we simulated a cart with 12 adds per session, each add made on a replica that shows the cart as of about half a second ago. With last writer wins, the newest write replaces the others, and any add that the newest writer hadn't seen is lost:

| Mean Gap Between Adds | Adds Lost, Last Writer Wins | Adds Lost, Merge |
| --- | --- | --- |
| 30 s | 1.5% | 0% |
| 5 s | 8.4% | 0% |
| 2 s | 18.3% | 0% |
| 1 s | 30.6% | 0% |

The merge is lossless by construction in this model, since it takes the union of what was written, and the point is the other column.

Last writer wins is the default of many systems, and it silently drops work whenever writes overlap in time, as [Detecting and Resolving Conflicts](/system-design/conflicts) explains. Dynamo's answer is to show the conflict to the application, which knows how to merge its own data.

Two details keep the clocks practical. The coordinator is usually among the top N nodes, so clocks stay short, but failures can send writes through other nodes and grow them. Dynamo stores a timestamp with each pair and, past a threshold of about 10 pairs, drops the oldest.

That can blur ancestry, which the authors noted had not shown up in production. And the number of conflicts was small: over 24 hours in the cart service, 99.94 percent of reads saw exactly one version.

## What It Costs

The design has a price list, and the original authors were direct about it.

Tail latency needed work. With the settings above, the 99.9th percentile ran around 200 ms, an order of magnitude over the average, set by load, object size and locality.

For services that needed more, each node kept a write buffer in memory and flushed it from a background thread, which cut the 99.9th percentile by a factor of 5 at peak, even with a buffer of a thousand objects.

The price was durability, since a crash loses buffered writes, so the coordinator picked one of the N replicas to do a durable write, and waited for just W answers.

Membership is full: each node knows the data of the other nodes, and gossips the whole routing table. That works for a couple of hundred nodes, and the authors named it as the limit of the design. Each Dynamo instance served one service, assumed a friendly network, and had no authentication.

And the burden moves to the developer. Conflict resolution is the application's job, and a service has to choose its reconciliation logic up front. In return, over about two years of use, the authors reported that 99.9995 percent of requests got a successful response, and that no data had been lost.

## What the Textbook App Takes From It

The ideas travel, even when the product doesn't. Cassandra, which comes next, kept the ring, the replicas and the quorums and changed the rest, and a managed store like DynamoDB shares the name and few of the internals.

| Need | Decision |
| --- | --- |
| Student Carts | A key value store with N 3, R 2 and W 2, sloppy quorum on |
| Conflicts | Merge by union, and a nightly job that drops items removed on any device |
| Placement | Equal sized partitions, with partitions as the unit of moves and repair |
| Hot Carts | Measure the tail, and add a small write buffer if the 99.9th percentile needs it |
| Data That Needs Ordering | Orders and payments stay in PostgreSQL, where a conflict can't be merged |
| Repair | Hinted handoff for short outages, and a scheduled tree comparison for the rest |

## Pitfalls

- **R plus W at most N, with a belief in fresh reads**: A read can miss the newest write
- **Last writer wins on data that should merge**: Overlapping writes silently drop work
- **A sloppy quorum treated as a strict one**: A hinted copy is outside the group a read checks
- **A union merge for data with deletes**: Removed items come back
- **One random token for each node**: The busiest node carries several times the mean
- **A full membership table at large scale**: The gossip load grows with the cluster
- **Treating durability and availability as the same dial**: A bigger W protects the write and refuses more of them

## Key Points

- Dynamo gives up strong consistency to stay writable: it keeps accepting writes during failures, keeps conflicting versions, and leaves the merge to the application
- Keys go on a ring with virtual nodes and are copied to the next N nodes: in our ring of 30 nodes, 1 random token gave a balance score of 0.27, 300 gave 0.89, and equal sized partitions gave 1.0
- R and W are dials: with R plus W above N no read was stale in our test, and below it 22 to 55 percent of reads right after a write were
- <u>A sloppy quorum plus hinted handoff keeps writes succeeding</u>: with 5 percent of nodes down, writes that needed the full 3 copies rose from 85.78 percent to 99.99 percent success, at the price of weaker overlap between reads and writes
- Vector clocks tell ancestry from conflict, and a merge by the application keeps each add: in our cart model, last writer wins lost 18.3 percent of adds when they arrived 2 seconds apart
