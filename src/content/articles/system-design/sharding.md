> **Sharding** splits a dataset into pieces, called **shards**, and stores each piece on a different node, so each record lives on one shard. It spreads storage and writes over many machines. The **shard key** is the field that decides which shard owns a record.

Replication copies the same data to several nodes. It helps reads and failures, and it doesn't help when the data itself outgrows one machine, or when one leader can't take the write load. The textbook app's 3 million listings, with the photos, searches and registration day traffic, will eventually reach that point.

Figma's engineers describe it well: by late 2022 they had caching, read replicas and a dozen vertically partitioned databases, and their largest tables still held several terabytes and billions of rows, which vacuum and disk limits made hard to run.

Notion's trigger was similar: vacuum stalls and a risk of transaction ID wraparound on one big Postgres database.

## Splitting by Table or by Row

Two directions exist. In **vertical partitioning** whole tables, or groups of related tables, move to different databases, for example listings in one and payments in another.

Vitess, a sharding system for MySQL, calls this moving tables to another keyspace. It is simple, since no row is split, and it stops helping when a single table is too big or too busy.

**Horizontal sharding** splits the rows of one table across nodes by a key. That is the subject of this topic, and the choice of the key is the main decision.

## Ways to Place a Row

There are four common placements:

| Strategy | How a Row Finds Its Shard | Good For | Weak At |
| --- | --- | --- | --- |
| Range | The key falls in a contiguous range owned by a shard | Range queries and sorted scans | Hot spots with increasing keys |
| Hash | A hash of the key picks the shard | Even spread of writes | Range queries, which visit many shards |
| Directory | A lookup table maps each key to a shard | Moving a single key, odd sizes | An extra lookup and a table to keep safe |
| Compound | Part of the key picks a group, the rest spreads within it | Locality with balance | A more complex key |

- **Range**: MongoDB's ranged sharding keeps nearby key values together, so a range query goes to a few shards. Its documentation warns about monotonic keys, such as timestamps or increasing ids, since new inserts go to the chunk at the top of the range, which sits on one shard
- **Hash**: MongoDB's hashed sharding, Cassandra's token ring and Citus each hash the key, which gives an even spread, and a range of keys no longer maps to a range of shards. Figma hashes its key because auto increment or Snowflake style ids would create hotspots, and accepts slower range scans. [Consistent Hashing](/system-design/consistent-hashing) is the related idea
- **Directory**: Slack's original design sent each workspace to a shard through a metadata cluster. Vitess calls the same idea a lookup vindex. Both let one key move alone, and cost an extra read
- **Compound**: MongoDB allows a compound hashed key, a plain prefix and a hashed field, so the prefix places data in zones and the hash spreads the rest. Cassandra pairs a partition key, hashed to choose the node, with clustering keys that sort rows inside the partition

## What the Key Does to the Load

We ran the textbook app's registration week through four keys: 100,000 new listings on 6 shards. In our assumptions the most active seller makes 3.1 percent of listings and the most popular course holds 8.2 percent, both falling off along a curve. An even split would give each shard 16.7 percent:

| Shard Key | Busiest Shard's Share of New Writes |
| --- | --- |
| Range on Listing ID | 100% |
| Hash of Listing ID | 16.8% |
| Hash of Seller ID | 19.8% |
| Hash of Course ID | 26.0% |

The range split is the worst because new listing ids are the newest, and they fall in the last range. Hashing the listing id is near perfect. Hashing the seller or the course is lumpier, since a few popular values fall on one shard each, however well the hash mixes.

## Choosing the Key

The guidance across systems agrees on a few tests. MongoDB lists four:

- **Cardinality**: The number of distinct values caps the number of chunks. Its example is a key of the continent, with 7 values, which can't use more than 7 shards
- **Frequency**: If a few values dominate, their chunk can't be split, and MongoDB calls it a jumbo chunk. Add a field to the key to break it up
- **Monotonic change**: Use hashing, or a hashed prefix, for values that keep growing
- **Query patterns**: A query that includes the shard key goes to one shard, and one that doesn't is sent to the whole set of shards, which scales poorly

DynamoDB's documentation gives the same advice from the other side. A key with many distinct values, such as a user id, spreads load, and a status code with a few values or a date rounded to the hour is a poor key.

A partition handles up to 3,000 read units and 1,000 write units a second, so a day based key sends a whole day's writes to one partition.

When a key is too hot, DynamoDB suggests write sharding by adding a suffix to it: a random number such as 1 to 200, which spreads writes and makes a read of the whole key query the 200 suffixes, or a suffix calculated from another attribute, which lets a single item be found again.

