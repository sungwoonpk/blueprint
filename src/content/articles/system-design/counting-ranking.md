> **Counting and ranking at scale** is the problem of answering questions such as how many, how many different, which ones are most common, and what is this one's rank, over streams of events too large and too fast for the obvious answer. The tools are sharded counters for volume, **sketches** for approximate answers in small fixed memory, and ordered structures for ranks.

The textbook app shows each listing's view count, tells sellers how many different students looked, and keeps a trending list of the ten most viewed books this hour. At 2,700 views a second on registration day, each of those is a small program that becomes hard when the numbers get large.

A counter that each request increments is a hot row, a list of viewers grows without bound, and an exact top ten means sorting millions of values each minute.

The common thread is a trade: an answer that is exact costs memory or coordination, and an answer that is slightly off costs very little. Many questions allow the second, and some don't. The skill is knowing which is which.

## Five Questions, Two Kinds of Answers

| Question | Exact Way | Approximate Way |
| --- | --- | --- |
| How Many Events? | A counter | Sharded counters, summed on read |
| How Many Different? | A set of identifiers | HyperLogLog |
| How Often Does Each Key Occur? | A map of counters | Count-Min Sketch |
| Which Keys Are the Most Frequent? | A sorted structure or a heap | Top-K sketches |
| What Is the Rank of This One? | An ordered structure | Histograms of buckets |

A rule helps at the start: money, stock and anything a person is charged for must be exact, and the techniques of [Handling Contention for Scarce Resources](/system-design/contention) and [Avoiding Duplicate Work and Double Charges](/system-design/duplicate-work) apply. Views, likes, unique visitors and trends can usually be approximate, and the saving is large.

## Counting Volume: Split the Counter

A single counter that each request increments is a hot key, as in [Handling Hot Spots and Celebrity Users](/system-design/hot-spots). In Firestore, for example, you can't update a single document at an unlimited rate.

Its remedy is the distributed counter: a counter made of shards, each a small document with its own count. A write picks a random shard and increments it, and a read adds up the shards.

The trade: write throughput rises linearly with the number of shards, so a counter with 10 shards handles about 10 times the writes. Too few shards leads to retries and slow writes, and too many makes reads slower and more expensive, since a read loads each shard.

A common mitigation is a roll up document, refreshed on a slower schedule, that readers use instead of summing the shards. The counters are the same idea as the aggregation in [Scaling Writes](/system-design/scaling-writes): spread the writes, and pay on the read.

## Counting Different Things: HyperLogLog

How many different students viewed this listing? An exact answer keeps each identifier, and a hot listing seen by 2 million students needs 16 megabytes for the set, for one listing. **HyperLogLog** answers with a fixed small memory.

The idea is that a hash of an item looks like random bits, and the rarest pattern seen tells how many items there were: if the longest run of leading zeros in any hash is 20, around a million different items were probably hashed.

To reduce the noise, the hash picks one of many registers, each register keeps the longest run it has seen, and the estimate combines them.

<figure class="diagram">
<div class="flow">
<div class="node">Viewer ID</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Hash</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Register<small>chosen by first bits</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Keep Longest Run<small>of leading zeros</small></div>
</div>
<figcaption>How HyperLogLog counts without storing the viewers: it keeps the rarest hash pattern for each register</figcaption>
</figure>

The steps: the first bits of the hash choose a register, the position of the first 1 in the rest is recorded if it beats the register's value, and the estimate combines the registers with a harmonic mean, scaled by a constant. A correction handles small counts.

Redis implements it with a documented footprint of up to 12 KB and a standard error of 0.81 percent, for sets of up to 2 to the 64th power members, and less memory when few elements have been seen. The commands are PFADD to add an item, PFCOUNT to read the estimate and PFMERGE to combine sketches.

The merge is what makes it useful for time: the registers of two sketches combine by taking the larger of each pair, so a sketch for each hour merges into a day, with no raw data and no double counting of a student who came back.

We built it from the description and measured it on 1 million distinct viewers, over 20 runs for each size:

