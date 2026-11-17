> A **key-value store** is a database with the smallest interface that still stores data: put a value under a key, and get it back with the same key. The store treats the value as opaque bytes, so it is very fast at one thing, finding a value by its key.

In [Stateless and Stateful Services](/system-design/stateless-stateful), the textbook app's web servers kept nothing of their own, and the login sessions moved to a shared place every server could reach. That place is usually a key-value store. This topic is about what such stores are, where they fit, and what you give up for their simplicity.

## Put and Get

A **key-value store** is the simplest kind of database: records are stored and found by a unique key, and the database doesn't look inside the value.

Dynamo, the system Amazon described in a 2007 paper, shows why anyone would want this. Many of Amazon's services, such as shopping carts and session management, only ever needed access by primary key, and a relational database made them pay for query and management features they didn't use.

The interface is small enough to show in full. This is Redis, a popular store, typing commands in its command line:

```text
> SET session:9f3a "{\"user_id\": 8}" EX 1800
OK
> GET session:9f3a
"{\"user_id\": 8}"
> DEL session:9f3a
(integer) 1
```

The key is `session:9f3a`. The value is a string that holds some JSON, and the store doesn't know that.

`EX 1800` says the entry should disappear after 1,800 seconds, so a forgotten session cleans itself up. An expired key is removed in two ways: when a client asks for it after it expired, and by a background process that samples keys that have timeouts.

One gotcha from the same page: a plain `SET` on a key that has a timeout clears the timeout, so the entry can live forever if the code forgets to set it again.

## What Fits

A key-value store suits data that is found by one known identifier and read or written whole:

| Use | Key | Value |
| --- | --- | --- |
| Login Session | `session:<id>` | The user id and when it expires |
| Draft Listing | `draft:<user id>` | The half filled form |
| Rate Limit Counter | `limit:<ip>:<minute>` | How many requests so far |
| Feature Flag | `flag:new-search` | On or off |
| Cached Page | `page:/books/52` | The finished HTML |
| Idempotency Record | `idem:<request key>` | The stored response |

Some of these appear elsewhere in the book: [Rate Limiting Algorithms](/system-design/rate-limiting-algorithms) count requests this way, [Idempotency and Safe Retries](/system-design/idempotency) keeps the response for a repeated request, and caches are the subject of [Where to Put a Cache](/system-design/where-to-cache). The pattern is the same each time: name the thing, and look it up by name.

## Different Jobs for Different Stores

All of them share the interface, but they were built for different jobs:

- **Fast shared memory**: Redis and Memcached keep data in memory for very quick lookups, often as a cache or for sessions. See [Redis and Memcached](/system-design/redis-memcached)
- **A database for huge simple data**: Amazon DynamoDB spreads items over many machines and is built for access by key at large scale. On Dynamo, Amazon's shopping cart service handled tens of millions of requests, and more than 3 million checkouts in a single day
- **Coordination and settings**: etcd stores small, important data, such as cluster configuration. It favors consistency, uses Raft for agreement, and offers watches and leases. It is meant for several gigabytes, not for big data. See [Consensus and Leader Election](/system-design/consensus-leader-election)
- **An engine inside another program**: RocksDB is a library, not a server. It keeps keys in sorted order, supports range scans, and leaves replication to whatever is built on top. It stores data using the structure in [LSM Trees](/system-design/lsm-trees)

Speed and safety trade off here too. Stores that keep data in memory are among the fastest, and a restart can lose data unless the store writes it to disk. The databases keep data on disk and copy it to other machines, at the cost of more work per write.

## Values With Shape

Plain strings are the start. Redis offers richer value types, each with commands that work on it: hashes for records with fields, lists, sets, sorted sets ordered by a score, and streams for event logs. The store still finds all of them by key, but it can now change them in place.

That matters because of the lost update from [Isolation Levels](/system-design/isolation-levels). Two web servers counting views of a listing don't need to read and write. Redis's `INCR` reads, adds one and writes as a single step, so two increments add two. A sorted set keeps a ranking up to date the same way:

```text
> INCR views:listing:17
(integer) 121
> ZINCRBY popular:books 1 book:52
"842"
> ZRANGE popular:books 0 4 REV WITHSCORES
1) "book:52"
2) "842"
...
```

The last command returns the five books with the highest scores. The app didn't sort anything, and the ranking never needed a query over listings.

## Choosing Keys

With no schema, the keys are the design. A common habit is a readable pattern, `type:id`, with colons between the parts, which also keeps different kinds of data apart in one store. Keys should be short and values small: the objects Dynamo stores are typically under 1 MB.

