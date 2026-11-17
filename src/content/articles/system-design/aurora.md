> **Aurora** is Amazon's cloud relational database, built by splitting a database engine in two. The SQL engine, with its transactions and caches, keeps running on a database server, and the storage layer moves into a shared service that stores just the redo log, keeps six copies across three data centers, and builds the data pages itself. The log is the database, and the network is the thing to save.

The textbook app runs PostgreSQL on one server with a replica for failover, which works. Then a data center has a bad night. The replica is in the same zone as the primary, so it fails too, and the restore from backup takes hours.

The app moves the replica to another zone, and each write now waits for a copy across a data center link before it commits.

That is the problem Aurora's designers started from, and they made an unusual observation. In the cloud, the disk is no longer the bottleneck of a database.

Writes are spread over many machines and disks, so no one disk is hot. The bottleneck moves to the network between the database server and its storage, and to the slowest of the machines that a write has to reach.

This topic follows the design that came from that observation: six copies and a quorum that survives a lost data center, a storage service that understands the log, and a commit that avoids a heavy protocol.

It builds on [Write-Ahead Logs](/system-design/write-ahead-logs), [Single Leader Replication](/system-design/replication-one-leader) and [Leaderless Replication and Quorums](/system-design/leaderless-replication), and adds our own arithmetic for the quorum, the repair window and the traffic.

## What One Write Costs in a Traditional Database

A transaction in a classic database writes several things, and each is a separate write that the storage has to complete. It writes a redo log record, which is the difference between a page's before and after images.

It may write a statement log, kept for point in time restore. Later it writes the modified data page, and a second copy of that page to guard against a torn write, and the table's metadata files.

In a cloud setup with a standby in another zone, each of those goes to a network disk, which mirrors it, and then again to the standby's disk, which mirrors it too.

The steps are sequential and synchronous, so latency adds up, and the slowest step sets the pace. In quorum terms, the design is a 4 of 4 write, and any slow or failed member stalls it.

We counted the bytes for our own model of this. A transaction writes a 200 byte redo record and a 150 byte statement log record, and each fourth transaction causes the flush of a 16 KB page and a 16 KB double write copy. Four network writes per item in the mirrored setup gives:

| Design | Bytes on the Network per Transaction |
| --- | --- |
| Mirrored Database, Four Copies in Two Zones | About 34,000 |
| Redo Records Only, Six Copies | 1,200 |

The numbers are our assumptions, and the ratio, about 28 times, is the point. Amazon's own test, on a benchmark of writes alone over 30 minutes, found Aurora sustaining 35 times as many transactions as the mirrored database, with 0.95 network I/Os per transaction against 7.4.

The traffic fell by more than the extra replication added, since just the log crosses the network.

## Six Copies Across Three Zones

The usual protection against losing a machine is three copies and a quorum of two, as in [Leaderless Replication and Quorums](/system-design/leaderless-replication). The designers argued that this is not enough in the cloud, and the reason is the difference between two kinds of failure.

Failures of single disks and machines are independent: at any moment some are broken and being repaired. The failure of a whole availability zone, through a fire, a flood or a power loss, is correlated: the disks and machines in it go at once.

With one copy in each of three zones, losing a zone leaves two copies, and then one more ordinary failure leaves one copy, which can't prove that it is up to date. The quorum is broken exactly when it is needed.

Aurora's target is to lose a whole zone plus one more machine without losing data, and to lose a whole zone without losing the ability to write. The design is six copies, two in each of three zones, with a write quorum of 4 and a read quorum of 3.

Two rules justify the numbers: the read quorum and write quorum must overlap, since 3 plus 4 is more than 6, and two write quorums must overlap, since 4 is more than half of 6.

We tested what that does with a simulation: one zone is down, and each remaining copy is independently down with probability q, the background noise of failures:

| Copies Down, Besides the Lost Zone | 3 Copies, Quorum 2 | 6 Copies, Writes Need 4 | 6 Copies, Reads Need 3 |
| --- | --- | --- | --- |
| Each With Probability 0.1% | 99.79% | 99.60% | 100.00% |
| Each With Probability 1% | 98.02% | 96.00% | 99.94% |
| Each With Probability 5% | 90.24% | 81.41% | 98.56% |