| Registers | Memory | Textbook Error | Measured Mean Error | Worst Error |
| --- | --- | --- | --- | --- |
| 256 | 0.2 KB | 6.5% | 4.4% | 10.6% |
| 1,024 | 0.8 KB | 3.3% | 1.5% | 6.5% |
| 4,096 | 3.1 KB | 1.6% | 1.3% | 3.1% |
| 16,384 | 12.3 KB | 0.8% | 0.95% | 2.2% |

The error shrinks with the square root of the memory: 64 times the registers gave about 8 times less error in the textbook column. The measured values vary with the sample and sit in the same range.

The row with 16,384 registers matches the Redis design, and it counts 1 million viewers with a typical error near 1 percent in 12 KB, against 8 MB for an exact set of 64 bit identifiers.

The limits matter. The sketch can't list who the viewers were, can't remove one, and its error is relative, so for a listing with 40 viewers an exact set costs less than the sketch. The sketch pays off for the hot listings, and the long tail can keep exact sets or small sparse sketches.

## Counting Each Key: Count-Min Sketch

How many views did each of 3 million listings get, in a stream, without a counter for each? A **Count-Min Sketch** is a grid of counters with several rows, one hash function for each row.

An update adds one to a counter in each row, picked by that row's hash, and a query reads the same counters and returns the smallest. Collisions can add to a counter and can't subtract, so the estimate is not below the true count, and the smallest of several is close to it.

<figure class="diagram">
<p class="rowname">Update</p>
<div class="flow">
<div class="node">Key</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">One Hash for Each Row</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Add 1 to Each Counter</div>
</div>
<p class="rowname">Query</p>
<div class="flow">
<div class="node">Key</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Read One Counter for Each Row</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Return the Smallest</div>
</div>
<figcaption>Count-Min Sketch: a grid with one hash for each row, and the smallest counter as the answer</figcaption>
</figure>

The sizing follows from a short argument. Each row overcounts a key by at most N divided by the width on average, where N is the stream length, so with a width of e divided by ε a row overcounts by more than ε times N with probability at most 1 over e.

The depth is the number of independent rows, and all of them overcount that much with probability e to the minus depth, which equals δ when the depth is the natural log of 1 over δ. The estimate is therefore within ε times the stream length with probability 1 minus δ, and counts below that threshold can't be trusted.

Its example, an error of 0.001 and a probability of 0.002, gives a width of 2,000 and a depth of 9.

We ran it over 1 million views of 300,000 listings with skewed popularity, five rows deep:

| Width | Memory | Average Overcount, Random Listings | Error for the Top 10 Listings |
| --- | --- | --- | --- |
| 2,000 | 0.1 MB | 216 views | 1.4% |
| 20,000 | 0.8 MB | 11 views | 0.06% |
| 200,000 | 8.0 MB | 0.5 views | Zero |

The sketch's error is the same for each key in absolute terms, so it is tiny for the heavy keys, the ones that matter, and large relative to the light keys. At 20,000 columns, the 10 busiest listings were within 0.06 percent.

For 300,000 keys an exact counter takes about 2 MB, so the sketch doesn't pay at this size. It pays when the keys number in the hundreds of millions or are unbounded, such as search queries or URLs, since the sketch's size doesn't grow with the number of keys.

Sketches also merge: the counters of two sketches built with the same sizes and hashes add up, so a sketch for each minute can be summed over a window, the approach for the windows of [Windowing and Watermarks](/system-design/windowing-watermarks).

## Finding the Top K

A trending list needs the few keys with the highest counts. With exact counts, a heap of size 10 does it in one pass: we measured the top 10 of 3 million scores at 0.43 seconds with a full sort and 0.02 seconds with a heap of 10.

For a stream where even exact counts don't fit, the heavy hitters algorithms keep a small table. [Handling Hot Spots and Celebrity Users](/system-design/hot-spots) showed one, Space Saving, finding the true top 10 with 100 counters.

Redis offers a Top-K based on HeavyKeeper, which pairs a table of probabilistic counts, with exponential decay so that a light item loses ground against a heavy one, with a min-heap of the K leaders.