Google's Bigtable guidance for row keys is to avoid keys that start with a timestamp or a sequential id, and to put a high cardinality value first.

Size matters as well. Cassandra's data modeling guide advises keeping a partition below 100,000 cells and 100 MB.

## Matching the Key to the Queries

The key decides which queries are cheap. For the textbook app, here is how many of the 6 shards three queries touch under two keys:

| Query | Sharded by Listing ID | Sharded by Seller ID |
| --- | --- | --- |
| Open One Listing by ID | 1 | Needs a lookup of the seller first |
| A Seller's Own Listings | 6 | 1 |
| Search by Course | 6 | 6 |

Neither key is right for each query. A seller key makes the seller dashboard cheap and loads the shards of busy sellers. A listing key spreads writes and sends the dashboard across the whole set of shards.

Notion chose the workspace id because each block belongs to a workspace and users query inside one, so cross shard joins stay rare. Citus gives the same rule for multi tenant apps: put the tenant id on each table and colocate the tables, and don't use a timestamp as the distribution column.

Searches over many shards, such as by course, are the job of indexes built for sharded data, covered in [Secondary Indexes on Sharded Data](/system-design/sharded-secondary-indexes).

## What Sharding Takes Away

Sharding costs things that one database gave for free:

- **Joins and transactions across shards**: Figma notes there are no atomic cross shard transactions, so partial commits must be handled. It keeps tables that are joined together in groups it calls colos, which share a key and a layout. Citus places tables together and offers reference tables, small tables copied to each node. Cassandra doesn't support cross partition transactions. A purchase that spans shards needs the techniques of [Two-Phase Commit](/system-design/two-phase-commit) or [Sagas](/system-design/sagas)
- **Unique ids**: An auto increment column per shard collides, which brings back the problem in [Unique ID Generation](/system-design/unique-ids)
- **Schema changes**: They have to be rolled out to each shard
- **Queries without the key**: They fan out across the shards, and slow with each shard added

Some load no key can spread. Slack's workspace sharded design had huge enterprise teams that couldn't be split across hosts, which led to over provisioning, and a shard outage took out each workspace on it. They moved message data to a channel key in Vitess. Notion saw outlier workspaces stand out after its expansion spread the rest.

## Routing and Moving Data

Something has to know which shard owns a key. In Notion's design, the application does: workspace id to database to schema.

Vitess has a proxy, VTGate, that routes by the primary vindex, and shard names are hex ranges such as `-80`, `80-c0` and `c0-`. Figma built a proxy service for the same job, and MongoDB sends clients through mongos routers.

The shard count is a long term decision. Plain modulo hashing moves most data when a node is added: in our test, going from 6 to 7 shards with a hash modulo moved 85.7 percent of the keys. The usual remedy is to create many more logical shards than hosts and move whole logical shards.

Notion used 480 logical shards on 32 physical databases, 15 on each, and chose 480 because it has many divisors, so hosts can grow from 32 to 40 or 48 evenly.

In 2023 it moved to 96 hosts with 5 logical shards on each. In our model of 60 logical shards, adding a seventh host moves 8 shards, 13.3 percent of the data. How to do this safely is the subject of [Rebalancing Shards](/system-design/rebalancing).

## Choosing

| Situation | Starting Point |
| --- | --- |
| Records are grouped by tenant and queried within the tenant | Shard by tenant, with colocated tables |
| New records arrive in time order and are read by key | Hash the id |
| Reads are range scans over a sorted key | Range, with a prefix that spreads the writes |
| A few keys are huge | Directory placement, or a finer or compound key |

For the textbook app, listings sharded by listing id spread registration day writes evenly, and the seller dashboard is served by a separate index, while per campus data could be kept on one shard group to keep campus searches local.

## Key Points

- Sharding splits rows over nodes by a key, after vertical partitioning has moved whole tables and the biggest tables are still too big
- Range, hash, directory and compound placements trade range queries, even load and flexibility: in our test a range on listing id sent 100 percent of new writes to one shard, and a hash sent 16.8 percent
- <u>The shard key decides which queries are cheap</u>, and tests are cardinality, frequency, monotonic growth and the queries themselves
- Sharding gives up cross shard joins and transactions, so group related tables by one key and plan for fan out of the rest
- Use many logical shards for few hosts, since moving from 6 to 7 shards by modulo moved 85.7 percent of keys, and moving whole logical shards moved 13.3 percent