In a store that spreads data over many machines, the key does a second job. DynamoDB hashes the partition key to pick a partition, a slice of storage that serves its share of the data. Traffic spreads evenly when the keys do.

Pick a key with many different values, and to avoid ones with few values or ones that group requests in time. For the textbook app logging 3,000 page views a second at the registration day peak:

| Candidate Key | Verdict | Why |
| --- | --- | --- |
| Listing ID | Good | Many different values, so views spread out |
| User ID | Good | Many users, each with a small share |
| Status, Such as Open or Sold | Poor | Two values, so two busy keys |
| Today's Date | Poor | Every write of the day lands on one key |

The last row is the classic trap, a **hot partition**. In DynamoDB each partition is designed for up to about 1,000 writes a second, for items of up to 1 KB.

A log keyed by date would send all 3,000 page views to one partition, which is three times its share, and the store can start throttling requests while the other partitions sit idle.

<figure class="chart">
<div class="hbars" role="img" aria-label="Writes per second on four partitions when the key is the date, compared with when the key is the listing ID">
<div class="hbar peak"><span>Date, Partition 1</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">3,000</span></div>
<div class="hbar"><span>Date, Partition 2</span><span class="track"><span class="fill" style="--w: 0%"></span></span><span class="value">0</span></div>
<div class="hbar"><span>Date, Partition 3</span><span class="track"><span class="fill" style="--w: 0%"></span></span><span class="value">0</span></div>
<div class="hbar"><span>Date, Partition 4</span><span class="track"><span class="fill" style="--w: 0%"></span></span><span class="value">0</span></div>
<div class="hbar"><span>ID, Partition 1</span><span class="track"><span class="fill" style="--w: 25%"></span></span><span class="value">750</span></div>
<div class="hbar"><span>ID, Partition 2</span><span class="track"><span class="fill" style="--w: 25%"></span></span><span class="value">750</span></div>
<div class="hbar"><span>ID, Partition 3</span><span class="track"><span class="fill" style="--w: 25%"></span></span><span class="value">750</span></div>
<div class="hbar"><span>ID, Partition 4</span><span class="track"><span class="fill" style="--w: 25%"></span></span><span class="value">750</span></div>
</div>
<figcaption>Writes per second on four partitions, for the same 3,000 (example numbers)</figcaption>
</figure>

The fix is to spread the key. The standard fix is **write sharding**: add a suffix to the key, such as the date plus a number from 1 to 10, so one day becomes ten keys.

The price comes back at read time, since reading one day's data means asking ten keys and merging the answers. How a store decides which machine owns a key is the subject of [Consistent Hashing](/system-design/consistent-hashing).

## What You Give Up

The same simplicity means some questions can't be asked:

| Question | In a Key-Value Store |
| --- | --- |
| Get session 9f3a | Yes, it is what the store is for |
| Which sessions belong to user 8? | Only if you also keep a key that lists them |
| Which listings cost under 20 dollars? | No, the store can't look inside values |
| Change the listing and the seller's balance together | Depends on the store, and often limited to one key |

The store gives each question one answer, by key. Everything else is built by you: a second key for each lookup you need, and care when the copies must agree, as in [Choosing Between Normalization and Denormalization](/system-design/normalization).

The Dynamo paper accepted the same deal: no relational schema, no operations that span several items, and updates to a single key only.

It also gave up strict consistency for availability.

Dynamo aimed to always accept writes, so a later read might return older data, and conflicts were left to the application, for example by merging two versions of a shopping cart. Other stores choose the opposite, like etcd, which accepts lower availability to avoid disagreement. These choices are covered in [The CAP Theorem](/system-design/cap) and [Consistency Models](/system-design/consistency-models).

When the data is naturally found by key, a key-value store is the simplest and often the fastest tool. When you start asking questions about what is inside the values, that is the signal to look at [Document Stores](/system-design/document-stores) or back at a relational database from [The Relational Model](/system-design/relational-model).

## Key Points

- A key-value store maps a key to a value it doesn't look inside, with get, put and delete as the core operations
- It fits sessions, counters, flags, cached pages and other data found by a single identifier, and `EX` or `EXPIRE` lets entries clean themselves up
- Different stores serve different jobs: shared memory (Redis), huge data (DynamoDB), settings (etcd) and an engine inside a program (RocksDB)
- In a store spread over machines, <u>the key decides where data lives</u>, so choose keys with many values, and not ones like a date that make one hot partition
- You give up queries by value, joins and often multi key transactions, and you build any other lookup yourself