Trending hashtags and detecting denial of service are typical uses. The width is sized from K times its log and the depth from the log of K. The commands are reserve, add, query and list.

For a trend that means the last hour, not the whole history, keep a sketch for each short bucket, say each minute, and merge the last 60 for the answer, dropping the oldest bucket as the window moves.

## Ranking

A rank is harder than a count, since it depends on the other items. Redis's sorted sets are the standard tool. A sorted set holds unique members, each with a score, ordered by score, and it is implemented with both a skip list and a hash table.

Adding or updating a member, ZADD or ZINCRBY, and finding its position, ZRANK, are O(log N), while reading a range from a position is O(log N plus the items returned). A leaderboard is one sorted set, with the seller as the member and the number of sales as the score.

The practice: keep a hash for the details of each member, use one key for each time window with an expiry, and combine windows with a union of sorted sets.

It claims millions of ranked members in roughly 500 MB of memory and sub millisecond operations, claims which come from the page and not from our measurements, and it contrasts them with a relational database where an exact rank needs an ordering across the table.

Exact ranks over a huge set are costly in any system, so a compromise is common: exact ranks for the top 100, shown to each viewer, and an approximate rank for the rest, from a histogram of score buckets.

A seller at rank 41,203 of 90,000 doesn't need the exact figure, and the bucket count gives a rank within a small error. The same histograms serve percentiles.

## Where the Work Runs

The computation can sit in three places:

- **In the request**: Increment a counter or a sketch as the event arrives, cheap for the structures above, and exposed to the hot key problem
- **In a stream job**: Events go to a log, and a job maintains counters, sketches and top K lists with windows, as in [Stream Processing](/system-design/stream-processing)
- **In a batch job**: A nightly job computes exact figures from the full event history, as in [Batch Processing](/system-design/batch-processing), and corrects the approximate numbers from the stream

The combination of a fast approximate stream and a slow exact batch is common, with the batch results replacing the stream's estimates after the fact. Each event needs an identifier so that a retry or a duplicate message doesn't count twice, the idempotency of [Idempotency and Safe Retries](/system-design/idempotency).

## A Plan for the Textbook App

| Number | Technique |
| --- | --- |
| View Count of a Listing | A counter in memory on each server, flushed in batches into 16 shards of the row |
| Unique Viewers of a Listing | A HyperLogLog for listings with many viewers, an exact set for the rest |
| Views for Each Search Query | A Count-Min Sketch of 20,000 by 5 for each minute, merged over the window |
| Trending Books This Hour | A Top-K on the merged sketches, refreshed each minute |
| Seller Leaderboard | A sorted set for each week, exact for the top 100, bucket ranks beyond |
| Sales, Inventory, Payments | Exact, in the database, with transactions |

## Pitfalls

- **One counter row for each listing**: The hot listing sets the ceiling
- **A set for each unique count**: The hot listing needs megabytes
- **Using an approximate count for money**: A small error is a wrong charge
- **Trusting a sketch for rare keys**: The error is the same for each key, so light keys can be wrong by a lot
- **Counting events twice**: A retry without an identifier adds to the total
- **Sorting the whole set for a top K**: A heap does it in a fraction of the time
- **Sketches with different hashes merged**: The result is meaningless

## Key Points

- Choose exact or approximate by what a wrong number costs: money and stock exact, views, uniques and trends approximate
- Split hot counters into shards and sum on read, and expect reads to cost more as shards grow
- HyperLogLog counted 1 million distinct viewers in 12 KB with an error near 1 percent in our test, against 8 MB for an exact set, and sketches merge across time by taking the larger register
- <u>A Count-Min Sketch doesn't undercount</u>, and its error is the same for each key, so it is accurate for the heavy keys: at 0.8 MB the top 10 listings were within 0.06 percent
- Use a heap or a Top-K sketch for trends, a sorted set for ranks, exact ranks for the top and bucket ranks for the rest, and a batch job to correct the stream's estimates
