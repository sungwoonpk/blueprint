> **Scaling writes** is the problem of absorbing more writes than one database can commit durably. Reads can be copied, cached and moved to the edge, and a write has to reach the authoritative copy and survive a crash. The solutions are to make each write cheaper, write less often, store data in a write friendly way, and split the writes across machines.

[Scaling Reads](/system-design/scaling-reads) climbed a ladder of copies and caches. Writes can't use most of it. A cache doesn't absorb a write, a replica applies each write the leader applies, and adding replicas makes the leader's job slightly harder, not easier. The remedies are a different set, and the order matters again.

The textbook app shows the problem in a place that is easy to overlook. Each time a student opens a listing, the app records a view event and counts it for the seller's statistics.

A traffic level of 2,700 reads a second on registration day is therefore 2,700 extra writes a second, on top of the 300 real writes: new listings, edits and messages. Counting was supposed to be free, and it is the largest write load in the system.

## Why Writes Are Different

- **No shortcut around durability**: A write is acknowledged once it is on disk, and often once a replica has it too, as in [Single Leader Replication](/system-design/replication-one-leader). The commit is the cost
- **One authority**: With a single leader, the writes pass through one machine, and the machine's disk and log decide the ceiling
- **Indexes multiply the cost**: Each index on a table is another structure to update on each insert, the other side of the bargain in [Indexes and Query Optimization](/system-design/indexing)
- **Copies repeat the work**: A replica doesn't reduce the write load, it repeats it, and a replica that can't keep up falls behind, as in [Replication Lag](/system-design/replication-lag)

The ladder, from cheapest to most work, is: make each write cheaper, write less, change the storage engine, and split the data. A fifth step, moving the write off the request path, cuts across the others.

## Rung 1: Make Each Write Cheaper

The biggest cost in a small write is usually the commit, which has to reach stable storage. Doing it once for each row is the slowest way. We measured inserts into a SQLite file with full durability on a laptop, with a varying number of rows for each commit:

| Rows for Each Commit | Rows Inserted a Second |
| --- | --- |
| 1 | 24,460 |
| 10 | 152,608 |
| 100 | 604,933 |
| 1,000 | 1,077,847 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Rows per second for four batch sizes">
<div class="hbar"><span>1 Row</span><span class="track"><span class="fill" style="--w: 2.3%"></span></span><span class="value">24,460</span></div>
<div class="hbar"><span>10 Rows</span><span class="track"><span class="fill" style="--w: 14.2%"></span></span><span class="value">152,608</span></div>
<div class="hbar"><span>100 Rows</span><span class="track"><span class="fill" style="--w: 56.1%"></span></span><span class="value">604,933</span></div>
<div class="hbar peak"><span>1,000 Rows</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">1,077,847</span></div>
</div>
<figcaption>Rows inserted a second on one laptop with full durability, by rows for each commit</figcaption>
</figure>

The same rows went in 44 times faster at 1,000 for each commit. The absolute numbers are for one process on one machine with a fast disk, and a laptop's disk may acknowledge a flush before the data is truly safe, so just the ratio carries over.

A networked database with replication pays more for each commit, which makes the effect larger.

The PostgreSQL documentation on populating a database gives the same advice for bulk loads.

Turn off autocommit and commit once at the end, use the COPY command, which is faster than inserts even when they are prepared and batched, create indexes after the load, and raise the log size limit temporarily so that checkpoints don't happen too often.

It also says to run ANALYZE after a bulk load so that the planner has current statistics.

For the steady stream of small writes, the same idea is **group commit**: let several transactions share one flush.

PostgreSQL has a setting that delays a commit a few microseconds so other commits can join the flush, and its default is zero, so it is off until you choose to set it. The documentation suggests starting from half the average flush time measured for an 8 KB write.

## Rung 2: Write Less, or Later

Not each event needs its own row in the database at once. Two techniques:

