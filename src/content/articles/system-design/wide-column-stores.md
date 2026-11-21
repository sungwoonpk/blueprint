> A **wide-column store** is a database that finds data by a row key, sorts the rows that share a key together, and lets each row hold as many named columns as it needs. It is built to take a very large number of writes and spread them over many machines. Cassandra, HBase and Google's Bigtable are the best known.

Say the textbook app grows past its campus. Students now message each other about listings, and the app stores hundreds of millions of messages. Almost every read asks the same thing: show the latest 50 messages in this conversation.

A relational table can do it with an index, until one machine can't take the writes. A wide-column store is shaped for exactly this pattern.

## Rows That Sit Together

A **wide column store** is, at heart, a two dimensional key-value store: a value is found by a row key and then a column key. Cassandra adds a twist. Its key has two parts:

- **Partition key**: The part that is hashed to choose which machines hold the data. All rows with the same partition key are stored together on the same replicas
- **Clustering columns**: The rest of the key. They decide the order of the rows inside one partition

For messages, the partition key is the conversation and the clustering column is the time. Here it is in Cassandra's language, CQL, which looks like SQL:

```sql
CREATE TABLE messages_by_conversation (
  conversation_id  uuid,
  sent_at          timeuuid,
  sender_id        bigint,
  body             text,
  PRIMARY KEY ((conversation_id), sent_at)
) WITH CLUSTERING ORDER BY (sent_at DESC);

SELECT sender_id, body
FROM messages_by_conversation
WHERE conversation_id = ?
LIMIT 50;
```

Each conversation becomes one partition, with its messages stored in order, newest first:

<figure class="diagram">
<p class="rowname">Conversation 41</p>
<div class="flow packets">
<div class="node">10:42</div>
<div class="node">10:40</div>
<div class="node">10:31</div>
<div class="node">10:05</div>
<div class="node">09:58</div>
</div>
<p class="rowname">Conversation 77</p>
<div class="flow packets">
<div class="node">11:15</div>
<div class="node">11:02</div>
<div class="node">10:50</div>
</div>
<figcaption>Each conversation is one partition, with its messages in time order (times are examples)</figcaption>
</figure>

The query names one partition, so the database goes to the machines that own it and reads a slice from the start. It doesn't scan, and it doesn't ask all the machines. That is the point of the design.

Bigtable has one sorted key instead of two parts, plus **column families** that group related columns, and every cell can keep several versions with timestamps. Rows are sorted by row key, and a column that is empty in a row takes no space.

That is why rows can be "wide": a row can have many columns, and different rows can have different ones. A wide partition is really a better name than a wide row.

A warning on the name. "Column store" once meant databases that store each column together on disk, for fast analytics, which is a different design, covered in [Columnar Storage](/system-design/column-storage). Wide-column stores group columns into families, but they are not that.

## Design From the Queries

In a relational database you model the data first and write queries later, with joins to put things together. Cassandra turns this around: start from the queries your app runs, and make one table for each. There are no joins to fall back on.

The messages table answers one question. A second question, "show a user's conversations, newest first", needs its own table, keyed by the user:

| Question | Table | Primary Key |
| --- | --- | --- |
| Latest messages in a conversation | `messages_by_conversation` | `(conversation_id), sent_at` |
| A user's conversations, newest first | `conversations_by_user` | `(user_id), last_message_at` |

When a message arrives, the app writes to both. The same facts now live in two places, the deliberate copy from [Choosing Between Normalization and Denormalization](/system-design/normalization).

This duplication is normal in Cassandra: the application keeps the copies consistent, with materialized views as an optional helper. The questions you will ask, as in [Data Modeling](/system-design/data-modeling), come before the tables here. A new kind of question usually means a new table.

Also, the primary key is an identity. Two rows with the same primary key overwrite each other, so the key must be unique enough to keep each message.

## Keep Partitions the Right Size

Hashing the partition key spreads partitions over the machines, as [Consistent Hashing](/system-design/consistent-hashing) describes. The danger is in how big a single partition gets. Partitions should be just right: not too big, not too small.

Cassandra sets a hard limit of 2 billion values in one partition, and says trouble usually starts long before that. All of a partition's rows live on the same replicas, so a huge or very busy one is a hotspot.

A private conversation stays small. A channel for a big course, where thousands of students post, doesn't. If the channel is the partition key, the partition grows without limit. The fix is to split it by time, with the month in the partition key:

```sql
PRIMARY KEY ((channel_id, month), sent_at)
```

Now one month of one channel is one partition, and "the latest 50" reads the current month and, rarely, the one before. The cost is that the app must know about months.

Bigtable has the same worry with its row keys. The usual advice is to avoid row keys that start with a timestamp or a sequential number, because new rows pile onto the same machine.

A key that begins with a value that has many different options, such as `conversation#41#`, spreads the writes. Google's guidance also suggests keeping a row under 100 MB, with a hard limit of 256 MB.

## Why Writes Are Cheap

These stores are built for heavy writing, and the reason is the storage structure under them. A write is appended to a log on disk, as in [Write-Ahead Logs](/system-design/write-ahead-logs), and put into a sorted table in memory. When the table is full, it is written out as one sorted file, and an existing file is not edited:

<figure class="diagram">
<div class="flow">
<div class="node">Write</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Log<small>append only</small></div>
<div class="node">Memory Table<small>sorted</small></div>
</div>
<div class="arrow" data-label="when full" aria-hidden="true"></div>
<div class="node">Sorted File<small>not edited later</small></div>
</div>
<figcaption>A write is an append, so it stays fast as the data grows</figcaption>
</figure>

Appending is cheaper than finding and changing data in place. Bigtable's SSTable files and Cassandra's design follow this plan, and [LSM Trees](/system-design/lsm-trees) explains how the files are merged in the background. Two consequences show up in daily use.

An update is just a newer write, and a delete writes a marker called a tombstone, which reads have to skip until a later cleanup removes it. Using Cassandra as a queue, with constant deletes, performs badly for this reason.

## What You Give Up

The same design closes some doors:

- **No joins and few ad hoc queries**: You can only ask questions the key was designed for. Reads by row key, prefix or range are the fast ones, and scanning a whole table is much slower
- **Small transactions**: Bigtable's operations are atomic within a single row, and nothing wider. Cassandra has tunable consistency, in the style of [Leaderless Replication and Quorums](/system-design/leaderless-replication)
- **Costly changes**: A new query pattern can mean a new table and a backfill of existing data

In return, you get writes that scale by adding machines. Typical uses are time series, internet of things readings, financial data and marketing data, and the shared trait is a huge volume of writes read back by key and time. Time series has a topic of its own in [Time Series Databases](/system-design/time-series).

For the textbook app, an honest answer is that at 2,000 campus users, PostgreSQL stores the messages without effort, and even at national scale it can be split by the techniques in [Sharding Strategies](/system-design/sharding).

A wide-column store pays off when the writes are so many, and the questions so predictable, that one machine can't keep up and a few fixed queries are enough.

## Key Points

- A wide-column store finds data by a partition key that picks the machines, with clustering columns that keep the rows in one partition sorted
- Design from the queries: one table for each question, with copies of data and no joins
- A partition should be neither tiny nor huge, so split growing ones, for example by month, and avoid row keys that start with a timestamp or a counter
- <u>Writes are appends</u> to a log and a sorted table in memory, which keeps them fast, and deletes leave tombstones
- You give up joins, ad hoc queries and wide transactions, and in return writes scale by adding machines
