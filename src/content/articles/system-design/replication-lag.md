> **Replication lag** is the delay between a write on the leader and the moment a follower has applied it. With asynchronous replication it is above zero, and a reader who uses a follower can see old data, or see data go back in time.

[Single Leader Replication](/system-design/replication-one-leader) gave the textbook app followers that answer reads. They work well until a seller posts a listing, the page redirects to "My Listings", the request goes to a follower that hasn't received the write yet, and the new listing isn't there. The seller posts it again, and now there are two.

The data was not lost. It was in transit. This topic looks at how big that gap gets, which anomalies it causes, and the fixes that systems use.

## How Big Is the Gap?

Each database reports lag in its own way, and each measure has traps:

| Source | What It Reports | Watch Out For |
| --- | --- | --- |
| PostgreSQL `pg_stat_replication` | `write_lag`, `flush_lag` and `replay_lag`, as time on the primary | Describes recent WAL, not a forecast of catch up |
| PostgreSQL `pg_last_xact_replay_timestamp()` | When the last replayed transaction committed on the primary | Looks like growing lag on an idle primary |
| MySQL `Seconds_Behind_Source` | An estimate of how far the applier thread is behind | Can show 0 while the replica is far behind on a slow network |
| Amazon RDS `ReplicaLag` | Seconds behind, from the engine's own number | -1 means replication is not active |

The three PostgreSQL columns mark stages: the standby has written the log, flushed it, or replayed it so that queries can see it. The replay figure is the one that matters for readers, since it approximates how long before a recent commit is visible on the standby.

Typical lag depends on the design. Amazon Aurora replicas read the same storage volume as the writer, and lag is usually much less than 100 milliseconds, rising during heavy writes. Replicas that copy a log, as in MySQL or PostgreSQL, depend on the network and on how fast they can apply it.

## Why It Grows

A follower falls behind for ordinary reasons:

- **A burst of writes**: The leader writes in parallel, and a follower may replay in a single thread. MySQL can run several applier threads, with a coordinator handing out transactions that don't conflict
- **Long queries on the follower**: A PostgreSQL hot standby can't skip log records, so when replay would remove rows that a query still needs, it either pauses replay or cancels the query. It waits up to `max_standby_streaming_delay`, 30 seconds by default, and a long running query can hold back the changes that other sessions see
- **Network and distance**: A cross region follower is behind by the transit time at the least
- **A slow or overloaded follower**: It is the same as any other lagging consumer

There is a trade: `hot_standby_feedback` tells the primary which rows the standby still needs, which prevents most cancellations and can cause bloat on the primary.

## Three Strange Things a Reader Can See

Werner Vogels, in his essay on eventual consistency, called the delay the inconsistency window and listed what a client can and can't count on. Three anomalies matter most.

We simulated 3 followers that are normally 20 ms behind and fall 3 seconds behind for 2 percent of the time, in episodes of about 5 seconds. These numbers are our assumptions.

| Anomaly | What the User Sees | In Our Simulation |
| --- | --- | --- |
| Not Reading Your Own Write | You post a listing and it isn't there | 2.0% of reads, from a random follower, within 1 second of the write |
| Time Going Backwards | A refresh shows older data than the last page | 1.4% of refreshes 1 second apart |
| Out of Order Effects | You see a reply before the question | Depends on where related writes live |

The first happens when the read lands on a follower that is in a behind period, and the second when one read hits a current follower and the next hits a lagging one. After 5 seconds, no read missed the write, since the behind periods in our model last 3 seconds.

The third comes from sharding: if the question and the reply are stored in different partitions with different lag, the reply can appear first. The guarantee against this is called consistent prefix: reads do not see writes out of order, though they may lag.

## Fixing Your Own Writes

Several fixes are in use, and they trade complexity or load for correctness:

- **Read from the leader for a while after a write**: GitLab's load balancer sends a user's reads to the primary for up to 30 seconds after the user writes, and goes back to replicas as soon as they have caught up. We calculated the cost for users who write once in 50 reads: with 5 seconds of stickiness, 9.5 percent of reads go to the leader, and with 30 seconds, 45.7 percent. The stickiness is a dial between safety and leader load
- **Remember what the user has written**: Cosmos DB's session consistency gives each write a session token, which the client sends with reads. A replica serves the read if it has at least that version, and the client otherwise tries another. Aurora Global Database has a session mode in write forwarding in which reads wait until the session's own forwarded writes have reached the local region
- **Use causal sessions**: MongoDB's sessions return times for each operation, and with majority read and write concerns they give four guarantees: read your writes, monotonic reads, monotonic writes and writes follow reads. With weaker settings, such as local reads and a write acknowledged by the primary alone, none of the four holds
- **Mark the data as stale**: Facebook's memcache uses a remote marker for a key. A server that writes sets the marker in its region, writes to the master region, and deletes the cached key. A later read that finds no cache entry checks the marker, and if it exists, it goes to the master region instead of the possibly stale local database. It trades extra latency on a cache miss for a lower chance of stale reads, and it is best effort

## Fixing Time Going Backwards

For monotonic reads, the common fix is to send a user to the same follower each time, for example by hashing the user id.

A single follower applies the log in order, so its view moves forward. In our simulation, 1.4 percent of refreshes went back in time with a random follower each time, and 0 with the same follower.

The weak point is a failure: if that follower is replaced, the user moves to another that may be behind. Vogels notes that read your writes and monotonic reads rely on the client sticking to a server, or on version numbers that let the client discard older answers.

## Not Reading Lagging Followers

A router can also stop using a follower that is too far behind.

GitLab checks a replica's status before sending it reads, and skips it when it lags by more than a limit: its defaults are 8 MB of log difference, 60 seconds of lag time, and a check interval of 60 seconds. If no replica qualifies, reads fall back to the primary.

Azure Cosmos DB turns the idea into a promise called bounded staleness: reads lag the writes by at most K versions or T time, whichever comes first.

For a single region account, the smallest allowed bounds are 10 write operations or 5 seconds, and for a multi region account 100,000 operations or 300 seconds. If a partition exceeds the bound, writes to it are throttled.

## Deciding Screen by Screen

The tools above cost something, so apply them where staleness hurts:

| Screen | Read From | Why |
| --- | --- | --- |
| Search Results for Buyers | Any follower | A few seconds of delay goes unnoticed |
| My Listings After a Post | Leader, or a follower that has the write | The seller just wrote |
| Payment Status | Leader | A wrong answer causes a second charge |
| Seller Rating Average | Any follower | A rating that is a minute old is fine |

The rule of thumb is that data a user just changed, or that drives money, should come from a source that has the change. The rest can lag.

Replication with several leaders makes the gap worse, since each leader accepts writes of its own. That is [Replication with Multiple Leaders](/system-design/replication-many-leaders), and the formal names for these guarantees come in [Consistency Models](/system-design/consistency-models).

## Key Points

- Replication lag is the delay before a follower applies a write, and with asynchronous replication it is above zero, so reads from followers can be stale
- Measure it with the database's own views, and know their traps: an idle primary can look like lag, and MySQL's number can read 0 when far behind
- <u>Three anomalies follow</u>: not seeing your own write, time going backwards on refresh, and effects that appear before their causes
- Fix your own writes by reading from the leader for a while, as GitLab does, or with session tokens and causal sessions, and fix backwards reads by pinning a user to a follower
- Skip followers that lag past a limit, decide screen by screen what may be stale, and keep money and fresh writes on a source that has them