- **Aggregate before writing**: Each web server counts views in memory and flushes one increment for each listing at intervals of a few seconds. The counts are the same, and the writes shrink
- **Acknowledge before the flush**: PostgreSQL's asynchronous commit returns success before the log is flushed. The documentation states the trade clearly: the risk is data loss and not data corruption, and the risk window is up to three times the log writer's delay. For view counts, losing the last fraction of a second on a crash is acceptable. For a payment, it isn't

We measured how much aggregation removes for the view counter. 2,700 views a second arrive over 6 servers, spread over 300,000 listings with skewed popularity, and each server flushes one increment for each distinct listing in its window:

| Window | Skew 0.8, Mild | Skew 1.0 | Skew 1.2, Strong |
| --- | --- | --- | --- |
| 1 Second | 2,520 rows/s | 1,866 rows/s | 1,188 rows/s |
| 5 Seconds | 2,336 rows/s | 1,595 rows/s | 835 rows/s |
| 30 Seconds | 2,021 rows/s | 1,232 rows/s | 568 rows/s |
| 60 Seconds | 1,865 rows/s | 1,095 rows/s | 491 rows/s |

The saving depends on repetition, so with mild skew it is small: when views are spread over many listings, there is little to merge. The second effect is separate and larger.

A flush of the whole window is one commit, and the table above says how much cheaper a batch of rows is than the same rows committed one by one.

So the aggregate cuts the rows by 40 percent at skew 1.0 and a 5 second window, and the batch cuts the cost of each of those rows by a large factor.

The cost of waiting is a loss on a crash, the last window of counts held in memory, and stale numbers for those seconds. If the views are the input to something that matters, they belong in a log that is written first, as in [Message Queues and Pub/Sub](/system-design/message-queues), with the counting done by a consumer.

## Rung 3: A Storage Engine Made for Writes

A traditional B tree database updates pages in place, which means random disk writes. Log structured merge trees, or **LSM trees**, turn the writes into sequential ones. The RocksDB and LevelDB documentation describe the path:

- **The write path**: A write is appended to a log, a sequentially written file, and inserted into an in memory table. The log makes it durable. The in memory table serves reads
- **Flush**: When the table is full, it is written out as a sorted file, in the background, and writes continue into a new table. LevelDB's notes say the log becomes a level 0 table at about 4 MB
- **Compaction**: Sorted files are merged into larger ones in levels, using bulk reads and writes, and each level is about 10 times the size of the one above it
- **The bill**: RocksDB's documentation says leveled compaction has a write amplification that is often larger than 10, since a byte is rewritten as it moves down the levels. Reads can touch a file at each level, and too many level 0 files hurt reads, which is why Bloom filters and compaction exist
- **The ceiling**: The documentation says the write throughput of an LSM database directly depends on the speed at which compactions can occur, and when compaction falls behind, writes stall

<figure class="diagram">
<div class="flow">
<div class="node">Write</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack"><div class="node">Log<small>durable</small></div><div class="node">Memory Table<small>serves reads</small></div></div>
<div class="arrow" data-label="flush" aria-hidden="true"></div>
<div class="node">Sorted Files</div>
<div class="arrow" data-label="merge" aria-hidden="true"></div>
<div class="node hot">Levels</div>
</div>
<figcaption>The write path of an LSM tree: append and remember first, merge later in the background</figcaption>
</figure>

Databases built on this idea, such as Cassandra, HBase and RocksDB itself, are covered in [Wide Column Stores](/system-design/wide-column-stores) and [Key-Value Stores](/system-design/key-value-stores). The choice trades read cost and space for write speed, and the right answer depends on the ratio of reads to writes.

## Rung 4: Split the Data

When one machine can't commit fast enough even with batching, split the writes by key across machines, as in [Sharding Strategies](/system-design/sharding). Each shard has its own leader and its own log, so the capacity adds up.

The catch is balance. With uniform keys, a hash spreads the load well, and with skewed keys it doesn't. We hashed 300,000 writes over 200,000 keys to 4, 8 and 16 shards, and compared the busiest shard with the average:

