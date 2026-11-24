> **Cassandra** is a distributed database that joins two older designs: Dynamo's ring of equal peers, with replication and tunable consistency, and Bigtable's data model and storage engine, with column families, a commit log, memtables and SSTables. There is no master, any node can take any request, and conflicts are settled by the newest timestamp.

Facebook had a search problem in 2008. People wanted to search their message inbox, which meant billions of writes a day, reads in tens of milliseconds, and users served from data centers on two coasts.

To launch the feature, they first indexed 7 TB of inbox data for over 100 million users, then kept it fresh as messages arrived.

Neither parent design fit alone. Dynamo had the availability and the replication, and it offered just a key and a blob, with conflicts left to the application.

Bigtable had the rich rows and the fast storage engine, and it leaned on a single master and a file system underneath. Cassandra took the ring and replicas from one and the rows and storage engine from the other.

This topic follows what each parent contributed, then covers the parts Cassandra added: a failure detector that adapts, consistency set for each request, and the housekeeping that a leaderless database needs, including the surprising way that a deleted row can come back. It builds on [Dynamo](/system-design/dynamo) and [Bigtable](/system-design/bigtable), and the ideas of [Leaderless Replication and Quorums](/system-design/leaderless-replication).

## Peers on a Ring

A Cassandra cluster is a ring of equal nodes. A key is hashed to a position, and the node that owns that position is the coordinator for the key, with the next nodes clockwise holding the other copies.

A client can send a request to any node, and that node finds the owners and forwards it. No node in the path is special, so no single node is a point of failure.

Where Dynamo gave each machine many tokens, the first Cassandra gave each node one position and moved lightly loaded nodes to relieve busy ones. The reason was simplicity: it made load balancing choices deterministic. Later versions moved toward virtual nodes, since moving a node carries a lot of data in one step, as [Rebalancing Shards](/system-design/rebalancing) explains.

The number of copies, the replication factor, is set for each keyspace. For a single data center, replicas are the next nodes on the ring, with an attempt to place them on different racks.

For several data centers, a topology aware strategy takes a replication factor for each data center and spreads copies so that the loss of a whole site leaves the others intact. The simple strategy, which ignores data centers and racks, is meant for tests.

## The Bigtable Half

A table is a map indexed by a row key, with columns grouped in families, as in [Bigtable](/system-design/bigtable). The query language today speaks of a **partition key**, which decides the node, and **clustering columns**, which sort the rows inside a partition. Together they identify a row.

The shape of the key is a design decision, and it is made by the query. Take the messages of the textbook app. A student opens a conversation and wants the latest 50 messages.

The table is keyed by the conversation as the partition key and the send time as the clustering column, so one conversation is stored together and already sorted:

| Partition Key | Clustering Column | Cells |
| --- | --- | --- |
| conv-4821 | 09:02:11 | sender, text |
| conv-4821 | 09:02:40 | sender, text |
| conv-4821 | 09:03:05 | sender, text |
| conv-4822 | 09:00:50 | sender, text |

The latest 50 messages are one read of the end of one partition on one node, and no other query shape is cheap.

Wanting "the messages from this seller" means a second table with the seller as the partition key, filled by the application. The rule is the one from [Data Modeling](/system-design/data-modeling) turned around: design the tables for the queries, and copy data to serve each one.

The write path is the one from Bigtable. A write goes to a commit log for durability and into an in memory sorted table, the memtable.

When the memtable fills, it is written out as an immutable sorted file, an SSTable, and files are merged in the background. A read checks the memtable and then the files, newest first, with a Bloom filter on each file to skip those that can't hold the key.

The commit log is shared by the tables, and its sync mode matters: in the default periodic mode a write is acknowledged before the disk sync, and in batch mode a write is acknowledged after it. The first design wrote the log to a dedicated disk, since log writes are sequential, and rolled it at 128 MB.

The choice of similar sized files for a merge came straight from the original description: files are merged when they are close in size, so a very large file is not rewritten for a small one.

Our measurements in [Bigtable](/system-design/bigtable) show why. Merging four similar files rewrote each entry about 3.5 times, against about 30 for merging into one file on each flush.

## One Timestamp Per Cell

The biggest difference from Dynamo is how conflicts are settled. Dynamo kept conflicting versions with vector clocks and asked the application to merge them. Cassandra gives each cell a timestamp, and the newest timestamp wins, for writes and for deletes alike. There is no merge to run and no work left for the application.

The simplicity has a price, which we measured in [Dynamo](/system-design/dynamo). With a cart stored as one value, last writer wins lost 8.4 percent of adds when they came 5 seconds apart, and 18.3 percent at 2 seconds.

