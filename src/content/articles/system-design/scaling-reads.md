> **Scaling reads** is the problem of serving many more reads than a single database can answer, when writes are a small share of the traffic. The solutions form a ladder: make each read cheaper, avoid the read, spread the reads over more copies, and move the copies closer to the readers.

On registration day the textbook app sees 3,000 requests a second, and about 90 percent of them are reads: searching, opening a listing, looking at a seller.

That is 2,700 reads a second against one database that, in our assumption, answers 1,000 a second at its best and 800 a second at the 80 percent planning figure from [Capacity Planning](/system-design/capacity-planning).

The reflex is to buy a bigger database. A bigger database is the most expensive rung of the ladder and the one that stops working first. The rungs below it are cheaper, and they come in a useful order, since each one removes work that the next doesn't have to handle.

## The Ladder

| Rung | Idea | What It Costs |
| --- | --- | --- |
| 1. Cheaper Reads | Indexes and better queries, so each read does less | Slower writes and more storage |
| 2. Skip the Database | A cache answers repeated reads | Stale data and a new failure mode |
| 3. More Copies | Read replicas share the load | Replication lag |
| 4. Closer Copies | A CDN or regional copies, so reads travel less | Invalidation and cost |
| 5. Precomputed Answers | Store the result in the shape it is read | Extra writes and a second copy of the data |

The order isn't a rule. It is a bias: the earlier rungs add less machinery, and each makes the later ones more effective. A cache in front of an unindexed query hides a problem and still pays 24 milliseconds on each miss.

<figure class="diagram">
<div class="flow">
<div class="node">Student</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">CDN<small>rung 4</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Cache<small>rung 2</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack"><div class="node">Replica<small>rung 3</small></div><div class="node">Leader</div></div>
</div>
<figcaption>Where each rung acts on a read, from the student toward the database</figcaption>
</figure>

## Rung 1: Make the Read Cheaper

[Indexes and Query Optimization](/system-design/indexing) covered how an index turns a scan into a lookup. The size of the difference is easy to underestimate. We measured it on SQLite with 1 million listings on one machine, looking up the listings of one seller:

| Query | Time for One Lookup |
| --- | --- |
| No Index on the Seller Column | 24.1 ms |
| With the Index | 0.010 ms |

The indexed query was about 2,350 times faster. The numbers are for a small database in one process, so they show the order of magnitude and not a benchmark.

The lesson is to look at the slow queries first, with the tools of [Logs, Metrics and Traces](/system-design/observability), before building anything. A read that costs 24 ms of database time makes a server's worth of capacity disappear at 40 reads a second.

## Rung 2: Skip the Database

[Where to Put a Cache](/system-design/where-to-cache) and [Caching Patterns for Reads and Writes](/system-design/caching-patterns) covered the mechanics. Here the question is how much a cache removes. Facebook's memcache fleet runs the pattern at very large scale: a demand filled look aside cache.

A web server asks the cache for a key, goes to the database on a miss, and fills the cache. For writes, it updates the database and then deletes the cached value, and it chooses delete over update because deletes are idempotent. The cache isn't the source of truth and is allowed to evict.

Facebook's memcache handles billions of requests a second and holds trillions of items. The lesson for this topic is in what went wrong at scale, and how it was fixed with **leases**:

- **Stale sets**: Two concurrent operations are reordered, and an old value ends up in the cache after a delete
- **Thundering herds**: A key with heavy reads and writes is invalidated repeatedly, and many readers fall through to the database at once
- **The fix**: On a miss, the cache gives one client a 64 bit token for that key, and the client must present it to set the value. A delete invalidates the token, so a stale set is refused. By default a server issues a token at 10 second intervals for each key, and other clients are told to wait a moment and retry, when the value is usually there
- **The result**: For a set of keys prone to herds, the peak database query rate over a week was 17,000 a second without leases and 1,300 a second with them

