> **Memcache at Facebook** is a distributed key value cache built by putting a stateless client layer, invalidation pipelines and a handful of protocols around plain memcached servers. It serves billions of requests a second in front of MySQL, and its design answers one question at three sizes: how to keep a cache fast and fairly fresh when one server, one cluster and then several continents are involved.

The textbook app has a cache in front of its database, and registration day shows what a cache really is. At 8:59 the hit ratio is 95 percent and the database is calm.

At 9:00 the cache of one hot listing is invalidated by a price change, a thousand students ask for it in the same 30 milliseconds, and each of them goes to the database.

[Where to Put a Cache](/system-design/where-to-cache) and [Caching Patterns for Reads and Writes](/system-design/caching-patterns) gave the mechanics. This topic is about what happens when the cache becomes the most important system in the building.

Facebook's was exactly that: one page view fetched hundreds of values, most users were readers, and the database could not have survived one page view without it.

We follow the design in the order the system grew: inside one cluster, across clusters in a region, and across regions. We add our own models of the two ideas that matter most, leases and invalidation races, and it builds on [Cache Stampedes](/system-design/cache-stampedes) and [Cache Invalidation](/system-design/cache-invalidation).

## A Look Aside Cache With Deletes

The base pattern is a demand filled look aside cache. A web server asks the cache for a key. On a miss it reads the database and puts the value in the cache.

On a write it updates the database and then deletes the cached value. It deletes and doesn't update because a delete is idempotent: repeating it does no harm, while a repeated or reordered update can leave an old value behind.

The cache isn't the source of truth, so it is allowed to evict anything. That one rule keeps the design simple and makes it fragile in a particular way, which the rest of the topic is about: a cache that is allowed to forget is also a cache that the system quietly depends on.

The workload justified the shape. Users read an order of magnitude more than they write, so a cache pays well. The data came from many places, MySQL, HDFS and other services, so the cache had to be a general key value store and not tied to one database.

And a page was built from a graph of dependent data, so the client fetched what it could in parallel, in batches of about 24 keys on average, with an average page touching 521 distinct items.

## Inside One Cluster: Latency and Load

A cluster has hundreds of memcached servers, and the keys are spread over them by consistent hashing. A page that needs 521 items talks to many servers at once, and the web servers talk to the whole set of memcached servers, which brings two problems: latency and load.

### The Client Does the Work

Memcached servers don't talk to each other. The intelligence lives in a stateless client, either a library or a proxy called mcrouter, which handles routing, batching, serialization and retries. That keeps the servers simple and the software easy to change.

It also leaves room for a cheap trick: reads go over UDP, with no connection to set up, and a dropped or late reply counts as a miss.

About 0.25 percent of gets were dropped under peak load, and using UDP cut latency by about 20 percent compared with TCP through the proxy. Writes and deletes go over TCP, where a confirmed delivery matters.

Many to many traffic causes incast congestion: when a client asks for many keys, the replies arrive together and overwhelm a switch. The client keeps a sliding window of outstanding requests that grows slowly on success and shrinks when a request goes unanswered, like TCP does.

A window that is too small makes a page wait through serial batches, and one that is too large drops replies and sends the requests to the database.

### Leases, Against Stale Sets and Herds

Two failures dominate the cost of a miss. A **stale set** happens when concurrent operations reorder: one reader fetches the old value from the database, a writer updates the database and deletes the key, and then the reader puts the old value in the cache, where it stays until something deletes it again.

A **thundering herd** happens to a key with heavy reads and frequent writes. Each write deletes the value, and the many readers that miss go to the database at once.

Both are handled by one mechanism, a **lease**. On a miss, the cache hands the client a 64 bit token bound to that key, and the client must present the token when it sets the value.

A delete of the key invalidates the outstanding token, so a stale set is refused. This is the same idea as load linked and store conditional in a processor.

To handle herds, the server also limits how often it hands out tokens: by default one for each key at 10 second intervals. A reader that asks within that window is told to wait a moment and try again, and the holder of the token has usually filled the cache within a few milliseconds by then.

We modeled the race with our own timings. A reader misses and reads the old value from the database after about 2 ms. A writer updates the database after about 5 ms and its delete reaches the cache a millisecond later. The reader's set arrives about 3 ms after its read:

| Design | Overlapping Races That Leave a Stale Value |
| --- | --- |
| Plain Look Aside Cache | 20.1% |
| With Leases | 0% |

The timings are ours and the point is the mechanism: without a token, a late set cannot tell that the key was deleted after the reader started. The herd is easier to see as a rate.

A hot key read 3,000 times a second and invalidated four times a second sent about 295 queries a second to the database in our model, because each invalidation sent the readers of the next 25 ms.

With one token for each 10 second window, the same key sent about 0.1 a second. The real system reported the same effect on the keys most prone to herds: a peak of 17,000 database queries a second without leases, and 1,300 with them.

<figure class="chart">
<div class="hbars" role="img" aria-label="Database queries a second for one hot key, with and without a lease">
<div class="hbar peak"><span>No Lease</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">295</span></div>
<div class="hbar"><span>With a Lease</span><span class="track"><span class="fill" style="--w: 0.1%"></span></span><span class="value">0.1</span></div>
</div>
<figcaption>Average database queries a second for one hot key invalidated four times a second, from our model</figcaption>
</figure>

The price is waiting or staleness, and the system softens it. When a key is deleted, its old value sits in a short lived side structure, and a get can return the stale value marked as stale.

Applications that can make progress with slightly old data, which most can since a cached value tends to be an older snapshot of the database, don't wait.

### Pools, Replication and the Gutter

A cluster serves many kinds of data, and one kind can hurt another. Low churn keys that are still valuable get evicted by high churn keys that nobody reads again, so the servers are split into **pools**.

A default pool holds most keys, a small pool holds keys that are read often and cheap to miss, and a large pool holds keys that are rarely read and costly to miss.

Some key families are replicated within a pool instead of split: those where a request asks for many keys at once, the whole set fits on a server or two, and the request rate exceeds what one server can handle.

Splitting the key space wouldn't reduce load, since each client request would just split into several smaller ones and each server would see the same number of requests. Replicas let a request go to any copy, halving the load per server, at the price of sending invalidations to each replica.

Failures need their own defense. When a server dies, its keys miss, and the database takes a surge. The automatic repair takes up to a few minutes, long enough to cascade.

So about 1 percent of the servers in a cluster form a **gutter** pool. A client that gets no answer from a server asks the gutter, and on a miss there, reads the database and fills the gutter with an entry that expires quickly.

The design avoids the obvious alternative, rehashing the dead server's keys over the remaining servers. A single key can account for 20 percent of a server's requests, and the server that inherits it can be overloaded in turn, which starts a cascade.

The gutter sends the load to idle machines instead. In practice it cut client visible failures by 99 percent and turned 10 to 25 percent of failures into hits each day.

## Inside a Region: Several Clusters

A single cluster can't scale forever: hot items get hotter as web servers are added, and incast worsens with more memcached servers. So the system splits into several front end clusters, and the clusters in one place, together with a storage cluster that holds the databases, form a **region**.

### One Pipeline for Invalidation

The storage cluster holds the authoritative data, and it is responsible for invalidating the caches in each front end cluster. The change is built into the write itself.

The SQL statements that change data carry the cache keys to invalidate, and a daemon beside each database reads the commit log, picks out the deletes and sends them to the caches.

Reading the commit log has three advantages. A delete is sent after the transaction commits, and not before. The daemon batches deletes into fewer packets, which improved the median number of deletes per packet by 18 times, and it sends them to a small set of proxies in each cluster that fan them out.

And a lost or misrouted delete can be replayed, because the log is reliable, which a web server broadcasting deletes directly can't offer. Most deletes find no value to remove: just 4 percent of deletes issued ended in an actual invalidation, which is why batching from one log is far cheaper than doing it everywhere.

### Regional Pools and Warming a Cold Cluster

Each cluster caches what its users ask for, so popular data is cached in each cluster. That is wasteful for large items that are rarely read, so some are kept in a **regional pool** shared by the clusters of a region.

The trade is a crossing between clusters, with 40 percent less bandwidth on average, for fewer copies. The rule of thumb was practical: items with low request rates, such as a family accessed by one user, were moved to the pool, and the large and popular ones stayed replicated.

A new cluster, or one coming back from maintenance, has an empty cache, and the empty cache exposes the database.