Cassandra avoids most of that with the data model, as long as you use it well: store each item of the cart as its own cell, under its own clustering key.

Two devices adding two different books write different cells, and no cell conflicts. A conflict happens when two writes touch the same cell, and then the newer one rightly wins.

There are two other costs of timestamps. They come from clocks, and clocks drift, as [Physical and Logical Clocks](/system-design/clocks) explains, so a write from a machine with a fast clock can win against a later write from a machine with a slow one.

And a write doesn't need a read first, which is a benefit. The original authors pointed out that a system that must read before it writes, to manage version stamps, is limited under a very high write rate.

## Dialing Consistency for Each Request

Dynamo set N, R and W for a whole instance. Cassandra lets the client choose the level on each request. A write goes to the full set of replicas, and the level controls how many answers the coordinator waits for. The common levels:

| Level | The Coordinator Waits For |
| --- | --- |
| ONE | One replica |
| QUORUM | A majority of the replicas, n divided by 2 plus 1 |
| LOCAL_QUORUM | A majority in the local data center |
| EACH_QUORUM | A majority in each data center |
| ALL | The full set of replicas |

The rule is Dynamo's: if the replicas that answer a read and the replicas that answer a write overlap, which means R plus W is greater than the replication factor, the read sees the write.

QUORUM for both reads and writes guarantees it. LOCAL_QUORUM gives a weaker guarantee, that reads see the latest write within the same data center.

The levels change the cost of a request when data centers are far apart. Take two data centers with 3 replicas each, a 2 ms local commit and the 70 ms round trip between them, the numbers we used in [PACELC](/system-design/pacelc):

| Level | Replicas Needed | Our Latency Estimate |
| --- | --- | --- |
| ONE or LOCAL_QUORUM | 1 or 2, local | About 2 ms |
| QUORUM | 4 of 6, so at least one remote | About 72 ms |
| EACH_QUORUM | 2 local and 2 remote | About 72 ms |

QUORUM across two data centers needs 4 of 6 replicas, and just 3 live nearby, so each request crosses the ocean. That is why most multi data center deployments read and write at LOCAL_QUORUM and accept that a read in one data center can trail a write in another by the replication delay.

## Keeping Replicas Together

Replicas drift, and Cassandra has three tools against it. They work in a cascade, each catching what the one before missed.

**Hinted handoff** is the first. When a replica is down during a write, the coordinator keeps a hint and replays it when the node returns.

Hints are best effort and have a time limit: by default a node gets hints for 3 hours after it fails. After that, the replica stays out of sync until a read repair or a repair job fixes it.

**Read repair** is the second. When a read at QUORUM compares the answers of replicas and finds a difference, the coordinator writes the newest value to the replicas that were behind, before it answers.

In the default blocking mode, the read doesn't return until the repair reaches the level. A read at ONE doesn't trigger it, since one replica was asked.

**Anti entropy repair** is the third, and the one that finds data nobody reads. Nodes compare Merkle trees, as in [Repairing Replicas with Hinted Handoff and Merkle Trees](/system-design/repairing-replicas), over their shared ranges and stream the differences.

It isn't automatic. An operator runs it with a tool, and the recommended cadence is an incremental repair at intervals of one to three days and a full one at intervals of one to three weeks.

## The Dead Data That Comes Back

A delete in Cassandra is a write. Since SSTables are immutable, a delete adds a marker called a **tombstone**, with its own timestamp, and the marker hides older values until a merge removes both. The tombstone has to live long enough to reach each replica, so it is kept for a grace period, 10 days by default.

That sets a rule that each operator has to learn. If a replica misses a delete, comes back after the tombstones elsewhere have expired, and still holds the old value, no marker remains that says the value was deleted. The old value looks like valid data, it spreads by read repair, and the deleted row is back.

Here is the story for the textbook app, with a seller who removes a listing that contains a phone number:

| Day | Event | What a Read Finds |
| --- | --- | --- |
| 0 | The listing is deleted while node C is down, and nodes A and B record a tombstone | The listing is gone |
| 0 | The 3 hour hint window ends, and C is still down | The listing is gone |
| 2 | C returns, and no repair has run | A read at QUORUM still finds the tombstone and hides the listing |
| 10 | The tombstones on A and B expire and are purged by compaction | A and B hold no trace, and C holds the old listing |
| 11 | A read at QUORUM that includes C finds a value there and no trace on A and B | The listing is back, and read repair copies it to A and B |

The rule that follows is the one the operating guidance gives: run repair on each node within the grace period, and with the default of 10 days, at least once in 7 days.

