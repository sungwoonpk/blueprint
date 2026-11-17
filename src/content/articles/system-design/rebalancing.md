> **Rebalancing** moves data, and the load that comes with it, from one node to another when nodes are added or removed, or when some nodes carry more than their share. A good rebalance moves little data, keeps serving requests while it runs, and can be undone.

The textbook app's 6 shards hold a lot of photos: 3 million listings with 3 photos of 300 KB each is about 2.7 TB. Registration day is a month away, and each shard is near its limit.

The plan is to add a seventh node and give it a fair share of the data, with the site up the whole time.

[Sharding Strategies](/system-design/sharding) closed with a warning that the shard count is a long term decision. This topic is about what happens when it has to change.

## When to Rebalance

Three events trigger a move, and systems detect them differently.

The first is a change in capacity. When a node is added or removed, Cassandra's new node streams the ranges it will own from the current owners, and a decommissioned node streams its data to the new ones.

The second is an imbalance in data. MongoDB's balancer treats a collection as balanced when the data difference between shards is under three times the range size, so with the default of 128 MB, a move needs at least a 384 MB difference.

The third is an imbalance in load or space. Elasticsearch relocates shards by disk use, with a low watermark at 85 percent, where new shards are not allocated to the node, a high one at 90 percent, where shards move off it, and a flood stage at 95 percent, where indices on it are blocked from writes.

CockroachDB doesn't choose a store above 92.5 percent full as a target, and at 95 percent replicas are moved off it.

## Moving Little: Why Not Hash Modulo

The simplest placement, node number equals hash modulo the node count, moves almost everything when the count changes. In our test over 200,000 keys, going from 6 to 7 nodes moved 85.8 percent of them, and doubling from 6 to 12 moved 49.8 percent.

The fix, used almost everywhere, is to separate the key from the node with a fixed layer in between and move whole units:

| Scheme | Moved When Adding a Seventh Node | Notes |
| --- | --- | --- |
| Hash Modulo Node Count | 85.8% | Almost everything moves |
| Ring With 1 Token Per Node | 18.4% | Uneven, the busiest node held 1.55 times its share |
| Ring With 16 Tokens Per Node | 20.5% | Still uneven, 1.64 times |
| Ring With 100 Tokens Per Node | 14.0% | 1.13 times |
| Ring With 256 Tokens Per Node | 14.2% | 1.06 times |
| 60 Logical Shards Moved Whole | 13.3% | From the sharding topic: 8 of 60 move |

The ideal is one seventh, 14.3 percent. Cassandra's tokens are the ring rows: 256 tokens per node is a reasonable default, and many tokens have a cost: more neighbors for each token and slower repair.

Redis Cluster uses fixed slots: 16,384 hash slots, with the slot of a key being CRC16 of the key modulo 16,384, and each node owning some slots. Resharding moves slots.

Notion has 480 logical shards on its physical databases, and chose 480 because it divides evenly by many numbers, so hosts can grow from 32 to 40 or 48 and the shards come out even. [Consistent Hashing](/system-design/consistent-hashing) explains the ring idea in more depth.

## Ways to Choose What Moves

Systems differ in who decides what moves. Some use fixed units that the system moves: Redis slots, Notion's logical shards, Elasticsearch shards. Others use units that split and merge.

MongoDB cuts data into ranges that split as they grow and moves them, and CockroachDB splits a range at its default size, merges small neighbors, and rebalances replicas across stores.

Cassandra uses tokens that follow the nodes, so token ranges change as nodes join and leave.

And Kafka leaves the plan to a person: its reassignment tool moves partitions between brokers, but it can't study the data distribution by itself, so the administrator must choose what to move. It generates a candidate plan, executes it, and verifies it.

## Moving Without Stopping

Each system follows one pattern: copy what exists, catch up the changes that arrived during the copy, switch the owner, and clean up. MongoDB's steps show it in detail:

<figure class="diagram">
<div class="flow">
<div class="node">Copy<small>the range</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Catch Up<small>new changes</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Switch<small>brief pause</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Clean Up<small>old copy</small></div>
</div>
<figcaption>Most of the work happens while the old owner keeps serving, and the switch is short</figcaption>
</figure>

In MongoDB, the destination builds any missing indexes and copies the documents, while writes to the range still go to the source. It then applies the changes made during the copy.

