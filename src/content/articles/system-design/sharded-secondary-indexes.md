> A **secondary index** on sharded data finds rows by an attribute that is not the shard key. A **local index** gives each shard an index over its own rows, so a query asks each shard. A **global index** is split by the indexed value, so a query asks one index shard and then fetches the rows.

[Sharding Strategies](/system-design/sharding) ended with a trade: the textbook app's listings sit on 6 shards by listing id, which makes opening a listing cheap and most other queries awkward. Buyers search by course. Sellers look at their own listings. Neither query contains the listing id, so neither knows which shard holds the answer.

As [Indexes and Query Optimization](/system-design/indexing) described for one machine, an index is a second structure that finds rows by a column. With shards, a second question appears: where does that second structure live?

## Local Indexes: Each Shard Indexes Its Own Rows

The first answer keeps the index next to the data. Each shard indexes the rows it owns, and a write touches one shard, since the base row and its index entries live together. This is called a document partitioned index, because the index is split in the same way as the documents.

The cost is on the read. Rows for a given course are spread over the shards, so a search by course has to ask each of them and merge the answers.

The Google cluster paper from 2003 describes the idea for web search: the index is divided into shards, each holding a randomly chosen subset of documents, and each query goes to one machine in the pool of each shard.

Elasticsearch and MongoDB work this way. In Elasticsearch, a node that receives a search picks one copy of each relevant shard, sends each a request and merges the results, while a lookup by id touches one shard.

MongoDB's router sends a query that has the shard key to the shards that own that range, and a query without it to the whole set of shards.

<figure class="diagram">
<div class="flow">
<div class="node">Search by Course</div>
<div class="arrow wide" data-label="ask each shard" aria-hidden="true"></div>
<div class="stack">
<div class="node">Shard 1<small>local index</small></div>
<div class="node">Shard 2<small>local index</small></div>
<div class="node">Shard 3<small>local index</small></div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Merge</div>
</div>
<figcaption>With local indexes, a query on any other attribute waits for each shard</figcaption>
</figure>

Two problems grow with the number of shards. The slowest shard sets the pace, as in the tail latency numbers from [Why Distributed Systems Are Hard](/system-design/why-distributed-is-hard). We simulated shards that answer in 5 ms except for 1 percent of calls that take 100 ms:

| Shards a Query Asks | Queries That Wait on a Slow Shard | Median Latency |
| --- | --- | --- |
| 1 | 1.0% | 5 ms |
| 6 | 5.9% | 5 ms |
| 60 | 45.1% | 100 ms |

The second problem is work. In Elasticsearch a search uses one thread for each shard, so many shards can exhaust the search thread pool.

It advises shards of 10 GB to 50 GB and under 200 million documents, and the number of concurrent shard requests defaults to 5 per node. Adding shards to hold more data makes each local index query more expensive.

The fan out can be avoided when the query contains a routing value. In Elasticsearch, a document indexed with a routing value goes to one shard, and a search with the same value asks that shard alone. That is the same as choosing a shard key.

## Global Indexes: Split the Index by the Value

The second answer splits the index itself by the indexed value. The entries for course CS101 live on one index shard, wherever the listings are. A search by course asks that one shard, gets the listing ids and fetches the rows. This is a term partitioned or **global** index.

Reads are cheap and targeted, and writes get harder, since a new listing touches the shard of the base row and the index shard of each indexed value. DynamoDB's global secondary index shows the details:

- **Its own keys and capacity**: A global index has a partition key and sort key of its own, and its own read and write capacity
- **Asynchronous updates**: A write to the base table updates the index later, typically within a fraction of a second, so applications must handle stale results
- **Back pressure**: A base table write succeeds when the table and each index have enough write capacity, so an under provisioned index throttles the table. Give the index at least the table's write capacity
- **A change costs two writes**: Changing an indexed value deletes the old entry and adds the new one
- **Sparse by design**: An item is indexed when it has the index's key attributes
- **Projections**: The attributes copied into the index are the ones that can be read from it, with the choice of keys alone, chosen attributes or the full item, and the full item roughly doubles storage and write cost