Cold cluster warmup lets a cold cluster read from a warm one on a miss instead of from the database, and fills itself. A cold cluster reached full capacity in a few hours instead of a few days.

The race is the one the leases fix, in another place: a delete in the cold cluster could be followed by a read of the old value from the warm cluster that hasn't seen the delete yet.

The fix is a delete with a hold off time, by default 2 seconds, during which adds are rejected, so a stale value copied from the warm cluster can't be inserted just after the delete.

## Across Regions: Consistency

Several regions put web servers close to users and survive the loss of a region. One region holds the master databases and the others hold read replicas fed by MySQL replication.

The challenge is one that the database world calls [Replication Lag](/system-design/replication-lag): a replica can trail the master, and the cache in front of the replica must not make it worse.

Two cases matter. When a write comes from the master region, the invalidation must not reach a replica region before the data does, or a reader would refill the cache with the old value from the lagging replica. That is why the invalidation pipeline rides the same channel as database replication.

When a write comes from a replica region, the writer's next request could miss their own change. The fix is the **remote marker**. A server that updates data first sets a marker in its region, then writes to the master with the invalidation embedded, and deletes the key in its own cluster.

A later read that misses finds the marker and goes to the master region instead of the local replica. It trades extra latency on those misses for a lower chance of stale reads. The marker isn't a cache entry, since losing it makes data look fresh when it isn't, though in practice evictions of markers were rare.

The consistency is best effort and eventual, and the authors were frank about it: stricter models rarely survived the cost. Facebook and memcache grew together, and the application engineers and the systems engineers settled on a model simple enough to understand and cheap enough to run.

## What the Cache Taught

Several lessons carry beyond memcached. Pushing complexity into a stateless client kept servers simple. Making invalidation part of the write, read from a reliable log, made it replayable. Separating the cache by pool and region made each part tunable.

And a cache has to be treated as part of the load path: if it fails, the database has to survive the miss traffic, which is the reason for the gutter and for rate limits on tokens.

Single server work mattered as well. Fine grained locking in memcached tripled the peak get rate for hits from 600,000 to 1.8 million items a second.

An adaptive allocator moved memory between size classes as workloads changed, and a transient item cache evicted short lived keys at once, which shrank the share of the pool used by one key family from 6 percent to 0.3 percent with no loss in hit rate.

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Writes | Update the database, then delete the cache key, and don't update the cache directly |
| Hot Listings | A short lease token for each key, with stale values allowed for browse pages |
| Invalidation | Read the database change log and delete keys from it, with batching |
| Failures | A small standby pool of cache servers, and not a rehash of the dead server's keys |
| Pools | A small pool for cheap to miss keys, and a large one for costly to miss keys |
| Second Region | A marker for a seller's own recent write, so their reads go to the primary |
| Safety | A load test with the cache off, as in [Scaling Reads](/system-design/scaling-reads) |

## Pitfalls

- **Updating the cache on write**: A repeated or reordered update leaves an old value behind
- **Filling the cache from a stale read**: A late set undoes a delete
- **No limit on refills for a hot key**: Each invalidation sends a crowd to the database
- **Rehashing a dead server's keys**: The next server inherits the load and falls over
- **One pool for each kind of key mixed together**: High churn keys evict valuable ones
- **A cold cache with no warmup**: The database takes the first hours of traffic alone
- **Invalidations broadcast by web servers**: Hard to batch and impossible to replay

## Key Points

- Memcache at Facebook is a look aside cache with deletes on write, a stateless client layer, and protocols for leases, failure handling and invalidation, serving billions of requests a second
- Leases fix stale sets and herds: a token per key, refused after a delete, and issued once in each 10 second window, which in our timing model removed the 20.1 percent of stale races and in production cut a hot key set from 17,000 database queries a second to 1,300
- <u>A cache has to be survivable</u>: a gutter pool of about 1 percent of servers took over the load of failed ones, since rehashing sends a hot key's load to one neighbor
- Invalidation is driven by the database commit log, batched and replayable, with regional pools to cut copies and a hold off to keep a warm cluster from refilling a cold one with stale data
- Across regions, send invalidations with the replication stream, and use a remote marker so a writer in a replica region reads from the master until the change arrives