Deletes are the reason, and a missing repair can also lose data as nodes are replaced. For data that holds personal information, a zombie row is a privacy problem too, which is the concern of [Data Privacy and Compliance](/system-design/privacy).

## Failure Detection That Adapts

A leaderless system has no master to say that a node is down, so each node decides for itself, from gossip. Nodes exchange state about once a second, and each node records when it last heard from each other node.

The easy detector is a fixed timeout, and it has an awkward trade. A short timeout declares nodes dead during a busy moment, and a long one takes minutes to notice a real failure.

The original team tried the simple detectors and found the time to notice a failure grew with the cluster size, to about two minutes in a test with 100 nodes, which they called unworkable.

They used an **accrual failure detector** instead. It doesn't answer up or down. It reports a suspicion level, Φ, on a scale that adjusts to what the network has been doing. At Φ of 1 the chance of being wrong is about 10 percent, at 2 about 1 percent, and each step divides the chance by ten.

Each node keeps a window of the gaps between heartbeats from each other node and computes Φ from that distribution, for which the exponential distribution fit gossip better than the normal one. With a threshold of 5, the 100 node test noticed a dead node in about 15 seconds on average.

We simulated it with heartbeat gaps that average 1 second, and then slowed the network to 4 seconds on average, as in a busy hour. The first table gives the time to suspect a dead node at the usual speed, and the chance of a false alarm in one gap:

| Threshold Φ | Time to Suspect a Dead Node | False Alarm in One Gap |
| --- | --- | --- |
| 1 | 2.3 s | 1 in 10 |
| 3 | 6.9 s | 1 in 1,000 |
| 5 | 11.5 s | 1 in 100,000 |
| 8 | 18.4 s | 1 in 100 million |

Our 11.5 seconds for Φ of 5 is consistent with the 15 seconds reported for a real cluster. The adaptive part shows when the network slows down. We measured the share of heartbeat gaps that ended in a false suspicion of a live node:

| Detector | Normal Network | Network 4 Times Slower |
| --- | --- | --- |
| Fixed Timeout of 5 s | 0.65% | 28.4% |
| Fixed Timeout of 10 s | 0.007% | 8.1% |
| Fixed Timeout of 20 s | 0% | 0.68% |
| Accrual, Φ of 5 | 0% | 0.003% |

The fixed timeouts were tuned for the fast network and broke on the slow one, and the 20 second timeout that survives is slow to notice a real failure.

The accrual detector scaled its patience with the observed gap, so it kept its false alarm rate low, and its detection time grew to 46 seconds on the slow network, which is the honest price of not crying wolf. The broader subject is in [Failure Detection and Gossip](/system-design/failure-detection).

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Messages | Partition key the conversation, clustering column the send time, one read for the latest page |
| Seller View | A second table keyed by seller, filled by the application, since there is no join |
| Carts and Wish Lists | One cell for each item, so concurrent adds from two devices don't collide |
| Consistency | LOCAL_QUORUM in each data center, with ONE for search suggestions that may be stale |
| Deletes | Repair each node at least once in 7 days, to stay inside the 10 day grace period |
| Failure Detection | The accrual detector with a threshold of 8 on a noisy network, and 5 on a quiet one |
| Orders and Payments | Stay in PostgreSQL, where a transaction and a join are needed |

## Pitfalls

- **Modeling the tables like a relational schema**: each new query then needs a scan of the whole cluster
- **A cart stored as one value**: last writer wins drops concurrent adds
- **QUORUM across far apart data centers**: each request pays the ocean crossing
- **Skipping repair**: hints expire after 3 hours, and tombstones expire after 10 days
- **Reading at ONE and expecting fresh data**: it doesn't overlap a write and doesn't repair
- **A fixed failure timeout on a network that changes**: false alarms in busy hours, or slow detection
- **Counting on clocks for ordering**: a fast clock wins against a later write

## Key Points

- Cassandra pairs Dynamo's leaderless ring and replicas with Bigtable's data model and storage engine: a commit log, a memtable and immutable SSTables merged in the background
- The partition key picks the node and the clustering columns sort the rows, so tables are designed for the queries, with data copied into one table for each query
- Conflicts go to the newest cell timestamp, which is simple and loses concurrent writes to one cell, so one cell for each item avoids the loss: our cart model lost 8.4 percent of adds at a 5 second gap with one value and zero with one cell for each item
- <u>Repair inside the grace period</u>: hints last 3 hours, read repair needs a read at a level above ONE, and a deleted row can return once tombstones expire after 10 days
- An accrual failure detector scales with the observed gap: at Φ of 5 it suspected a dead node after 11.5 seconds in our model, and on a network 4 times slower it made 0.003 percent false alarms, against 8.1 percent for a fixed 10 second timeout