| Shards | Uniform Keys | Skewed Keys | Skewed, Hottest Key Split in 16 |
| --- | --- | --- | --- |
| 4 | 1.01 | 1.35 | 1.19 |
| 8 | 1.01 | 1.46 | 1.43 |
| 16 | 1.02 | 2.05 | 1.79 |

A value of 1.00 would be perfect. The more shards, the worse the skew hurts: at 16 shards the busiest took twice its share, because a few hot keys dominate, and the single hottest key took 7.9 percent of the writes.

Splitting that one key into 16 parts helped some and didn't solve it, since the next hot keys remain. The lesson is that capacity added by shards is capacity for the average key. [Handling Hot Spots and Celebrity Users](/system-design/hot-spots) takes the problem on.

DynamoDB documents the limit in concrete terms. A partition is designed for at most 1,000 write units a second and 3,000 read units, where a write unit is one write a second for an item up to 1 KB. Adaptive capacity moves capacity and isolates hot items, and a single hot item can use the partition maximum and no more.

The recommended technique for a key that is too hot is a suffix: append a random number to the key, from 1 to 200 in its example, so the writes spread over partitions, and read by querying each suffix and merging.

A calculated suffix, from an attribute of the item, lets a known key be read directly. A counter works the same way: 16 sub counters, summed on read, replace one hot row.

## Rung 5: Off the Request Path

Writes that don't need to be visible at once can wait in a queue. The request writes an event to a log and returns, and consumers apply the events to the database at a rate the database can sustain.

This changes the shape of the problem from a spike to a backlog, a topic of [Absorbing Traffic Spikes](/system-design/traffic-spikes), and it needs the care of Phase 4: ordering, duplicates, and a bound on the backlog, as in [Task Queues](/system-design/task-queues).

The cost is a delay before the write is visible, and the read your writes problem from [Scaling Reads](/system-design/scaling-reads) returns.

## Choosing

| What the Data Shows | First Move |
| --- | --- |
| Many tiny commits, a low disk throughput | Batch and group the commits |
| Many writes to the same rows | Aggregate in memory, then flush |
| Write heavy, sequential, little updating in place | An LSM based store |
| One leader at its ceiling after the above | Shard by a key that spreads |
| A few keys carry most of the writes | Split those keys, or sample and aggregate |
| Bursts above the sustained rate | A queue in front of the database |
| Old data nobody reads | Expire or archive it, and write less |

For the textbook app, the plan is a mix. The view events are aggregated in memory with a flush at 5 second intervals, which our table puts at about 1,600 rows a second at skew 1.0, committed as one batch per server and not row by row.

The raw events go to a log for the analytics team. The real writes, 300 a second, stay on one database leader, which has headroom. Sharding waits until the numbers say otherwise, and the plan names the trigger: when the leader's commit latency passes a threshold during the peak.

## Pitfalls

- **Counting as a row for each event**: Reads become writes
- **A commit for each row**: The commit dominates the cost
- **Sharding by a hot key**: The busiest shard sets the ceiling
- **More indexes than queries need**: Each one is a tax on each write
- **Asynchronous commit for money**: A crash can erase acknowledged payments
- **A queue without a bound**: The backlog becomes the outage
- **Ignoring compaction**: An LSM store stalls writes when compaction falls behind

## Key Points

- Scaling writes is a ladder: make each write cheaper, write less or later, use a write friendly engine, split the data, and move writes off the request path
- Batching the commits is the cheapest step: in our test, 1,000 rows for each commit was 44 times faster than one row for each commit
- Aggregating in memory cut view writes by 41 percent at skew 1.0 and a 5 second window, from 2,700 to 1,595 rows a second, and the batch commit made each row cheaper still
- <u>Plan for skew when sharding</u>: with 16 shards, the busiest took 2.05 times its share, and splitting one hot key wasn't enough
- Choose the durability of each write on purpose: asynchronous commit and in memory counts lose the last moments of data on a crash, which is fine for views and not for payments
