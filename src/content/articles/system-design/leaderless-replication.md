> In **leaderless replication**, any replica accepts writes. A client, or a coordinator node acting for it, sends each write to each of the N replicas of a key and waits for W to acknowledge, and a read asks R replicas and keeps the newest answer. When R plus W is greater than N, the replicas that were written and the replicas that are read must overlap.

[Single Leader Replication](/system-design/replication-one-leader) had a weak moment: when the leader dies, writes stop until someone notices and promotes another node, and two nodes that both claim to lead cause trouble.

Amazon's engineers built the Dynamo store for services such as the shopping cart, where that pause was unacceptable, and the answer was to have no leader.

For the textbook app, think of the "viewed" counters and the saved searches that must accept writes during failures. Cassandra and Riak followed the same design.

## Write to the Replicas, Wait for Some

A key is stored on N replicas, usually 3. A write goes to each of the N replicas, and the writer treats it as done after W have acknowledged.

A read goes to R replicas and returns the newest version among their answers. In Cassandra, writes go to the full set of replicas, and the consistency level just sets how many acknowledgments the coordinator waits for.

<figure class="diagram">
<p class="rowname">Write With W = 2</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node hot">A: New</div>
<div class="node hot">B: New</div>
<div class="node wait">C: Old</div>
</div>
</div>
<p class="rowname">Read With R = 2</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">B: New</div>
<div class="node">C: Old</div>
</div>
<div class="arrow wide" data-label="keep the newest" aria-hidden="true"></div>
<div class="node hot">New</div>
</div>
<figcaption>Any two of three replicas share at least one that has the latest write</figcaption>
</figure>

With N = 3, W = 2 and R = 2, a read set of any 2 replicas shares at least one member with the write set. That is the point of the rule R plus W greater than N.

How the reader knows which answer is newest is a separate question: Dynamo attaches a vector clock to each version, as in [Physical and Logical Clocks](/system-design/clocks), and Cassandra uses a timestamp on each write.

## Choosing R and W

The numbers are knobs, and each setting trades latency, safety and availability. The latency of a read or write is set by the slowest of the R or W replicas, so R and W are usually below N, and Dynamo's common configuration was (N, R, W) = (3, 2, 2).

| Setting for N = 3 | Reads See the Latest Write? | Cost |
| --- | --- | --- |
| W = 1, R = 1 | Not guaranteed | Fastest, and stale reads are likely just after a write |
| W = 2, R = 2 | Yes, by overlap | Each operation waits for the second fastest replica |
| W = 3, R = 1 | Yes | Slow writes, and a write fails if one replica is down |
| W = 1, R = 3 | Yes | Fast writes, slow reads, and a read fails if one replica is down |

Riak's defaults are N = 3, with R and W set to a quorum, a majority, which is 2 for 3. Cassandra's levels include ONE, TWO, THREE, QUORUM, which is a majority, a level that needs each replica, and local versions of these for one data center.

How stale can a partial setting be? The PBS paper by Peter Bailis and colleagues measured it for production systems, and we ran our own simulation of N = 3.

A write reached each replica after about 5 ms on average, with 1 percent of deliveries delayed by 50 to 200 ms. The table shows the chance that a read started t ms after the write was acknowledged sees it:

| Setting | t = 0 | t = 5 ms | t = 50 ms | Write Ack, Mean |
| --- | --- | --- | --- | --- |
| R = 1, W = 1 | 52.3% | 82.0% | 99.0% | 2.5 ms |
| R = 2, W = 1 | 83.7% | 97.6% | 100% | 2.6 ms |
| R = 1, W = 2 | 77.1% | 91.2% | 99.1% | 5.4 ms |
| R = 2, W = 2 | 100% | 100% | 100% | 5.3 ms |

Reading from 2 replicas instead of 1 raised the first read from 52 percent to 84 percent at almost no cost in write time. The overlapping setting did not miss, and its writes wait about twice as long.

A study of probabilistically bounded staleness (PBS) found the same pattern in fits to production data.

For one environment, R = W = 1 gave fast operations and a 99.9 percent consistency window of 1,364 ms, while R = 2 and W = 1 cut the window to 202 ms and kept latency 81.1 percent below the fastest strict quorum.

It also found that switching a LinkedIn store from spinning disks to SSDs shrank the window from 45.5 ms to 1.85 ms, because the variance of write delay is what drives staleness.

## When a Replica Is Down

A strict quorum has a cost: with W = 2 of 3 specific replicas, two of them being down blocks the write.

If each node is down 1 percent of the time, we calculated writes available 99.9999 percent of the time at W = 1, 99.97 percent at W = 2, and 97.03 percent at W = 3.

