> **Kafka** is a distributed log. Producers append records to a topic, the topic is split into partitions, and each partition is an ordered log on disk, with records added at the end, copied to several brokers. Consumers read by position, called an offset, and keep their own place, so a log can be read by many groups at their own pace and read again from the past.

A student in the textbook app changes the price of a listing. Within a second, the search index should update, the cache should drop the old value, the recommender should see the change, the analytics warehouse should record it, and a seller notification should go out. Five systems need the same fact.

The first design has the listing service call each of them. It must know the five of them, wait for each, and fail the price change when one is down.

The second puts a queue between them, and a queue helps until a new consumer joins and wants the last week of changes, and the queue has already thrown them away after delivery.

LinkedIn faced this in 2010 with activity data: page views, searches, clicks, and operational metrics, at a volume far above the data that the site considered its real data. The existing tools were log scrapers built for offline loading, or messaging systems built for small messages and light load.

Kafka was written to be both: a messaging system with the throughput of a log aggregator, where each consumer reads at its own speed and can come back for old data.

This topic follows the ideas that make that work, from the file on disk to the replicas that protect it, and tests the trade offs of acknowledgment and consumer parallelism on our own simulations.

It builds on [Message Queues and Pub/Sub](/system-design/message-queues) and [Partitions, Ordering and Consumer Groups](/system-design/ordering), and it is the usual source for the events of [Event-Driven Architecture](/system-design/event-driven).

## The Log Is the Interface

A topic is a stream of records of one kind, such as `listing-changes`. It is cut into partitions, and a partition is a log: a directory of files on a broker, to which records are added at the end and not edited.

Each record gets the next offset, an increasing integer that names its place in that partition. Offsets aren't reused, and records don't change.

Two consequences follow, and they are the heart of the design. A partition is totally ordered, so the records in it are seen in one order by each reader.

And ordering holds within a partition, so a topic gives no order across partitions, and keys decide which partition a record goes to: records with one key land in one partition and keep their order.

Reading is a pull. A consumer asks a broker for records starting at an offset, and the broker returns a batch.

The consumer's position is a single integer for each partition, and it is the consumer that keeps it, in the original design in ZooKeeper and today in a Kafka topic of its own. The broker doesn't track which message was consumed by whom, which would take a write to disk for each acknowledgment.

That choice makes the broker cheap and the consumer free. A consumer that crashes resumes from its last saved offset. A consumer that has a bug can rewind and read again. A new system can start at the beginning and catch up on a week of history.

And a slow consumer doesn't slow the others, since each has its own offset. This is the property that a queue that deletes on delivery can't offer, and it is why the log is also a good basis for [Event Sourcing](/system-design/event-sourcing).

## Why a Log on Disk Is Fast

It sounds slow to write each message to disk, and the design depends on three facts.

Sequential disk access is fast and random access isn't. The order of magnitude is large: about 600 MB a second of linear writes on a set of ordinary drives, against about 100 KB a second of random writes. A log appends, so it uses the fast pattern.

The operating system's page cache does the caching. Kafka writes to the file system and lets the kernel keep recent data in memory, so reads of fresh data come from memory and the broker holds almost no cache of its own, which avoids the pauses of a large managed heap.

A consumer that keeps up reads data that is still in the cache.

And the broker avoids copying. Sending a file over a network the usual way copies the bytes four times and crosses between kernel and user space several times.

With the operating system's `sendfile` call, the bytes go from the page cache to the network card without passing through the application, so the broker's cost for a read is small. The saving doesn't apply when the connection uses TLS encryption, which has to process the bytes in user space.

Batching ties it together. Producers send records in batches, brokers store them as written, and records can be compressed in batches. Fewer, larger writes and reads keep the system near the speed of the disk and the network instead of the speed of its per message overhead.

## Partitions, Consumer Groups and Parallelism

A single consumer can't read a busy topic, so consumers form a **consumer group**: each partition goes to exactly one consumer in the group, and the group together reads the whole topic. Another group, with its own offsets, reads the same topic independently, which is how five systems get the same price changes without knowing each other.

The number of partitions is therefore the limit of parallelism. We computed it for a topic with 12 partitions. The busiest consumer sets the speed of the group, and a partition can't be shared:

| Consumers in the Group | Partitions of the Busiest Consumer | Throughput Relative to One |
| --- | --- | --- |
| 1 | 12 | 1 times |
| 3 | 4 | 3 times |
| 6 | 2 | 6 times |
| 12 | 1 | 12 times |
| 24 | 1 | 12 times |

Past 12 consumers, the extra ones sit idle. The count isn't easy to raise later, since it changes how keys map to partitions and breaks the ordering of keys across the change, so it is chosen with growth in mind: more than the consumers needed now, since the cost of a few extra is some overhead.

When consumers join or leave, the group rebalances its partitions, and a consumer that sets a fixed identity can rejoin without triggering a rebalance.

## Staying Alive: Replication

A partition lives on one broker, so a broker failure would lose it. Each partition is therefore replicated. One replica is the **leader**, and writes go to it. The others are followers that pull from the leader, as in [Single Leader Replication](/system-design/replication-one-leader). The replication factor is set topic by topic.

The set of replicas that are caught up is the **in sync replicas**, the ISR. A follower that lags beyond a time limit is dropped from the set, and it rejoins when it catches up. This is the part that differs from a majority quorum.

The ISR is the quorum, with no vote: a committed record is on each member of the ISR, and with f plus 1 replicas a topic survives f failures without losing a committed record, where a majority scheme needs 2f plus 1.

The producer chooses how much to wait for. With `acks=0`, it doesn't wait. With `acks=1`, it waits for the leader to write.

