> A **hot spot** is a key, a partition or a user that receives a share of the traffic far above its fair portion, so that one machine saturates while the others sit idle. Adding machines doesn't help, since the hot key lives on one of them. A **celebrity user** is the social version of the same problem: one account whose activity multiplies into a huge amount of work.

[Scaling Writes](/system-design/scaling-writes) ended on an imbalance: with 16 shards and skewed keys, the busiest shard took twice its share, and one key took 7.9 percent of the traffic.

Spreading load by hashing works for the average key. Hot spots are the exceptions that the average hides, and they decide whether the system holds on the busiest day.

On registration day, the textbook app has one: the calculus textbook that half the first year needs. Its listing page, its seller's inbox and its view counter receive traffic that no other listing does. If those rows live on one shard, that shard is the bottleneck for the whole app, whatever the other 15 are doing.

## Why More Machines Don't Help

A key lives in one place. Redis Cluster shows the rule in its simplest form: there are 16,384 hash slots, a key's slot is the CRC16 of the key modulo 16,384, and each key belongs to one slot and so to one node.

Hash tags place related keys together, and no part of the design spreads a single key across nodes.

Facebook's paper on its memcache deployment describes the effect from the reading side. It notes that highly requested items become more popular as more web servers are added to cope with more users, so buying more of the same machines makes the hot items worse.

Its answer was to replicate: multiple frontend clusters, and regional pools, so that the data requested most is available in several places.

The Google paper on its Slicer sharding service gives a clean measure, and we used it in the last topic: load imbalance is the ratio of the busiest task's load to the mean.

A value of 1 is perfect. Slicer reports that, across its production jobs, balancing reduced the imbalance by a median of 63 percent, and by as much as 99.3 percent for the most skewed job, compared with static sharding.

## Find the Hot Keys First

A fix has to start from knowing which keys are hot, and a counter for each key is too costly at billions of keys. Heavy hitter algorithms keep a small set of counters.

We tried the Space Saving algorithm on 100,000 requests over 200,000 keys with skewed popularity, and checked how many of the true top 10 keys it found:

| Counters Kept | True Top 10 Found |
| --- | --- |
| 20 | 5 |
| 50 | 7 |
| 100 | 10 |
| 500 | 10 |

With 100 counters, 0.05 percent of the key count, the sketch found the whole top ten. The idea is that heavy keys stay in the table because they keep coming back, and light keys are evicted.

The same idea can run in a proxy or a client, and report the top keys to dashboards, as in [Logs, Metrics and Traces](/system-design/observability).

Slicer's approach is to measure the load of each slice of the key space and act on it.

Its documented rules are specific: a slice is split when it is at least twice as hot as the mean slice, with a cap of 150 slices for each task, and moves are made in order of benefit divided by key churn, up to a budget of 9 percent of the key space.

It also automatically raises the replication of hot slices, which it calls asymmetric key redundancy, while it keeps a minimum for availability.

## Fixing Hot Reads

For a key that is read a lot, the data doesn't change often, and copies are cheap. The tools, from closest to the reader to farthest:

- **A cache in the client**: The hottest keys are answered from memory in the web server. Redis's client side caching works this way, with the server telling clients when a key they read changes
- **Replicate the hot key**: Several shards or nodes hold a copy, and readers pick one at random
- **A CDN or edge cache**: For pages and files, as in [Content Delivery Networks (CDNs)](/system-design/cdn)
- **Request coalescing**: Many requests for one missing key become one call, the defense of [Cache Stampedes](/system-design/cache-stampedes)

We simulated 400,000 reads over 200,000 keys with skewed popularity, on 16 shards, and compared the busiest shard with the average. In this stream the hottest key took 7.9 percent of the reads, and the next ones 3.9, 2.6, 2.0 and 1.6:

| Strategy | Busiest Shard Compared With the Average | Reads Reaching the Shards |
| --- | --- | --- |
| Hash Placement Alone | 2.05 | 100% |
| Hottest Key on 4 Shards | 1.46 | 100% |
| Hottest 10 Keys on 4 Shards Each | 1.30 | 100% |
| Hottest 10 Keys on 16 Shards Each | 1.22 | 100% |
| Hottest 100 Keys on 8 Shards Each | 1.11 | 100% |
| In Process Cache for the Hottest 100, 90% Local Hits | 1.14 | 63% |
| Local Cache for 100, and 10 Keys on 4 Shards | 1.06 | 63% |

<figure class="chart">
<div class="hbars" role="img" aria-label="Busiest shard against the average for five strategies">
<div class="hbar peak"><span>Hash Alone</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">2.05</span></div>
<div class="hbar"><span>Hottest Key on 4 Shards</span><span class="track"><span class="fill" style="--w: 71.2%"></span></span><span class="value">1.46</span></div>
<div class="hbar"><span>Local Cache for 100</span><span class="track"><span class="fill" style="--w: 55.6%"></span></span><span class="value">1.14</span></div>
<div class="hbar"><span>100 Keys on 8 Shards</span><span class="track"><span class="fill" style="--w: 54.1%"></span></span><span class="value">1.11</span></div>
<div class="hbar"><span>Cache and 10 Keys on 4</span><span class="track"><span class="fill" style="--w: 51.7%"></span></span><span class="value">1.06</span></div>
</div>
<figcaption>Busiest shard compared with the average, where 1.00 is perfectly even, from our simulation</figcaption>
</figure>