Dynamo's answer is the **sloppy quorum**. It sends reads and writes to the first N healthy nodes on the key's preference list, which may not be the first N nodes that own the key.

If node A is down, its replica goes to node D, with a hint saying that A was the intended owner. D keeps hinted replicas in a separate store, and when it sees that A is back, it delivers the data and deletes its copy.

Cassandra's version is hinted handoff. The coordinator stores a hint on its disk for an unavailable replica and replays it when the replica returns, within a window called `max_hint_window` that defaults to 3 hours. Hints are best effort and no substitute for repair. A node that is down longer stays out of date until repair.

The price of a sloppy quorum is the overlap. The W replicas may be fallback nodes, so a reader that asks the owners can miss the write, and R plus W greater than N no longer guarantees anything.

Riak offers primary read and write counts, PR and PW, which count the real owners alone and give a strict quorum when set above zero. They default to 0.

## Keeping Replicas in Sync

Without a leader's log, replicas have to fix each other. Cassandra uses three mechanisms:

- **Read repair**: When a read finds replicas that disagree, the coordinator writes the newest version to the stale ones. The default option blocks the response until the repair satisfies the consistency level. It happens for levels above ONE
- **Hinted handoff**: Writes that missed a replica are delivered when it returns, as above
- **Anti-entropy repair**: A background comparison of replicas with Merkle trees, which finds the rows that differ without sending the full data

The last is the subject of [Repairing Replicas with Hinted Handoff and Merkle Trees](/system-design/repairing-replicas). Failure detection that decides a node is gone uses gossip and the phi accrual detector from [Failure Detection and Gossip](/system-design/failure-detection).

## Quorums Are Not Transactions

A quorum overlap says that a read touches a replica with the latest write. It doesn't say that two concurrent writes are ordered, and the systems resolve them with timestamps or vector clocks.

Cassandra uses last write wins, and its correctness depends on clock synchronization. Dynamo returns several versions to the application when its vector clocks show concurrent updates, and merging two shopping carts is the classic case.

Kyle Kingsbury's Jepsen tests show what last write wins can cost. In one test of Cassandra, a lock service serialized updates to a single cell at the QUORUM level, and during a partition, 285 of the 1,009 acknowledged writes, 28.2 percent, were later missing.

In a test of Riak with last write wins and a healthy cluster, with no partition, concurrent read modify write updates to one key lost 1,434 of 2,000 acknowledged writes.

The same test with a perfect lock lost no writes, and a version using a set that merges concurrent updates lost no writes either. The lesson is that a quorum protects against a failed node and doesn't protect concurrent writers from each other. That is the subject of [Detecting and Resolving Conflicts](/system-design/conflicts) and [CRDTs](/system-design/crdts).

For true compare and set, Cassandra offers lightweight transactions, which are linearizable and built on Paxos. They cost more, and they are the exception. The overall choice: Cassandra favors availability and partition tolerance, and settles for eventual consistency in a single table.

## Leaderless or Leader

| Question | Leader Based | Leaderless |
| --- | --- | --- |
| A Node Dies | Failover, with a pause | No pause, other replicas answer |
| A Replica Is Slow | A slow follower can delay synchronous writes | The fastest W or R replicas decide |
| Ordering of Writes | One order, from the leader | No shared order, resolved by timestamps or versions |
| Read After Write | Read the leader | Set R and W to overlap, with the costs above |
| Fits | Strong guarantees, transactions | Writes that must stay available, large scale, tolerance for repair work |

The textbook app's payment records belong on a leader. The view counters and recently viewed lists can live on a leaderless store, where a lost update costs little and an unavailable write costs more. The formal vocabulary for what each choice promises is in [Consistency Models](/system-design/consistency-models) and in [The CAP Theorem](/system-design/cap).

## Key Points

- Leaderless replication writes to each of the N replicas and waits for W, then reads from R and keeps the newest, so with R plus W greater than N the sets overlap
- Each setting trades latency, freshness and availability: in our simulation R = 2 with W = 1 raised the first read's hit rate from 52 to 84 percent at no extra write cost, and R = 2 with W = 2 did not miss
- <u>A sloppy quorum with hinted handoff keeps writes available</u> when owners are down, and gives up the overlap guarantee
- Read repair, hinted handoff and anti-entropy keep replicas from drifting, and hints are best effort within a window such as Cassandra's 3 hours
- A quorum doesn't order concurrent writes, and last write wins lost 28.2 percent of acknowledged writes in one Jepsen test, so use versions, merges or CRDTs where updates collide
