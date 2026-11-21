> **Change data capture**, or CDC, records each insert, update and delete in a database as it happens and delivers them as a stream of events to other systems. The most dependable form reads the database's own transaction log.

The textbook app keeps the same listing in several places: the main database, the search index, a cache and the warehouse. Each needs to hear about the changes.

The application code could tell each of them, as in [Event-Driven Architecture](/system-design/event-driven), but then each place that writes to the database has to remember to do it, including batch jobs and admin tools.

CDC moves the job to the database: whatever changes a row, the change is read from the log and sent on. It is one way to run the relay in [The Transactional Outbox](/system-design/transactional-outbox) and to drive the invalidation in [Cache Invalidation](/system-design/cache-invalidation), and this topic looks at it directly.

## Three Ways to Find What Changed

| Approach | How It Works | What Goes Wrong |
| --- | --- | --- |
| Polling | Query `WHERE updated_at > last_seen` on a timer | Misses deletes and intermediate versions, and loads the database |
| Triggers | A database trigger writes each change to a side table | Slows each write, and the side table needs cleaning |
| Log Reading | Read the transaction log the database already keeps | Needs access to the log, and care about its retention |

We measured the blind spots of polling in our own simulation. In a minute with 10,000 listings, it had 3,004 price updates and 89 deletes, 3,093 changes in total.

A poll at the end of the minute saw 2,560 changed rows, each with just its last state, and none of the 89 deletes, since a deleted row has no `updated_at` left to find. Intermediate versions are lost too: a price that went 4,500, 4,000, 3,500 in the minute shows up once, as 3,500.

Log reading sees each of them, because the log records each change, in commit order, as part of the database's normal work. SQL Server's CDC works the same way: a job reads the transaction log, with no triggers. The log in question is the one from [Write-Ahead Logs](/system-design/write-ahead-logs).

## Reading the Log

Each database has its own log and its own way to read it:

| System | What Is Read | What an Update Looks Like |
| --- | --- | --- |
| MySQL | The binary log, in row format, the default | Row events, with the before and after images controlled by `binlog_row_image` |
| PostgreSQL | The write-ahead log through logical decoding and a replication slot | A stream of row changes between begin and commit |
| SQL Server | The transaction log, through a capture job that fills change tables | Two rows, one for the old values and one for the new |

MySQL's binary log is written in commit order, after a transaction completes, and serves replication and point-in-time recovery. PostgreSQL's logical decoding turns the log from storage level records into application level changes, delivered per replication slot, with just the committed transactions decoded.

SQL Server's change tables use operation codes: 1 for a delete, 2 for an insert, and 3 and 4 for the before and after of an update.

Debezium, an open source tool that reads these logs, wraps each change in an envelope. This is our listing's price change in that style:

```json
{
  "op": "u",
  "before": { "id": 17, "price_cents": 4500 },
  "after":  { "id": 17, "price_cents": 4000 },
  "source": { "table": "listings", "lsn": 8341209600 }
}
```

The `op` is `c` for create, `u` for update, `d` for delete and `r` for a row read during a snapshot. Whether `before` is complete depends on the database: in PostgreSQL, by default an update or delete carries just the key columns, and the whole old row needs `REPLICA IDENTITY FULL` on the table.

A delete is followed, by default, by a tombstone with the same key and an empty value, which lets log compaction in [Logs as Message Brokers](/system-design/log-based-brokers) clean up the old events for that key.

## Snapshot, Then Stream

A new pipeline faces a problem: the log holds recent changes, not the data that is already there. So CDC tools start with a copy of what exists. Debezium's default order works like this.

It notes the current position in the log, scans each table and emits a read event for each row, and then streams changes from the position it noted, so no change between the two is missed.

<figure class="diagram">
<div class="flow">
<div class="node">Note the Log Position</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Copy Existing Rows<small>read events</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Stream Changes<small>from the noted position</small></div>
</div>
<figcaption>The snapshot and the stream meet at a position in the log</figcaption>
</figure>

AWS's Database Migration Service has the same two phases as task types, full load plus CDC, or CDC alone for a target that already has the data.

Google's Datastream runs the backfill and the change stream at the same time and marks each event with its origin. Debezium also offers incremental snapshots, which copy a table in chunks alongside the live stream, so a large table doesn't have to be frozen for hours.

## Positions, Duplicates and Order

The position in the log, a log sequence number in PostgreSQL or a file and offset in MySQL, is the consumer's bookmark, like the offset in a log based broker. The tool records it regularly, and after a restart it asks the database for everything after it.

That gives at least once delivery. In normal operation each change arrives once, but after a crash a replacement task resumes from the last recorded position, not the last processed one, so duplicates can appear, depending on how often positions are saved.

Each event carries its log position, which helps detect them.

Google's Datastream delivers at least once with no guaranteed order, though the event metadata carries what is needed to order and deduplicate.

Kafka Connect, the framework many of these tools run on, supports exactly once for source connectors from version 3.3, in distributed mode, when the connector allows it. Consumers still have to be idempotent, as in [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees).

Latency isn't promised either. AWS's migration service promises no latency for its change stream, so measure the delay and alert on it.

## What Can Go Wrong

Five things go wrong most often:

- **A stalled reader fills the disk**: the database has to keep the log until its readers have taken it. In PostgreSQL a replication slot holds the log it hasn't delivered even with no consumer connected, and in extreme cases that can bring the server down. If the textbook app's database writes 5 MB of log a second, a connector that is down for 6 hours leaves 108 GB behind. SQL Server has the same shape, since its log can't be truncated until the capture job has read it
- **A slow reader loses the log**: this is MySQL's opposite risk. Binary logs expire after a set time, 30 days by default, and a consumer that falls further behind than that can't resume and needs a new snapshot
- **Quiet tables hold the log back**: a connector that watches few busy tables rarely confirms its position, and Debezium offers heartbeats, set with `heartbeat.interval.ms` and off by default, so that it reports progress even when no rows change
- **Schema changes aren't events**: in PostgreSQL, logical decoding doesn't capture changes to the table definition, so a column change reaches consumers as a change in the shape of later events. Use the expand and contract steps from [Schema Migrations Without Downtime](/system-design/schema-migrations), and let consumers ignore fields they don't know
- **Failover can lose the position**: a replication slot lives on the primary, so after a switch to a replica it may be missing. PostgreSQL 17 added slots that can be kept in sync on a standby, and older setups have to recreate the slot, which can mean a gap or a new snapshot

Watch the lag in time and in bytes, and alert long before the disk is full.

## Rows Are Not Business Events

CDC publishes what changed in the tables, in the tables' shape. That is ideal for copying data: the search index, the cache and the warehouse want to follow the table.

It is a poor contract between services, because anyone who reads the stream now depends on the database's column names, and a harmless rename breaks them. A row change also says that the price became 4,000, not why.

For business events, the better source is an outbox table, as in [The Transactional Outbox](/system-design/transactional-outbox), which can itself be read with CDC. The listing's `ListingPosted` event belongs to the application. Moving the listing's rows to the search index belongs to CDC.

## Key Points

- CDC turns each insert, update and delete into an event, and reading the transaction log catches each one, in commit order, where polling misses deletes and intermediate versions
- Each database has its own log: MySQL's binary log, PostgreSQL's logical decoding and SQL Server's capture job
- Start with a snapshot of the existing rows, then stream from the log position noted before it
- Delivery is at least once, so keep the position and make consumers idempotent
- <u>A stalled reader makes the database keep its log</u>, so monitor lag and disk, and treat row changes as data copies, not as business events