How much a cache helps depends on how skewed the reads are. We simulated an LRU cache over 300,000 items, with request popularity following a Zipf distribution, which says that a few items get most of the requests. The skew is a parameter we don't know for the textbook app, so the table shows three:

| Cache Size, as a Share of Items | Skew 0.8, Mild | Skew 1.0 | Skew 1.2, Strong |
| --- | --- | --- | --- |
| 0.1% | 8.5% | 34.9% | 68.9% |
| 1% | 21.9% | 54.7% | 83.8% |
| 5% | 37.9% | 69.1% | 90.7% |
| 10% | 47.5% | 75.4% | 92.9% |

Each cell is the hit ratio. A cache holding 1 percent of the items answered between 22 and 84 percent of the reads, depending on the skew alone, so the first step is to measure the real distribution of reads from the logs.

<figure class="chart">
<div class="hbars" role="img" aria-label="Hit ratio for three skews of the same cache size">
<div class="hbar"><span>Mild, Skew 0.8</span><span class="track"><span class="fill" style="--w: 21.9%"></span></span><span class="value">21.9%</span></div>
<div class="hbar peak"><span>Skew 1.0</span><span class="track"><span class="fill" style="--w: 54.7%"></span></span><span class="value">54.7%</span></div>
<div class="hbar"><span>Strong, Skew 1.2</span><span class="track"><span class="fill" style="--w: 83.8%"></span></span><span class="value">83.8%</span></div>
</div>
<figcaption>Hit ratio of a cache holding 1 percent of the items, by skew of the reads, from our simulation</figcaption>
</figure>

Registration day is likely to be strongly skewed, since students look for the same few course books.

Turn the hit ratio into servers. At skew 1.0, with 2,700 reads and 300 writes a second, and 800 queries a second for each database server:

| Cache Size | Hit Ratio | Reads Reaching the Database | Database Servers, Reads Plus Writes |
| --- | --- | --- | --- |
| No Cache | 0% | 2,700 | 4 |
| 0.1% | 34.9% | 1,758 | 3 |
| 1% | 54.7% | 1,223 | 2 |
| 5% | 69.1% | 834 | 2 |
| 10% | 75.4% | 664 | 2 |

These are our arithmetic, with a spare server for failures not included. The gains shrink: from 1 to 10 percent the hit ratio goes up 21 points and the server count doesn't change, since the writes and the minimum of two servers set the floor.

A cache adds a risk of its own. A service can become addicted to its cache: behavior differs between a cached and an uncached object, and a cache failure or a shift in the hit distribution can cause an outage, since the database wasn't sized for the miss traffic.

Cold starts have the same effect, with a new server's empty local cache flooding its dependency, and the remedies are request coalescing, a fallback, and testing with the cache switched off.

It also describes soft and hard time limits, serving cached data past the soft limit while the dependency is unhealthy, and caching negative answers, where a failure to do so has caused higher failure rates. [Cache Stampedes](/system-design/cache-stampedes) and [Load Shedding and Graceful Degradation](/system-design/load-shedding) are the two defenses to have ready.

## Rung 3: More Copies

A read replica takes the leader's changes and serves reads, as in [Single Leader Replication](/system-design/replication-one-leader). With the cache absorbing 69 percent at skew 1.0, 834 reads a second remain for the database, which a replica can share with the leader, and the leader also takes the 300 writes a second.

The price is [Replication Lag](/system-design/replication-lag). In PostgreSQL streaming replication is asynchronous by default, with a typical delay of under one second if the standby can keep up, so the same query run almost at the same moment on the primary and the standby might return different results.

A student who edits a listing and reloads it may see the old price.

The options for read your writes, in order of effort:

- **Read from the leader after a write**: For a short window, such as 5 seconds, a user's reads go to the leader
- **A version token**: The write returns a position, and a replica serves the read after it has caught up to that position
- **Synchronous replay**: In PostgreSQL, in simple cases, a setting that makes a commit wait until a synchronous standby has replayed it allows load balancing with causal consistency, at the price of slower commits
- **Accept it**: For a page of search results, a few seconds of staleness is fine

