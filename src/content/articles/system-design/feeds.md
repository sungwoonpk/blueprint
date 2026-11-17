> A **feed**, or timeline, is a personal, ordered list of recent items from the people, courses or topics a user follows. The central design choice is when to do the work of building it: when an item is posted, which is **fan-out on write**, or when the feed is opened, which is **fan-out on read**. Most real systems mix the two.

The textbook app adds a feed: students follow sellers and course groups, and the home page shows new listings from the ones they follow, newest first. The first version is a query: find the accounts this student follows, gather their latest listings, sort, and return the top 20.

It works for a hundred users and falls apart as the numbers grow, because the query runs on each page view and touches as many accounts as the student follows.

A feed is a read heavy product with an awkward shape. Each user's feed is different, so it can't be cached once for the whole audience. A post by one account has to show up in thousands of feeds. The ratio of reads to writes decides which side should do the work.

## Why It Is Hard

Three numbers frame the problem. Twitter's engineers described its timeline service in 2012: about 300,000 requests a second spent reading timelines against about 6,000 a second on writes, which is about 50 reads for each write.

Those figures are from a time long past, so they show the shape and not today's system. Meta's TAO, the store behind its social graph, handles over a billion reads and millions of writes each second, which puts reads even further ahead.

When reads dominate, work moved from the read to the write pays off: do it once, when the post arrives, and the 50 reads that follow find the answer ready.

## Pull, Push or Both

**Fan-out on read**, or pull: the feed is built when it is opened. The service looks up the accounts the user follows, fetches each one's recent posts, merges them by time and returns the top. Writes are cheap, a post is stored once, and reads cost as many lookups as the user follows accounts.

**Fan-out on write**, or push: when a post arrives, a worker looks up the author's followers and inserts the post into each follower's stored timeline. Reads are one lookup of a ready list. A write costs as many inserts as the author has followers.

<figure class="diagram">
<p class="rowname">Pull</p>
<div class="flow">
<div class="node">Open Feed</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Get Follows</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Fetch Posts</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Merge</div>
</div>
<p class="rowname">Push, Write Side</p>
<div class="flow">
<div class="node">New Post</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Worker</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Follower Timelines</div>
</div>
<p class="rowname">Push, Read Side</p>
<div class="flow">
<div class="node">Open Feed</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Read One List</div>
</div>
<figcaption>Where the work happens: at read time for pull, at post time for push</figcaption>
</figure>

Twitter's description of its push design is a useful example:

- **A timeline is a list of ids**: A Redis list of 800 entries for each user, holding tweet ids and a few flag bits, not the text. The text is fetched by id when the page is built, a step called hydration
- **Active users get one**: Those who logged in within about 30 days. The others have no stored timeline, which saves memory, the limiting resource
- **Copies**: Each timeline is held on three machines
- **Rebuilding**: A lost timeline is reconstructed from the social graph and the stored tweets of the accounts followed
- **Asynchronous delivery**: The tweet request returns quickly, and the fan-out happens behind a queue

The costs of push show up with large accounts. A tweet from an account with 20,000 followers causes up to 20,000 inserts.

The write up notes that a tweet by a million follower account takes seconds to fan out, with 3.5 seconds at the median to reach 1 million followers and up to 5 minutes at the 99th percentile, against a goal of 5 seconds.

It also describes the compromises: a celebrity's reply can arrive before the original, and some followers see a post minutes before others.

The remedy it points to is a hybrid: for the few accounts with huge audiences, skip the fan-out and merge their recent posts into the timeline at read time. The text says Twitter was moving toward doing more of the work on reads for those users.

## What the Hybrid Buys

We simulated a graph of 200,000 users, each following 50 accounts chosen with skewed popularity. The most followed account has 123,638 followers, 62 percent of users, and the 100th has 4,747.

Each account posts once a day and each user opens the feed 25 times a day. A pool of workers delivers 10,000 timeline inserts a second, an assumption. The table counts the work in a day:

| Design | Timeline Inserts | Feed Lookups | Slowest Fan-Out |
| --- | --- | --- | --- |
| Push to the Whole Follower List | 10,000,000 | 5,000,000 | 12.4 s |
| Pull When Reading | 0 | 250,000,000 | No fan-out |
| Hybrid, Pull Above 10,000 Followers | 9,017,888 | 29,552,800 | 1.0 s |
| Hybrid, Pull Above 2,000 Followers | 8,028,759 | 54,281,025 | 0.2 s |
| Hybrid, Pull Above 500 Followers | 6,777,367 | 85,565,825 | 0.1 s |

Each row is a position on a trade:

- **Pure pull** moved 250 million lookups to the read side, 50 for each feed open
- **Pure push** did 10 million inserts, 50 times fewer operations, and the biggest account took 12.4 seconds to fan out
- **The hybrid at 10,000 followers** treated 38 accounts as pulled, and each user merged on average 4.9 of them at read time. It cut the slowest fan-out to 1.0 second, and raised the lookups from 5 million to 29.6 million
- **Lower thresholds** pushed more of the work to reads: each step lowered the inserts and the worst delay, and raised the lookups

<figure class="chart">
<div class="hbars" role="img" aria-label="Slowest fan-out in seconds for four designs">
<div class="hbar peak"><span>Push to Followers</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">12.4 s</span></div>
<div class="hbar"><span>Hybrid, 10,000</span><span class="track"><span class="fill" style="--w: 8.1%"></span></span><span class="value">1.0 s</span></div>
<div class="hbar"><span>Hybrid, 2,000</span><span class="track"><span class="fill" style="--w: 1.6%"></span></span><span class="value">0.2 s</span></div>
<div class="hbar"><span>Hybrid, 500</span><span class="track"><span class="fill" style="--w: 0.8%"></span></span><span class="value">0.1 s</span></div>
</div>
<figcaption>Slowest fan-out for one day of posts in our simulation, in seconds</figcaption>
</figure>

