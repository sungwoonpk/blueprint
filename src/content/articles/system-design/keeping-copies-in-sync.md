> A **derived copy** is data kept somewhere else for speed or for a different kind of question: a cache, a search index, an analytics table, a replica in another region. **Keeping copies in sync** means getting each change from the source of truth to each derived copy, in the right order and without loss, and noticing when a copy has drifted. The goal is not zero lag, which is impossible, but a stated limit on how stale each copy may be.

A student lowers the price of a listing from 6,000 won to 4,500. The database has the new price at once. The search page, built from an index, shows 6,000 for another minute.

The listing page, served from a cache, shows 6,000 until the entry expires. The nightly report counts the old price in tomorrow's average. Each of those is a copy, and each caught the change by a different path at a different time.

Copies make a system fast, and they create a new class of bug: the data is right in one place and wrong in another, and nobody gets an error. The earlier topics gave the pieces: [Cache Invalidation](/system-design/cache-invalidation), [Change Data Capture](/system-design/cdc), [Replication Lag](/system-design/replication-lag). This topic puts them together into one way of working.

## Say How Stale Each Copy May Be

Start with a table, not with a technology. For each copy, decide what staleness is acceptable, since the answer sets the design:

| Copy | What It Serves | Acceptable Staleness |
| --- | --- | --- |
| The Listing Cache | Listing pages | Seconds, with the seller seeing their own edit at once |
| The Search Index | Search results | A few seconds |
| The Analytics Tables | Dashboards and reports | Hours |
| A Replica in Another Region | Local reads | Seconds, and more during an incident |
| The Seller's Own View | Their dashboard | Zero: read from the source of truth |

The last row is the useful one. The people who made a change are the ones who most notice a stale copy, so their reads can bypass the copy, while the rest of the world waits a few seconds without noticing.

## The Dual Write Trap

The first design most teams write is a dual write: update the database, then update the index and the cache in the same piece of code. It looks fine and fails in three ways:

- **A crash in between**: The process dies after the database commit and before the index call. The index is wrong, nobody is told, and it stays wrong until that listing changes again
- **Reordering**: Two updates to one listing are sent to the index from different servers, and the older one arrives last. The index ends with the old value
- **A failure that is hidden**: A timeout calling the index is caught and logged, and the user sees success

There is no way to make a database and a search engine commit together without a protocol like the ones in [Two-Phase Commit](/system-design/two-phase-commit) and [Sagas](/system-design/sagas), and most indexes and caches can't take part. So don't try. Make the database the sole system written by the request, and let the other copies follow from its record of changes.

## Follow the Log

The **transactional outbox** pattern, described on microservices.io, is the standard way. The sender stores the message in the database as part of the business transaction, in an outbox table, and a separate process relays it to the broker.

Its benefit is the guarantee that the message is sent exactly when the transaction commits, and in order. The relay has two forms: tailing the database's transaction log, or polling the table.

The cost is that the relay can publish a message more than once, for instance when it crashes after publishing and before recording it. The page says that a message consumer must be idempotent, for example by tracking the identifiers of messages it has processed.

<figure class="diagram">
<div class="flow">
<div class="node">App</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Database and Outbox<small>one transaction</small></div>
<div class="arrow" data-label="relay" aria-hidden="true"></div>
<div class="stack"><div class="node">Search Index</div><div class="node">Cache</div></div>
</div>
<figcaption>The request writes one place, and the other copies follow the record of changes</figcaption>
</figure>

Debezium, which reads the log, has a router for this pattern, and its documented outbox table has five columns:

| Column | Role |
| --- | --- |
| id | A unique event identifier, sent as a header, for duplicate detection |
| aggregatetype | The kind of thing that changed, such as listing, used to pick the topic |
| aggregateid | Which one changed, used as the message key |
| type | The kind of event, such as price changed |
| payload | The content of the event |

By default the topic is named from the aggregate type, so the listing events go to `outbox.event.listing`, and the key is the aggregate id. A key is routed to a partition, so the events for one listing stay in one partition, in order.

The router ignores deletes on the outbox table, which lets the app delete the row in the same transaction it inserted it, and the table acts as a queue and stays small.

The same idea runs through Facebook's memcache deployment. Its paper describes invalidation daemons that read the commit log of the database, extract the deletes of cache keys, and broadcast them to the memcache servers in each cluster of a region, instead of having each web server issue the invalidation.

The paper notes that just 4 percent of the deletes issued result in an actual invalidation, which is why reading them from one log and batching them is much cheaper than doing it everywhere.

## Make Applying a Change Safe

A log delivers each change at least once, and sometimes out of order across partitions or retries, so the consumer has to make applying a change safe:

- **Carry a version**: Each change has a number that grows with each update of the listing, such as the row version or the log position
- **Apply a newer one alone**: If the stored version is at least as high as the incoming one, ignore the message. A repeated or late message has no effect
- **Treat deletes as versioned events**: A delete is a change with a version, remembered for a while, or a late old update can bring a deleted listing back
- **Use the engine's help**: Elasticsearch has an explicit version number for concurrency control and an internal versioning that starts at 1 and increments with each update, and its external version type is for supplying your own. Its documentation says the variant that accepts an equal version is for special cases, can lose data if used wrongly, and needs care