A second cost is conflict with the replica's own replay. Replaying the leader's changes can conflict with a long running query on the standby, and a setting for the maximum delay decides whether the query is canceled or replay waits.

Its guidance is a low value for a standby that exists for availability and a large one for a standby used for reports, so reports and user reads belong on different replicas.

Managed services add their own details. Amazon RDS reports a `ReplicaLag` metric in seconds, promotes a replica in minutes or more, doesn't add replicas by itself, and shows higher lag for cross region replicas. The lag metric is a signal worth an alert, as in [Alerting and Dashboards](/system-design/alerting).

## Rung 4: Closer Copies

A photo is a read too, and it doesn't need the database. The textbook app's 9 million photos, about 2.7 terabytes, are static files that a [Content Delivery Networks (CDNs)](/system-design/cdn) can serve from near the student, which takes most of the bytes off the app's servers and network.

Static or slowly changing pages can be treated the same way. The cost is invalidation: a changed file has to disappear from the edge, or have a name that changes with its content.

## Rung 5: Store the Answer in the Shape It Is Read

When many reads compute the same expensive result, compute it once. A page that shows a seller's rating from 4,000 reviews can read a stored average that is updated on each new review, and a search results page can read from an index built for search.

This is the idea of [CQRS](/system-design/cqrs): a read model shaped for questions, fed by changes from the write side, with the lag and the duplicate data that implies. It is the most powerful rung and the most work, and it belongs after the cheaper ones.

## Choosing and Sequencing

Start from the evidence:

| What the Data Shows | First Move |
| --- | --- |
| A few slow queries dominate | Add indexes and fix the queries |
| The same keys are read again and again | Add a cache, sized from the skew |
| Reads are spread over many different keys | Add replicas |
| Large static files dominate the bytes | Use a CDN |
| An expensive aggregate is recomputed often | Store a precomputed view |
| Writes are the limit, not reads | See [Scaling Writes](/system-design/scaling-writes) |

For the textbook app on registration day, the plan combines the first four rungs: indexes on the seller and on the course and date, a cache of about 5 percent of the listings, a read replica beside the leader for what remains, and a CDN for photos.

Our arithmetic gives two database servers where the first design needed four, with room on the leader for its writes. Each rung gets a metric, the hit ratio of the cache and the lag of the replicas, so a change in the read pattern shows up as a number and not as an outage.

The same cache that saves four servers is a dependency for the other 69 percent of reads, so the plan includes a load test with the cache off, as in [Load Testing](/system-design/load-testing), and a rule for what the app does when it is: shed the least important reads first.

## Pitfalls

- **Caching before measuring**: A cache over a missing index hides it
- **A cache sized by guess**: The skew decides the hit ratio, and it can't be known without logs
- **A database sized for the hits**: The miss traffic during a cache failure arrives with no capacity behind it
- **Replicas for the freshest data**: A reader who just wrote sees the old value
- **One replica for users and reports**: A long report query cancels, or stalls, the replay
- **Counting the average**: Hot items, covered in [Handling Hot Spots and Celebrity Users](/system-design/hot-spots), concentrate load on single keys
- **No metric for each rung**: The ladder is unmanaged

## Key Points

- Scaling reads is a ladder: cheaper reads, skipped reads, more copies, closer copies, and precomputed answers, in that order of cost and risk
- An index made a lookup in 1 million rows about 2,350 times faster in our test, so look at the slow queries before adding machinery
- A cache's value depends on skew: in our simulation a 1 percent cache answered 22 to 84 percent of reads, from mild to strong skew, and at skew 1.0 a 5 percent cache cut the database from 4 servers to 2
- <u>Plan for the cache and the replicas to fail</u>: a cache you depend on needs a load test with it off, and replicas need a read your writes rule and a lag alert
- Facebook's leases show the failure modes at scale: stale sets and thundering herds, fixed by a token per key and one issue at 10 second intervals, which cut a peak of 17,000 database queries a second to 1,300