The right threshold depends on which is scarce: read capacity, write capacity, or the patience of followers. It is a number to tune from data, and it can differ for each account.

## Storing a Feed

A feed system is three stores with different needs:

- **The post store**: The posts themselves, by id, written once and read by id many times, a natural fit for the caches of [Scaling Reads](/system-design/scaling-reads)
- **The social graph**: Who follows whom, read in both directions: the accounts a user follows, and the followers of an account. Meta's TAO is built for this. It models objects and typed, time stamped associations, offers point and range queries, has no server side traversals, and is sharded across hundreds of thousands of shards, each in one MySQL database and one set of cache servers
- **The timelines**: A per user list of ids, in memory, capped in length

The usual timeline structure is a capped list. In Redis, `LPUSH` adds to the head in constant time, `LTRIM` cuts the list to a fixed length, and `LRANGE` reads a window.

The first two are constant time per element and the third is proportional to the distance from the head plus the elements returned. Older entries beyond the cap come from a slower store, which fits a feed where nobody scrolls to item 5,000.

TAO shows how to treat consistency: eventual consistency is the default, and the system tries hard to make users see their own updates with high probability, with strong consistency available at a higher cost and a risk to availability.

A feed can take the same stance, since a post that appears a second late isn't wrong. It does need one guarantee: the author's own post shows in the author's feed at once, and the push for the author is done in the request.

## Paging Through It

The user scrolls, and each page request must return the next items without repeats or gaps, while new posts keep arriving at the top. The obvious design, a page number or an offset, has two problems.

Rows skipped by an `OFFSET` still have to be computed, so a large offset can be inefficient, and without an ordering that makes the rows unique, the subset is unpredictable. And offsets drift: when a new post is inserted between two page requests, the second page shifts and shows a repeat.

The fix is a **cursor**, also called keyset pagination: the client sends back the position of the last item it saw, and the server returns the items after it.

Slack's API shows a typical form: the client sends an opaque `cursor` and a `limit`, the server returns `next_cursor`, empty at the end, and the query is `WHERE id <= cursor ORDER BY id DESC LIMIT limit`, asking for one more than the limit to know whether another page exists.

The cursor is an encoded value, so clients treat it as opaque and the server can change its contents. Two costs: the cursor needs a unique, ordered column, and the client can't jump to page 500. For a feed that is an acceptable price.

For a timeline of ids in a list, the cursor can be the id of the last item, and a request for new items since the top works the same way.

## Ranking

A chronological feed is simple, and many products rank. The usual shape is two stages: gather a few hundred candidates from the timeline, then score them with features such as the author, the age, the listing's price and the student's past behavior, and return the top.

Keep ranking out of the storage layer: the timeline holds candidates, and scoring runs on the request path with a time budget. Popularity signals come from the counters of [Counting and Ranking at Scale](/system-design/counting-ranking). A ranked feed also needs a fallback to chronological order when scoring is slow, so the page doesn't wait on it.

## Edge Cases That Bite

- **A new follow**: The new account's old posts aren't in the follower's timeline, so copy its last few posts in, or merge them at read time
- **An unfollow, a block or a deletion**: Filter at hydration, which is cheap, and clean the stored lists in the background
- **A cold timeline**: A user who returns after months has no stored list, so rebuild from the graph, and limit concurrent rebuilds so a wave of returning users doesn't become a stampede
- **A backlog**: A big account's fan-out queue delays the small ones behind it, so use separate queues for big and small accounts, as in [Bulkheads](/system-design/bulkheads)
- **New posts while reading**: Show a prompt that new items are available and don't shift the list under the user, with live delivery from [Pushing Live Updates to Clients](/system-design/push-updates)

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Model | Hybrid: push for accounts under 2,000 followers, pull and merge above |
| Timelines | A list of listing ids, capped at 400, for students active in the last 30 days |
| Post Store | Listings by id, cached, hydrated in one batch call |
| Graph | Follower and following lists in the database, cached, with eventual consistency |
| Paging | Cursor on the listing id, a limit of 20, and one extra item to detect the next page |
| Ranking | Chronological first, with a scored reorder of the top 100 behind a flag |
| Delivery | Fan-out through a queue, with a separate queue for large accounts |
| Metrics | Fan-out lag at the 99th percentile, timeline rebuilds, and the age of the oldest queued post |

## Pitfalls

- **Computing the feed on each read at scale**: The cost grows with the follows of each user
- **Pushing for each account**: One large account delays the small ones behind it
- **Storing posts in each timeline**: Edits and deletes have to be copied to millions of lists
- **Offset paging**: Slow for deep pages, and it repeats items as new ones arrive
- **No cap on a timeline**: Memory grows without bound for users who don't read
- **Strong consistency for a feed**: A cost with no matching benefit
- **Ranking in the read path with no fallback**: A slow model makes the whole page slow

## Key Points

- A feed is a read heavy merge of the posts of followed accounts, and the choice is between building it when posted, which is push, and when opened, which is pull
- Push makes reads cheap and writes proportional to followers: in our simulation, 10 million inserts a day against 250 million lookups for pull, with a 12.4 second fan-out for the biggest account
- <u>Use a hybrid</u>: pulling the 38 accounts above 10,000 followers cut the slowest fan-out to 1.0 second and raised the lookups from 5 million to 29.6 million
- Store ids in capped timelines, keep posts and the social graph in their own stores, and accept eventual consistency except for the author's own post
- Page with cursors, not offsets, rank in two stages with a chronological fallback, and plan for new follows, deletes, cold timelines and fan-out backlogs