With `acks=-1`, the strictest level, which the configuration also spells out in words, it waits for the full ISR. A setting named `min.insync.replicas` adds a floor: if the ISR is smaller than that, a strict write is refused and not accepted with fewer copies than promised.

We measured the trade. A partition took 2,000 writes a second, followers took an average of 1 to 100 ms to copy a record, and the leader crashed. We counted the records that the producer had been told were safe and that the new leader didn't have:

| Follower Copy Delay | Acknowledged Writes Lost, acks=1 | Acknowledged Writes Lost, acks=-1 |
| --- | --- | --- |
| 1 ms | 1.9 | 0 |
| 5 ms | 9.9 | 0 |
| 20 ms | 40.0 | 0 |
| 100 ms | 172.9 | 0 |

With `acks=1`, the writes in flight to the followers at the moment of the crash are lost, and the count grows with the copy delay, since the leader answers before the copy. With `acks=-1`, a write is acknowledged when each in sync replica has it, so the new leader, taken from that set, has each acknowledged write.

That safety costs latency and availability. In our model, with an average copy time of 5 ms, `acks=1` completed at the 0.5 ms leader append, and `acks=-1` had a median of 6.7 ms and a 99th percentile of 26.9 ms, since it waits for the slower of two followers.

And the floor on the ISR size trades availability for durability. With a replication factor of 3 and each broker down 5 percent of the time, the share of writes accepted was:

| Setting | Writes Accepted |
| --- | --- |
| acks=1 | 99.988% |
| acks=-1, Floor of 1 | 99.988% |
| acks=-1, Floor of 2 | 99.241% |
| acks=-1, Floor of 3 | 85.766% |

A floor of 1 makes `acks=-1` weaker than it sounds. If the ISR has shrunk to the leader alone, the write is acknowledged with one copy, and the loss of that broker loses it.

A floor of 2 means a committed write is on two machines, and the price in this model was about three quarters of a percent of writes refused. A floor of 3 refuses one write in seven when brokers fail at this rate.

One more setting decides what happens when the whole ISR is gone. A replica that isn't in sync can be allowed to become leader, which restores service and loses the records it didn't have, or the partition can stay down until an in sync replica returns.

The default favors consistency, and the choice is a direct statement of [The CAP Theorem](/system-design/cap).

## Delivery Guarantees

What a consumer sees depends on when it saves its offset. If it saves before processing, a crash after the save loses the work, which is at most once. If it saves after, a crash before the save repeats the work, which is at least once. At least once is the default.

Exactly once is built from pieces. An idempotent producer attaches a producer id and a sequence number to each batch, and the broker drops a repeated batch, so a retry doesn't duplicate.

Transactions let a producer write to several partitions atomically, and a consumer set to read committed data sees a transaction whole or doesn't see it.

The boundary is the same as in [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees): inside Kafka, from topic to topic, the guarantee holds, and a write to an outside database needs its own idempotence, as in [Avoiding Duplicate Work and Double Charges](/system-design/duplicate-work).

## Logs That Keep the Latest Value

Retention by time or size suits a stream of events. For a stream of state, such as the current price of each listing, a different policy fits: **log compaction**.

The cleaner keeps at least the latest record for each key and removes older ones in the background. A record with a key and no value is a tombstone, which marks a delete and is removed later.

We measured how much a compacted log shrinks. A stream of 1 million price updates, spread over 100,000 listings with some listings changing far more than others, left 91,351 distinct keys, 9.1 percent of the log.

The new consumer can read the compacted log from the start and rebuild the current state of each listing without reading each change ever made, and a log of changes becomes a table.

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Listing Changes | One topic keyed by the listing id, so each listing's changes keep their order |
| Partitions | 24, more than the 12 consumers of the busiest group, with room to grow |
| Replication | Factor 3, `acks=-1`, a floor of 2 on the in sync set, and unclean election off |
| Consumers | One group each for search, cache, recommender, analytics and notifications |
| Current State | A compacted topic for the latest price of each listing |
| Duplicates | An idempotent producer, and idempotent consumers for outside writes |
| Retention | 7 days for the change stream, so a new consumer can replay a week |

## Pitfalls

- **A low partition count**: the group can't use more consumers than partitions
- **Expecting order across partitions**: order holds within one partition
- **acks=1 for data that matters**: a leader crash loses acknowledged writes
- **A floor of 1 on the in sync set**: an acknowledged write can be on one machine
- **Unclean leader election on**: a lagging replica becomes leader and drops records
- **Saving the offset before processing**: a crash loses the work
- **A key with heavy skew**: one partition takes most of the load
- **Treating exactly once as a feature of a whole system**: it covers the path inside Kafka

## Key Points

- Kafka is a partitioned, replicated log that grows at the end: consumers pull by offset and keep their own position, so many groups can read at their own speed, rewind and replay
- A log is fast because it writes sequentially, leans on the page cache, avoids copying with `sendfile` and works in batches, and a topic's partitions set the limit of parallel consumers: with 12 partitions, 24 consumers did no more work than 12
- Order holds within a partition, and the key decides the partition, so records with one key stay in order
- <u>Acknowledgment is a trade</u>: in our model a leader crash lost 9.9 acknowledged writes with `acks=1` at a 5 ms copy delay and zero with `acks=-1`, which cost a 6.7 ms median write instead of 0.5 ms, and a floor of 2 on the in sync set refused about 0.75 percent of writes when brokers fail 5 percent of the time
- Compaction keeps the latest value for each key, so a stream of changes becomes a table: our 1 million updates compacted to 9.1 percent, and delivery is at least once unless idempotence and transactions are added
