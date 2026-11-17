> **Unique ID generation** is the problem of giving each new record an identifier that no other record has, when many machines create records at the same time and none of them can ask a single counter. A good ID is unique, compact, usually sortable by creation time, and cheap to make.

The textbook app gives each listing an ID. With one database, the database counts: the first listing is 1, the next is 2. Then the app grows.

Six web servers create listings, the data lives on several shards, and the mobile app lets a seller start a draft with no connection. Now no single machine sees each new listing, and two machines picking the next number would pick the same one.

This topic builds on the idea from [Physical and Logical Clocks](/system-design/clocks) that machines can't fully agree on time, and looks at four ways to make IDs anyway.

## What an ID Needs

Different uses want different properties, and no scheme gives the full set:

| Property | Why It Matters |
| --- | --- |
| Unique | Two records must not share an ID |
| No Coordination | Servers should make IDs without calling a central service |
| Sortable by Time | New rows land together in an index, and sorting by ID is close to sorting by age |
| Compact | The key is copied into each secondary index and each foreign key |
| Hard to Guess | Sequential IDs let a visitor count records and try neighbors |

## A Counter in the Database

The simplest source is a sequence or auto increment column. PostgreSQL's `nextval` is atomic and gives distinct values across sessions, and there is a catch: a value is not given back when a transaction aborts, and an insert that hits a conflict can still use one, so gaps appear.

MySQL's InnoDB likewise loses values on rollback and does not reuse them. Treat gaps as normal, and don't use IDs as an unbroken count.

With several databases, a counter in each would collide. Flickr's engineers described the fix in 2010: a pair of dedicated ticket servers.

Each holds a table with an auto increment column, and a client asks for an ID with a replace and a read of the last inserted ID. One server hands out odd numbers and the other even numbers, set with an increment of 2 and offsets of 1 and 2, and clients alternate between them.

Flickr reported that the two drifted, with a few hundred thousand more odd IDs than even at one point, and said it hurt no one. They also kept a separate sequence for each kind of object. They explain why they avoided GUIDs: the values are large and index badly in MySQL.

The approach works and has costs. The ticket servers are a service that each write path depends on, and each new ID needs a network round trip. Sequential IDs are also guessable, and they reveal how many records exist.

## Random IDs

The opposite approach needs no coordination: pick the ID at random. A version 4 UUID, as defined in RFC 9562, has 128 bits of which 122 are random, so servers, shards and offline phones can create them anywhere.

The chance of two matching is small, and the birthday formula tells how small: with n IDs drawn from d possible values, the chance of any match is about n squared divided by 2d. We calculated it for the textbook app's 3 million listings:

| ID Size | Chance of Any Duplicate Among 3 Million IDs |
| --- | --- |
| 32 random bits | Practically certain |
| 64 random bits | About 2.4 in 10 million |
| 122 random bits | About 1 in a trillion trillion |

For 122 bits, the same formula gives about one chance in a billion after 103 trillion IDs, which we calculated. A 50 percent chance of a collision takes about 2.7 quintillion UUIDs.

The cost is in the database index. RFC 9562 observes that random UUIDs have poor locality in a B-tree: each insert lands in a random leaf, instead of next to the previous one, as in [Indexes and Query Optimization](/system-design/indexing).

On MySQL the result is page splits, pages left partly empty, and, once the table is larger than memory, roughly two I/O operations for each insert, one read and one write.

The key is also copied into each secondary index. In MySQL a long primary key makes secondary indexes larger. Take a billion row table with a text UUID key and five secondary indexes, which stores the key six times for each row, about 216 GB.

We measured the locality effect in SQLite with a small 2 MB cache, inserting 400,000 rows with a random 16 byte key and with a 16 byte key that starts with a millisecond timestamp:

| Key | Time for 400,000 Inserts |
| --- | --- |
| Random, UUID Version 4 | 1.5 seconds |
| Time Ordered, Timestamp Then Random | 0.5 seconds |

The file sizes were about the same, 11.1 and 11.4 MB, and the whole table fits in the operating system's cache, so on a real disk the gap would be larger.

## Time Ordered IDs

Put a timestamp first, and new IDs sort after old ones, which keeps inserts at the right edge of the index. Several formats do it:

| Format | Layout | Text Length |
| --- | --- | --- |
| UUID Version 7 | 48 bit time, 74 bits random or counter | 36 characters |
| ULID | 48 bit time, 80 random bits | 26 characters |
| KSUID | 32 bit time, 128 random bits | 27 characters |