The table has a surprise, and it is a design choice and not a flaw. With a zone down, the six copy design can write less often than the three copy one, because a write needs the full four remaining copies.

What it keeps is the ability to read, 98.56 percent at the worst noise level against 90.24 percent, and a read quorum is the thing that lets the system rebuild the write quorum by adding copies.

The design protects durability first and write availability second during the rare event of a zone loss plus a node loss, and that is a defensible order for a database.

Without a zone failure, six copies come out ahead. At a 1 percent down rate, writes succeeded 99.996 percent of the time with six copies against 99.974 percent with three.

## Small Segments Shrink the Window

A quorum survives failures that don't overlap in time, and the way to reduce the overlap is to repair fast. Aurora cuts the database volume into fixed segments of 10 GB, and each segment is a group of six copies. A volume is a chain of such groups, and it can grow up to 64 TB.

The segment is the unit of failure and of repair. A 10 GB segment can be copied in about 10 seconds on a 10 Gbps link.

That makes the time during which a second failure matters very short, and we computed what that buys. Take a segment that fails once a year, a number we assume, and a zone that is down, which leaves four copies of each group:

| Repair Time | Share of Time a Copy Is Down | Writes Blocked During a Zone Outage | Reads Lost During a Zone Outage |
| --- | --- | --- | --- |
| 10 seconds, a 10 GB Segment | 0.00003% | About 1 in 800,000 | About 6 in 10 trillion |
| 1 hour | 0.011% | About 1 in 2,200 | About 8 in 100 million |
| 1 day, a Whole Volume Copied | 0.27% | About 1 in 90 | About 4 in 100,000 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Chance of losing a read quorum during a zone outage for three repair times">
<div class="hbar peak"><span>Repair in 1 Day</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">4 in 100,000</span></div>
<div class="hbar"><span>Repair in 1 Hour</span><span class="track"><span class="fill" style="--w: 0.2%"></span></span><span class="value">8 in 100 million</span></div>
<div class="hbar"><span>Repair in 10 s</span><span class="track"><span class="fill" style="--w: 0.1%"></span></span><span class="value">6 in 10 trillion</span></div>
</div>
<figcaption>Chance of losing a read quorum during a zone outage by repair time, from our arithmetic, with the first bar to scale and the others too small to see</figcaption>
</figure>

Repair time is the lever. Making the unit smaller took the chance of losing a read quorum from about 4 in 100,000 to about 6 in 10 trillion, seven orders of magnitude.

And the same design handles maintenance for free: patching a node, moving a hot segment and upgrading software are the same event as a short failure, done one zone at a time and one member of a group at a time.

## The Log Is the Database

The second idea is to push work into the storage. In Aurora, the database server sends just redo log records to storage.

It writes no data pages, not for background writes, not for checkpoints and not for evicting a page from the cache. The storage nodes apply the log to produce pages, in the background or when a page is read.

The log records are batched by the group they belong to, fully ordered, and sent to the six copies, and the database waits for 4 of 6 to acknowledge. A write is complete when four copies have it on disk, which is also the quorum.

From the engine's point of view the log is the database, and any page the storage builds is a cache of applying the log. Because of that, three jobs leave the database server. Checkpointing disappears. Backup becomes continuous, since the log is already staged to object storage. And crash recovery stops being a stop the world event.

A traditional database after a crash starts from the last checkpoint and replays the log, which can take minutes. In Aurora the storage applies the log continuously, so a restarted server establishes what is durable, and any page that needs a few more records gets them when it is read.

A database could recover in generally under 10 seconds even after a crash under more than 100,000 write statements a second.

Each storage node works in the background. It receives a record, writes it to disk and acknowledges, which are the steps in the path of a write, and the rest stay out of it.

The rest are asynchronous: it sorts records and finds gaps from lost batches, gossips with peer nodes to fill the gaps, builds new pages, stages data to object storage, collects old versions, and checks page checksums.

The background work is done when the node is idle and the foreground load is low, the opposite of a traditional database where checkpoints add load when the system is busy.