The source then updates the cluster metadata to name the new owner, and reads and writes to that collection are briefly paused during that update. The source deletes its copy later, once no cursors are open on it, and the balancer doesn't wait for that cleanup before starting the next move.

Redis shows a finer grained version. The target marks a slot as importing and the source marks it as migrating. The source keeps serving keys it still has and redirects requests for missing keys with an ASK reply to the target, so no new keys appear on the source.

Keys move in batches, each batch atomically, and the source deletes its copy after the target confirms. A MOVED reply, in contrast, tells clients that a slot has permanently moved so they update their maps.

Vitess's resharding adds checks and a way back. A copy phase builds each target shard with consistent snapshots, and catch up phases replay the binary log between copy cycles. A comparison tool, VDiff, checks source and target row by row.

The switch makes the source stop accepting writes, waits for replication to catch up, with a 30 second timeout by default, and lets the proxy buffer queries during the pause.

By default it also sets up reverse replication, so traffic can be switched back if something is wrong. Completing the move removes the source tables unless told to keep them.

Elasticsearch builds the new copy of a shard on the target node and deletes the old one after the new one is allocated and recovered.

## How Long It Takes

Moving data takes time, and a limit on the speed protects the foreground. Taking one seventh of the textbook app's 2.7 TB gives 386 GB to move:

| Limit | Time to Move 386 GB |
| --- | --- |
| Elasticsearch default of 40 MiB a second for recovery | About 2.6 hours |
| An example throttle of 50 MB a second | About 2.1 hours |

During the first, with 3,000 writes a second and one seventh of them landing in the moving data, about 4 million changes arrive that the catch up phase must replay. A replay rate far above the arrival rate drains them in minutes, which is why the switch can be short.

Limits protect the cluster from the move itself. Elasticsearch defaults to 2 concurrent rebalances in a cluster and 2 concurrent recoveries on a node.

MongoDB lets a shard take part in one migration at a time, with at most half as many simultaneous migrations as there are shards, and offers a balancing window so moves run at night.

Kafka's tool takes a throttle in bytes per second, and the throttle must be cleared after the move, which the verify step does.

## What Can Go Wrong

Moves go wrong in a few familiar ways. A move can starve the live traffic: without a throttle, the copy competes with queries for disk and network, so use the limits above and move during quiet hours.

A move in a failing cluster is risky too. Cassandra's bootstrap streams from the primary replica for consistency, and fails if a replica is down, unless an override accepts the risk of missing data. And old data lingers: Cassandra's old owners keep data until an operator runs cleanup, and it still counts toward their load.

Detection can trigger mass movement. If a false alarm from [Failure Detection and Gossip](/system-design/failure-detection) starts a rebalance, a healthy node's data is copied without need, so pair a quick suspicion with a slow decision, as Kubernetes does with its 5 minute wait before eviction.

Finally, rebalancing doesn't cure a hot key. Moving a range to a quiet node helps, and a single key that is too busy for any node needs a different key, as in the sharding topic. Notion's expansion from 32 to 96 hosts cut peak CPU and I/O to near 20 percent and exposed a few outlier workspaces.

## Automatic or by Hand

| Choice | Fits |
| --- | --- |
| Automatic Balancer With a Window | A stable system with tested limits, like MongoDB's balancer |
| Operator Plan, Executed by a Tool | High risk moves, as with Kafka, and rare changes |
| Online Resharding Workflow With Checks | Changing the number of shards, as with Vitess |

For the textbook app, the plan is to add the seventh host a few weeks before registration day. 60 logical shards move 8 of them to the new host, at a throttle, outside peak hours.

The data is compared, writes are briefly buffered at the switch, and reverse replication stays on for a few days in case of a surprise. Replicas of the moved shards come with them, as in [Single Leader Replication](/system-design/replication-one-leader).

## Key Points

- Rebalancing moves data when nodes change or load is uneven, and it has to keep serving traffic and be reversible
- <u>Don't place keys by hash modulo the node count</u>: adding a seventh node moved 85.8 percent of keys, against about 14 percent for a ring with 100 or more tokens and 13.3 percent for moving whole logical shards
- Live moves copy, catch up, switch and clean up, with a short pause at the switch, and the better tools add comparison and a way back
- Throttle the move: 386 GB at 40 MiB a second takes about 2.6 hours, and limits on concurrent moves protect the foreground
- Automatic rebalancing needs careful triggers, since a false alarm can start a large copy without need