The time in a version 7 UUID and a ULID is Unix milliseconds. A KSUID counts seconds from 2014. ULIDs are written in Crockford base32 and KSUIDs in base62, which is why their text is shorter than a UUID's.

Within one millisecond, order is not defined unless the generator keeps it. RFC 9562 describes counters placed in the random bits, and a generator that increases by a random step.

The ULID specification has a monotonic mode that adds 1 to the random part when the millisecond repeats, with an error if it overflows. For a clock that moves backwards, RFC 9562 suggests keeping the last timestamp and counting up, or returning an error.

All of these trust the clock a little. An ID made on a machine whose clock is a minute behind sorts a minute early, which is harmless for an index and wrong for anything that treats the ID order as the order of events.

## Snowflake: Pack Time, Worker and Sequence

Twitter moved from MySQL to Cassandra, which has no sequence, and wrote down what it needed: at least 10,000 IDs a second from each process, no coordination between generators, IDs that are roughly sorted by time, and IDs that fit in under 64 bits. The result, Snowflake, packs an ID into 64 bits:

<figure class="diagram">
<div class="flow">
<div class="node">Time<small>41 bits, ms</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Worker<small>10 bits</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Sequence<small>12 bits</small></div>
</div>
<figcaption>Milliseconds since a custom epoch, then the worker, then a counter within the millisecond</figcaption>
</figure>

The 41 bit time counts milliseconds from a custom epoch and, in the README's words, lasts 69 years.

The worker field takes up to 1,024 machines, whose numbers are set in configuration, and the 12 bit sequence rolls over after 4,096 IDs, so a worker can issue up to 4,096 in a millisecond. The IDs fit in a 64 bit integer, which keeps indexes small.

No call is needed to make an ID, but each worker needs its own number, which is a small piece of coordination at start up. Two workers with the same number can produce the same ID.

Clock handling is part of the design. Snowflake refuses to generate IDs while the clock is behind the last timestamp it used, until the clock catches up, and recommends running NTP so that it doesn't step backwards.

We simulated 10 workers whose clocks were off by up to 5 ms each, producing 1 million IDs at about 20,000 a second. All IDs were unique.

Sorted by ID, 17.6 percent of neighboring pairs were in the wrong real order, by at most 9 ms. This is what roughly sorted means: close to time order, and not exact.

## Choosing

| Approach | Sorted by Time | Coordination | Watch Out For |
| --- | --- | --- | --- |
| Sequence or Ticket Server | Yes | A shared counter | Bottleneck, gaps, guessable |
| UUID Version 4 | No | None | Index locality, size |
| UUID Version 7, ULID, KSUID | Roughly | None | Clock error |
| Snowflake Style | Roughly | Worker numbers | Clocks, repeated worker numbers |

Sizes differ too: 64 bits for a Snowflake style ID or a sequence, and 128 bits or more for the UUID family.

For the textbook app, a Snowflake style 64 bit ID suits the listings table, because it is compact and keeps inserts at the end of the index, and an ID made this way works across shards as in [Sharding Strategies](/system-design/sharding).

A UUID version 7 is a simpler choice when there is no room for worker numbers. Offline drafts can take a random UUID, since they are made with no server.

Two cautions apply. Time ordered IDs reveal when a record was made, and sequential ones reveal how many exist, so use a random public identifier where that matters.

And on a store that spreads keys by range, such as Spanner, increasing keys concentrate writes on one server, so the advice is a random UUID version 4 or a bit reversed sequence.

Finally, an ID can name a request as well as a record. Stripe's idempotency keys, up to 255 characters, are suggested to be random strings such as a version 4 UUID, and the server remembers the first result for a key, as in [Idempotency and Safe Retries](/system-design/idempotency).

## Key Points

- A good ID is unique, made without a central call, compact and, for databases, roughly sorted by time
- Database sequences are simple and leave gaps, and with several databases they need a design such as Flickr's odd and even ticket servers
- <u>Random IDs need no coordination</u>, a 122 bit UUID gives about a 1 in a trillion trillion chance of a duplicate among 3 million, and they hurt B-tree locality: 1.5 seconds against 0.5 for 400,000 inserts in our test
- Time ordered formats such as UUID version 7, ULID and KSUID keep inserts together, and Snowflake packs 41 bits of time, 10 of worker and 12 of sequence into 64 bits
- Time based IDs are as good as the clocks, so handle backward steps and expect rough, not exact, ordering