## Committing Without Two-Phase Commit

A distributed commit usually means [Two-Phase Commit](/system-design/two-phase-commit), and the designers avoided it: it is slow across data centers and fragile when machines fail at a steady background rate. They used the log's order instead.

Each record carries a log sequence number, an LSN, from a single counter in the writer, so the writer is the one source of order.

The storage tracks the highest LSN for which it holds the earlier records without a gap, and the database marks some records as consistency points, the places where it is safe to stop.

The volume's durable point is the highest consistency point at or below the complete point. For instance, even with the records complete up to 1007, if just 900, 1000 and 1100 are consistency points, the log is durable to 1000, and records past it are cut off at recovery.

A transaction commits when the durable point passes its commit record. The writer doesn't wait for each commit in turn: a thread that issues a commit sets it aside and goes on, and a separate step wakes the transaction once the durable point reaches it. No vote, no coordinator, and no round trip beyond the four acknowledgments.

## Replicas on the Same Storage

Read scaling is cheap, because replicas don't copy data. A writer and up to 15 read replicas mount the same storage volume, so a replica adds no storage cost and no write load on the storage.

The writer also streams its log records to the replicas, which apply them to pages in their own caches, and the replicas typically lag the writer by 20 ms or less.

That is a different shape from the replicas of [Single Leader Replication](/system-design/replication-one-leader), each with its own full copy and its own apply work, and the lag in [Replication Lag](/system-design/replication-lag) is correspondingly small. A failover can promote a replica without a copy of the data: it already sees the volume.

## What It Costs

The design has real limits, and they follow from its choices. There is a single writer, so writes don't scale out the way reads do, and the next step beyond one writer's capacity is the sharding of [Sharding Strategies](/system-design/sharding).

The storage is a purpose built service that exists in one provider's cloud. And the design makes the network, and its latency to the storage, the thing to watch: six writes go out in parallel, and a slow outlier is hidden because 4 of 6 is enough.

In return, it gives what a small team would struggle to build on its own: storage that repairs itself, recovery in seconds, and a read quorum that survives a lost zone. The trade is the same as in other managed services, lock in for operational ease.

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Database Choice | A managed engine with storage replicated across three zones, so a zone loss doesn't lose data |
| Reads | Up to 15 replicas on the same storage, with lag of tens of milliseconds, for search and browse |
| Failover | Promote a replica, and expect seconds and not hours |
| Recovery Test | Time a crash recovery, and compare it with the 10 seconds as a goal |
| Write Limit | A single writer, so watch its CPU and plan for sharding past it |
| What to Copy at Small Scale | Fewer writes in larger batches, and the log kept apart from the data |

## Pitfalls

- **Copies in one zone**: A zone loss breaks the quorum when it is needed
- **A quorum of 2 of 3 for data that must survive a zone plus a node**: The third failure leaves one copy that can't be trusted
- **Long repair times**: The window for a second failure stays open
- **Assuming write availability survives a zone and a node**: The write quorum needs four copies
- **A single writer treated as scalable for writes**: Only reads scale out
- **Counting disk I/O and not network I/O**: The network is the bottleneck in the cloud
- **Checkpoints and page writes over the network**: They add traffic and stalls

## Key Points

- Aurora splits the database: the SQL engine stays on a server, and storage is a shared service of 10 GB segments, six copies each, spread over three zones, with writes needing 4 of 6 and reads needing 3 of 6
- The design survives a lost zone plus one node without losing data: in our simulation at a 5 percent noise level, reads stayed available 98.56 percent of the time against 90.24 percent for three copies, and writes paid for it, which the design accepts
- <u>Repair time sets durability</u>: cutting the unit to a 10 GB segment, repaired in about 10 seconds, took the chance of losing a read quorum in our arithmetic from about 4 in 100,000 to about 6 in 10 trillion
- The log is the database: redo records alone cross the network, in our byte model 28 times fewer than a mirrored database, and in the original test 35 times the transactions, with storage building pages and recovering in the background
- Commits use the order of the log and a durable point, not two phase commit, and up to 15 read replicas share the volume with a lag of 20 ms or less
