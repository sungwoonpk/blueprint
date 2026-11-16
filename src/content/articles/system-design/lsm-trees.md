> A **log-structured merge tree**, or LSM tree, takes writes into memory and a log, saves them as sorted files that are not edited afterwards, and merges those files in the background. It trades slower, more complicated reads for very cheap writes.

[B-Trees](/system-design/b-trees) ended on a cost: changing one small row rewrites a whole page, somewhere different on the disk each time. The LSM tree makes the opposite bargain.

It turns random writes into sequential ones and pays later, by merging files and by looking in more than one place when reading. It sits under RocksDB, LevelDB, Cassandra and Bigtable, the stores behind the message example in [Wide Column Stores](/system-design/wide-column-stores).

## The Write Path

Patrick O'Neil and his colleagues described the idea in 1996. Today's version, as Wikipedia describes it, has an in-memory level and sorted runs on disk below it. The write path of Cassandra's documentation shows the steps, and RocksDB and LevelDB are alike:

- **Log**: Each write is appended to a write-ahead log first, as in [Write-Ahead Logs](/system-design/write-ahead-logs), so a crash doesn't lose it
- **Memtable**: The write also goes into a sorted structure in memory, a skip list by default in RocksDB, and reads can see it right away
- **Flush**: When the memtable is full it is frozen, and a background thread writes it to disk as one sorted file, called an **SSTable**, for sorted string table. Writes carry on into a fresh memtable, and the old log is deleted

Cassandra's documentation stresses that an SSTable is immutable once written. Nothing edits it: an update is a new entry in a newer file, and a delete is a marker, called a **tombstone**, that hides older values. All the writing to disk is sequential, which suits both hard disks and SSDs.

## Reads Look in Several Places

The newest data is in the memtable and the newest files, so a read starts there and works backward. Following LevelDB's design notes, the files are arranged in levels. Level 0 holds files fresh from the memtable, and their key ranges can overlap.

Each level below has files with separate key ranges, and each is about ten times larger than the one above it, 10 MB for level 1 and 100 MB for level 2 in LevelDB.

<figure class="diagram">
<div class="flow">
<div class="node">Memtable</div>
<div class="arrow" data-label="if absent" aria-hidden="true"></div>
<div class="node">Level 0<small>newest files first</small></div>
<div class="arrow" data-label="if absent" aria-hidden="true"></div>
<div class="node">Level 1<small>one file</small></div>
<div class="arrow" data-label="if absent" aria-hidden="true"></div>
<div class="node">Level 2<small>one file</small></div>
</div>
<figcaption>A point lookup stops at the first place that has the key</figcaption>
</figure>

A key that exists is found early, if it was written recently. The costly case is a key that doesn't exist, since each place has to be checked.

Wikipedia gives the cost as one probe per component without help, and the help is a **Bloom filter** kept for each file, a small structure that says either "definitely not here" or "maybe here".

If a filter has a 1 percent false positive rate, a lookup in our 14 file example below makes about 0.14 unnecessary file reads instead of 14. Bloom filters are the subject of [Bloom Filters and Sketches](/system-design/probabilistic-structures).

A range scan reads each file from the start key and merges the results with a priority queue, keeping only the newest version of each key, according to Wikipedia. Here the linked leaves of a B-tree are a simpler design.

## Compaction: Paying Later

Left alone, files would pile up and each read would slow down. Background **compaction** merges files, as in merge sort: it keeps the newest version of each key and drops overwritten values and deleted ones.

LevelDB drops a tombstone only when no deeper level could still hold the key it hides. Cassandra adds a safety wait, `gc_grace_seconds`, ten days by default, so that a replica that was offline can still learn of a delete. A replica that stays away longer can bring the deleted data back.

There are two main policies, and Wikipedia, RocksDB and Cassandra all describe the same pair. **Leveling** keeps one sorted run per level and merges often, so reads check few files, but data is rewritten many times.

**Tiering**, called size tiered in Cassandra and universal in RocksDB, waits until several files of similar size exist and merges them at once, so data is rewritten less, but there are more files to check. We simulated both for one million entries, with a memtable of 1,000:

| Policy | Times Each Entry Is Written | Files to Search |
| --- | --- | --- |
| Tiering, 4 files per tier | 4.7 | Up to 14 |
| Leveling, 10 times per level | 16.4 | At most 3 |

The model is simple, since our leveling merges whole levels, where real systems merge a file at a time, so treat the numbers as a picture of the tradeoff and not as a benchmark. The write count is **write amplification**, the amount physically written divided by the amount the application wrote.

Compare it with a B-tree's page rewrite: changing one 100 byte row on an 8 kB page writes about 80 times the data, while an LSM tree writes each entry roughly 5 to 16 times in the background and writes it sequentially.

RocksDB's documentation states the tradeoff in its own words: universal compaction typically has lower write amplification but higher space and read amplification than leveled.

Cassandra's documentation points each strategy at a workload: size tiered for write heavy loads, leveled for read heavy ones or ones with many updates and deletes, and a time window strategy for data with a TTL.

## The Costs That Show Up Later

An LSM tree hides its bills until compaction runs:

- **Space**: Old versions and tombstones stay until they are merged. RocksDB warns that a full universal compaction can temporarily need about twice the disk space
- **Stalls**: If writes outrun compaction, the files pile up, and the system slows or stops writes on purpose. RocksDB has settings named `level0_slowdown_writes_trigger` and `level0_stop_writes_trigger` for this
- **Spiky load**: Compaction uses disk and CPU in bursts, and Wikipedia notes that it also churns the buffer cache, which hurts mixed read and write workloads
- **Time data**: Cassandra's time window strategy groups files by time, so a whole expired window can be dropped at once, the same idea as the chunks in [Time Series Databases](/system-design/time-series)

## LSM Tree or B-Tree

| Question | B-Tree | LSM Tree |
| --- | --- | --- |
| A Write | Changes a page in place | Appends, and merges later |
| A Point Read | One descent | Several places, helped by Bloom filters |
| A Range Read | Walks linked leaves | Merges several sorted files |
| Disk Space | Pages about 70 percent full after random inserts | Old versions until compaction |
| Latency | Steady | Can spike during compaction |
| Found In | PostgreSQL, InnoDB, SQLite | RocksDB, LevelDB, Cassandra, Bigtable |

Neither wins everywhere. A workload that writes a lot, in many small pieces, such as the messages and events of [Wide Column Stores](/system-design/wide-column-stores), suits an LSM tree.

A workload with many reads, transactions and range queries over data that is updated in place, such as the textbook app's orders and balances, suits a B-tree. Many systems offer both, and a team chooses per table.

## Key Points

- An LSM tree writes to a log and a memtable, flushes sorted immutable files, and merges them in the background, so its writes are sequential
- A read checks the memtable and then the files, newest first, and Bloom filters let it skip files that can't hold the key
- Updates are new entries and deletes are tombstones, which compaction removes after a safe delay
- <u>Tiering writes less and reads more files, leveling writes more and reads fewer</u>, and our simulation showed 4.7 and 16.4 writes for each entry
- LSM trees suit heavy write workloads, B-trees suit read heavy ones, and compaction brings space, stall and latency costs