## Keeping a Global Index Right

An index entry and its row are on different shards, and no single transaction covers both unless the system pays for one. The systems choose differently:

- **Atomic with two phase commit**: Google Spanner's global index is stored as a separate table that can be split on its own, and updates often span splits and need two phase commit, so a global index has a higher write cost than one stored with its parent row. An interleaved index, stored with the parent row, is usually written locally. The commit protocol is in [Two-Phase Commit](/system-design/two-phase-commit)
- **A careful protocol**: Vitess keeps a lookup table that maps a column value to a shard. A standard lookup is essentially a distributed transaction, and its consistent lookup variants use locks and a sequence of three sessions to avoid two phase commit, with the limit that an insert followed by an update of the same value in one transaction isn't supported. A lookup costs more than a computed shard in its planner: 10 for a unique lookup and 20 for a non unique one, against 1 for a hash
- **Asynchronous with repair**: DynamoDB updates its indexes later. Facebook's TAO stores an association on the shard of its first object and the inverse on the shard of the second. There is no atomicity between the two writes, a failure can leave the forward edge without its inverse, and an asynchronous job repairs these hanging associations

We estimated what a lost update looks like. In 100,000 listing inserts with 3 indexes, where each remote index write fails 0.1 percent of the time, 309 listings, 0.31 percent, were missing from at least one index.

With asynchronous updates that take 50 ms on average, 86.5 percent of new entries were visible 100 ms after the write, and the rest after 0.5 seconds. These are our assumptions, and the shape is general: a global index is a little stale, and sometimes wrong unless a repair job runs.

## Uniqueness

A unique constraint is an index with a rule, and it has the same problem. Each shard can check just its own data, so a unique index on a sharded collection must start with the shard key, which puts the documents with the same key value on one shard.

A hashed index can't be unique, and `_id` is unique per shard unless it is the shard key.

To make an email address unique across shards when the collection is sharded by something else, use a lookup table sharded by the email, as with a Vitess unique lookup, or generate the identifier so collisions can't happen, as in [Unique ID Generation](/system-design/unique-ids).

## Hot Index Entries

An index can be a hotspot of its own. In Spanner, using the commit timestamp as the leading column of an index can concentrate writes and reduce write performance.

CockroachDB solves the same problem with hash sharded indexes: it adds a hidden shard column computed as a hash of the key modulo a bucket count, which becomes the index key prefix, so sequential writes spread over ranges.

The price is that a scan over the sequential key reads each bucket. It advises against more buckets than nodes.

## Choosing

| Need | Choice |
| --- | --- |
| Many different search attributes, few big queries | Local indexes, and accept the fan out |
| A frequent query on one attribute, with latency goals | A global index on that attribute |
| A query that includes the parent key each time | A local or interleaved index |
| A unique value that is not the shard key | A lookup table sharded by that value |
| A search with text, filters and ranking | A separate search system fed from the main store |

For the textbook app, listing search by course, condition and price suits a search engine with local indexes, since it needs to rank and filter, with the course used as a routing value for the large campuses.

The seller dashboard is a frequent, simple query, so a global index on seller id, updated asynchronously and repaired, is enough. Rebuilding indexes when shards move is part of [Rebalancing Shards](/system-design/rebalancing).

## Key Points

- A secondary index on sharded data is either local, one index for each shard, or global, split by the indexed value
- Local indexes make writes cheap and reads fan out, and the slowest shard sets the pace: with 60 shards, 45.1 percent of our queries waited on a slow one
- <u>Global indexes make reads targeted and writes touch several shards</u>, so the index is asynchronous, atomic at a cost or repaired afterwards
- In our simulation, 0.31 percent of listings were missing from an index when remote writes could fail, so plan a repair path
- Unique constraints need the shard key as a prefix or a lookup table, and indexes on increasing values need hashing or a prefix to avoid hot spots