We simulated the three designs on 20,000 listings with 3 updates each. The assumptions are our own: 0.1 percent of updates lose their publish to a crash, 2 percent of the messages arrive out of order, and 1 percent are delivered twice. After the run we compared the index with the database:

| Design | Listings Where the Index Differs |
| --- | --- |
| Dual Write, Last Arrival Wins | 0.08% |
| Outbox, Apply Whatever Arrives | 0.10% |
| Outbox, Apply Newer Versions Alone | 0% |

<figure class="chart">
<div class="hbars" role="img" aria-label="Share of listings that differ for three designs">
<div class="hbar"><span>Dual Write</span><span class="track"><span class="fill" style="--w: 80%"></span></span><span class="value">0.08%</span></div>
<div class="hbar peak"><span>Outbox, Any Arrival</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">0.10%</span></div>
<div class="hbar"><span>Outbox With Versions</span><span class="track"><span class="fill" style="--w: 0%"></span></span><span class="value">0%</span></div>
</div>
<figcaption>Listings where the index differs from the database after the run, from our simulation</figcaption>
</figure>

The wrong share is small in each of the first two, and it matters at scale: 0.08 percent of 3 million listings is about 2,400 listings with the wrong price in search, and no error to tell anyone.

The outbox alone doesn't fix it, since it brings duplicates and reordering. The version check makes the outbox converge, and no other part of the design did.

## Caches Are Easy to Get Wrong

A cache entry is the most common derived copy, and the choice is to update it or to delete it.

Facebook's paper chose delete, since deletes are idempotent: a repeated delete does no harm, while a repeated or reordered update can leave an old value in the cache. A delete makes the next read fetch from the database and fill the cache.

Races remain. The paper's lease mechanism, a token that a client must present to fill a cache entry and that a delete invalidates, prevents a stale value from being set after a delete, and it limits how often a hot key goes to the database.

Another detail is a hold off: deletes to a cold cluster carry a two second hold off that rejects adds for that time, so a stale value copied from a warm cluster can't be inserted just after the delete.

A time to live stays as a backstop, so a missed invalidation heals itself within a known time, as in [Cache Stampedes](/system-design/cache-stampedes).

## Search Indexes Have a Floor

A search index doesn't show a change at once. Elasticsearch makes documents searchable within about 1 second, since it refreshes its segments at 1 second intervals by default, and the documentation says it refreshes this way for indices that received a search in the last 30 seconds.

A refresh can be requested explicitly, or an index request can wait for the next refresh with `refresh=wait_for`, which is the tool for a flow where a user must find what they just saved. It costs latency, so use it where it matters and not for each write.

The index also can't be repaired by editing one entry at a time after a big change, such as a new analyzer or a new field.

The usual remedy is to build a new index in the background from the source, then switch an alias to it, which is a use of the expand and contract steps in [Schema Migrations Without Downtime](/system-design/schema-migrations).

## Repair What the Pipeline Misses

Even a good pipeline drifts: a bug, a bad deploy, a dropped message past the retention of the broker. A second line of defense checks the copies against the source on a schedule:

- **Counts and checksums by range**: Compare the number of rows and a checksum for each range of ids, and look closer at the ranges that differ, the idea of the trees in [Repairing Replicas with Hinted Handoff and Merkle Trees](/system-design/repairing-replicas)
- **Random sampling**: Each hour, read a sample of listings from the source and the copy and compare, and graph the share that differs
- **A rebuild**: A script that rebuilds a copy from the source, run in a test regularly, so that it works on the day it is needed
- **Metrics on the pipeline**: The age of the oldest change not yet applied, the number of messages waiting, and the mismatch rate from the sample

The mismatch rate is the number that says whether the system is healthy. A rising rate means a bug is leaking changes, and a spike after a deploy points at the deploy.

## A Plan for the Textbook App

| Copy | Update Path | Staleness | Safety Net |
| --- | --- | --- | --- |
| Listing Cache | Delete on change, from the log | Seconds, bounded by a 60 second time to live | Leases for hot listings |
| Search Index | Outbox events with versions | About 2 seconds | Hourly sample, nightly range checksums |
| Analytics Tables | Change data capture into the warehouse | Minutes | Daily row count check |
| Regional Replica | Database replication | Seconds | Lag alert above 1 minute |
| The Seller's Own View | Reads from the source | Zero | |

## Pitfalls

- **A dual write in the request path**: A crash or a timeout leaves a silent difference
- **Updates that carry no version**: An old message overwrites a new value
- **Forgetting deletes**: A late update resurrects a deleted listing
- **No time to live on a cache**: A missed invalidation lasts forever
- **No drift metric**: The first alert is a customer
- **A rebuild nobody has run**: It fails on the day it is needed
- **A queue without a bound on lag**: The copy falls days behind and nobody notices

## Key Points

- A derived copy needs a stated staleness limit, and the people who made a change can read the source while the others wait a few seconds
- Don't dual write: write the database alone in the request, and propagate from its log with the outbox pattern or change data capture
- Make applying safe: carry a version, ignore anything older than what is stored, and treat deletes as versioned events
- <u>Idempotent and versioned beats exactly once</u>: in our simulation, an outbox that applied whatever arrived left 0.10 percent of listings wrong, and one that applied newer versions alone left zero
- Repair what the pipeline misses with range checksums, sampling and a tested rebuild, and watch the age of the oldest unapplied change and the mismatch rate
