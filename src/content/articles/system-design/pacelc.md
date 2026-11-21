> **PACELC** extends the CAP theorem to normal operation. If there is a partition (P), a system chooses between availability (A) and consistency (C). Else (E), when the network is healthy, it chooses between latency (L) and consistency (C).

[The CAP Theorem](/system-design/cap) describes a rare moment: the network is cut in two. The textbook app's two data centers spend most of their time connected, and the theorem is silent about those hours. Yet a choice about consistency is still being made in each request, and it is paid for in milliseconds.

The database researcher Daniel Abadi gave the missing half a name in 2010. CAP leaves out latency, and latency is the reason many systems weaken consistency in the first place.

## The Extra Question

A write that must be safe in two places has to wait for the second place. If the two are in the same data center, a round trip takes about 500 microseconds, from the latency table in [Why Distributed Systems Are Hard](/system-design/why-distributed-is-hard).

If they are on two coasts, the message takes tens of milliseconds, and across an ocean it takes more than 100.

A good example is Yahoo's PNUTS database. It keeps replicas in several regions, and it gives up strict consistency, not to stay available in a partition, but to save the cost of a wide area write, which was estimated at hundreds of milliseconds.

PNUTS offers timeline consistency: replicas may lag, and they apply updates in the same order.

The result is four combinations, written as two pairs of letters:

| Label | During a Partition | Otherwise | An Example Choice |
| --- | --- | --- | --- |
| PA/EL | Stay available | Favor low latency | Dynamo, Cassandra and SimpleDB |
| PC/EC | Stay consistent | Stay consistent | Fully ACID systems with synchronous replication |
| PC/EL | Stay consistent | Favor low latency | PNUTS, which also refuses updates when an item's master is unreachable |
| PA/EC | Stay available | Stay consistent | No common example |

The labels describe defaults. Many systems let a client pick per request, as the next sections show.

## The Price of Safe Writes

To see what consistency costs when no fault is present, take the textbook app with replicas in three regions: East, West and Europe.

We assumed round trip times of 70 ms between East and West, 80 ms between East and Europe and 140 ms between West and Europe, and 2 ms to commit locally. Here is the write latency a user sees, by home region, for three designs:

| Design | User in East | User in West | User in Europe |
| --- | --- | --- | --- |
| One Leader in East, Followers Copy Later | 2 ms | 72 ms | 82 ms |
| One Leader in East, Wait for the Nearest Other Region | 72 ms | 142 ms | 152 ms |
| A Leader in Each Region, Copy Later | 2 ms | 2 ms | 2 ms |

Requiring the write to be safe in a second region adds the round trip to the nearest other region to each write, 70 ms in this case. The last design is fastest and, as in [Replication with Multiple Leaders](/system-design/replication-many-leaders), gives up the single order of writes.

Reads have a similar choice. A strong read at the East leader costs the same round trip for users far away, and a read from a nearby follower costs 2 ms and can be stale, as in [Replication Lag](/system-design/replication-lag).

## How Real Systems Expose the Choice

Systems that serve several regions publish numbers and settings for the choice, and each shows a different face of it:

- **Cosmos DB** keeps reads and writes under 10 ms at the 99th percentile for most consistency levels. The exception is strong consistency across several regions, which takes about twice the round trip between the two farthest regions plus 10 ms. Strong and bounded staleness reads consult 2 of 4 replicas and so cost twice as much, and strong across regions more than 5,000 miles apart is blocked by default. The levels are a PACELC trade, offered as a dial
- **Spanner** makes each split of data a Paxos group with a leader. The leader forwards a write to the voting replicas and commits when a majority agrees, so a write spread over several regions includes a round trip between regions. A strong read on a replica that isn't the leader has to ask the leader for a timestamp, and a strong read from the US East coast against a leader in Europe takes about 100 ms
- **DynamoDB global tables** have two modes. The default copies changes asynchronously, typically within a second or less, with last writer wins. The second writes synchronously to at least one other region before returning, so a read of any replica returns the latest item and the data loss on a failure is zero. There is no promised millisecond figure: latency depends on the regions and round trip time, so test it. The strong mode needs exactly three regions and fails a concurrent write to an item being changed elsewhere
- **Cassandra** puts the choice in each request. A level such as LOCAL_QUORUM waits for a majority in the coordinator's data center, and EACH_QUORUM waits for a majority in each, which costs a wide area round trip. A local level gives read your writes within one data center, and it is faster than a level that must reach other data centers, though less available
- **Aurora Global Database** copies to other regions with latency typically under a second, so a secondary region's reads are local and slightly behind

## Buying Back Speed with Stale Reads

Many systems offer a controlled version of staleness. Spanner's stale reads let a client name a past timestamp, or a maximum age, and 15 seconds is a reasonable value for good performance. For reads at least that old, a nearby replica can answer without a round trip to the leader.

Cosmos DB's bounded staleness promises a lag of at most a set number of writes or a time, with minimums of 10 writes or 5 seconds for a single region account, and 100,000 writes or 300 seconds for a multi region one.

In CockroachDB, stale follower reads suit regional tables by default, and global tables suit cases where fast reads in each region matter more than slower cross region writes.

The pattern is the same everywhere: let the client state how stale an answer it will accept, and pay the round trip when it won't accept any.

## The Availability Side

The first half of PACELC links to cost as well. Spanner offers 99.99 percent availability for a regional instance and 99.999 percent for multi region and dual region ones, and DynamoDB offers 99.999 percent for global tables against 99.99 percent for a single region table.

More copies in more places survive more failures, and the price is the cross region latency that the middle of this topic measured.

## Choosing Per Operation

| Operation | During a Partition | Normal Operation | Why |
| --- | --- | --- | --- |
| Search Results | Stay available | Low latency, local follower | Stale by seconds costs little |
| Reserve the Last Copy | Stay consistent | Consistent, wait for a majority | A wrong answer sells a book twice |
| Charge a Card | Stay consistent | Consistent | A double charge is hard to undo |
| Seller's Own Listings | Stay available | Local, with session stickiness | Reads of own writes matter, as in [Replication Lag](/system-design/replication-lag) |

PACELC is a better question than CAP for planning, since it applies through the day. Ask of each operation what it does when the network is cut and what it costs when the network is fine, and use a system that lets the answer vary by operation.

The formal side of these promises is in [Consistency Models](/system-design/consistency-models), and the next group of topics, on sharding, turns to spreading the data itself.

## Key Points

- PACELC adds a half to CAP: with a partition, choose availability or consistency, else choose latency or consistency
- Consistency costs round trips in normal operation: in our three region example, waiting for the nearest other region added 70 ms to each write
- <u>Systems expose the trade as settings</u>, such as Cosmos DB's levels, Cassandra's local and each quorum, and DynamoDB's two global table modes
- Stale reads buy speed back in a controlled way, as with Spanner's 15 second example and Cosmos DB's bounded staleness
- Decide per operation, and measure with your own regions, since published numbers depend on the distance between them