Replicating one key helped a lot, and the next hot keys became the problem, so the fix has to cover a set of keys and not a single one. The local cache did two jobs: it brought the imbalance close to the best of the replication variants and removed 37 percent of the reads from the shards.

The combination was the best, at 1.06. Redis's documentation adds the limit: a local cache is invalidated on each write to a key, so it helps keys that are read much more than they change, and counters that update often are better kept out of it.

## Fixing Hot Writes

A copy doesn't help a write, since each copy has to be updated. The fix is to split the key:

- **Write sharding with a suffix**: DynamoDB's guidance appends a number to the key, from 1 to 200 in its example, so the writes spread over partitions. A read queries each suffix and merges. A calculated suffix, derived from an attribute of the item, makes a single item readable directly
- **Sharded counters**: One counter becomes 16, each update picks one at random, and a read sums them. The cost is a read of 16 values
- **Aggregation before writing**: Count in memory and flush a total, as in [Scaling Writes](/system-design/scaling-writes)
- **Hashing sequential keys**: MongoDB's documentation explains that with a key that keeps increasing, the new inserts go to the chunk with the maximum value, and the shard holding it becomes the write bottleneck. A hashed shard key spreads the inserts, at the cost of range queries, which become broadcasts to the full set of shards

<figure class="diagram">
<p class="rowname">Write</p>
<div class="flow">
<div class="node">Update</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Random Part<small>1 to 16</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">One Counter</div>
</div>
<p class="rowname">Read</p>
<div class="flow">
<div class="node">Read</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Sum 16 Counters</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Total</div>
</div>
<figcaption>A hot write key split in 16 parts: the write picks one at random, and the read adds them up</figcaption>
</figure>

DynamoDB's limits make the stakes concrete. A partition is designed for 1,000 write units and 3,000 read units a second, and a single hot item can use up to that maximum and no more. Adaptive capacity moves capacity toward hot partitions, and isolates frequently accessed items, which helps until the item itself is the limit.

Cardinality matters too. MongoDB's documentation warns that a shard key with low cardinality limits scaling: a key with 7 possible values allows 7 chunks, and more than 7 shards add no capacity.

A hashed key doesn't change how often values repeat, so a key that most documents share stays hot even when hashed. This is our reading of the documentation.

## Celebrity Users

A hot user is a hot key with a multiplier. Take a seller with 20,000 followers who posts a new listing.

If each follower's feed is updated on write, the post causes 20,000 writes, and a student who follows many sellers has a feed built from many sources. If feeds are built on read instead, each follower's feed request has to gather recent posts from each seller followed.

The two have opposite costs: pushing multiplies the writes by the number of followers, and pulling multiplies the reads by the number of followed accounts. A common answer is a hybrid: push for ordinary accounts, where fan out is cheap, and pull for the few accounts with huge audiences, merging at read time.

The decision needs a threshold, and a rule such as followers above 10,000 is a number to tune from data. [Building News Feeds and Timelines](/system-design/feeds) works through the design, and [Pushing Live Updates to Clients](/system-design/push-updates) covers delivery.

The same logic applies to any heavy tenant. A university bookstore uploading 50,000 listings at once is a celebrity tenant, and [Isolating Tenants in a Shared System](/system-design/multi-tenancy) covers quotas and dedicated capacity for it.

## Choosing the Fix

| Symptom | First Move |
| --- | --- |
| One key dominates the reads | A local cache plus replicas of that key |
| One key dominates the writes | Split the key with a suffix or a sharded counter |
| Inserts pile on the newest range | A hashed or composite key |
| A few tenants dwarf the rest | Quotas, and dedicated shards |
| One account fans out to a huge audience | Pull for that account, push for the rest |
| The hot set changes quickly | Detect it automatically, as Slicer does, and replicate on demand |

For the textbook app, the plan is a local cache for the hot listing pages with a short time to live, a view counter split into 16 parts, a limit on how fast one seller can post, and a dashboard of the top keys by shard, so that the next calculus textbook is found by the metric and not by the pager.

Hot spots also feed [Absorbing Traffic Spikes](/system-design/traffic-spikes), since a spike is often a hot key in disguise.

## Pitfalls

- **Fixing one key**: The next hottest takes its place
- **Adding shards for a hot key**: It still lives on one of them
- **A local cache for a counter**: Each write invalidates the copies
- **A cache without request coalescing**: The expiry of a hot key sends a stampede to the database
- **A low cardinality shard key**: The cluster stops scaling at the number of values
- **No per key metrics**: The hot key is invisible until the shard falls over
- **One threshold forever**: The celebrity line moves as the user base grows

## Key Points

- A hot spot is a key or user with a share of the load far above average, and more machines don't help because the key lives on one of them
- In our simulation, hash placement left the busiest of 16 shards at 2.05 times the average, and a local cache plus replicas of the hottest 10 keys brought it to 1.06
- Find the hot keys with a small heavy hitter sketch: 100 counters found the true top 10 among 200,000 keys
- <u>Treat reads and writes differently</u>: replicate and cache hot reads, split hot write keys with suffixes or sharded counters, and hash keys that keep increasing
- For celebrity users, push for ordinary accounts and pull for huge ones, with a tunable threshold, and give heavy tenants quotas or their own capacity
