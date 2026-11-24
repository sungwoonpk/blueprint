> **Bigtable** is a distributed storage system that keeps structured data as a sparse, sorted map from a row key, a column key and a timestamp to a value. Rows are kept in key order and cut into pieces called **tablets**, each served by one machine, and each write goes to a log and a memory table before it reaches immutable files on a distributed file system. Google built it to hold petabytes across thousands of cheap servers.

Last time the textbook app's data team got a place to put huge files.

A file system is a good home for logs and photos, and a poor one for a question like "what was the price of listing 52 on each day last semester?" Opening a ten terabyte file to answer one row is the wrong tool.

So the team wants a table, the kind with rows, columns and fast lookups by key, at a size no single database holds. Billions of rows, a firehose of writes, reads by key in milliseconds, and scans over a range of keys for the reports.

A relational database offers more than that, and the extras are what stop it from scaling: joins, secondary indexes, transactions across rows. Bigtable, built at Google around 2004 and described in 2006, made the opposite bet. Offer a much smaller interface, and make that interface scale by adding machines.

This topic follows that bet from the data model down to the files on disk, adds our own measurements of the two ideas that matter most for performance, and ends with what the textbook app can borrow.

It builds on [GFS and HDFS](/system-design/gfs-hdfs), which Bigtable stores its files on, and on [LSM Trees](/system-design/lsm-trees), the storage idea inside each tablet.

## A Sorted Map With Three Keys

The whole data model fits in one line: a Bigtable is a map from a row, a column and a time to a string of bytes. Everything else is a consequence.

Take a table for the textbook app that keeps the history of each listing. The row key is the course code followed by the listing id, and each row holds a few cells:

| Row Key | Column | Time | Value |
| --- | --- | --- | --- |
| cs101#0052 | price:amount | t7 | 4500 |
| cs101#0052 | price:amount | t3 | 6000 |
| cs101#0052 | status:state | t7 | open |
| cs101#0052 | views:mon | t5 | 31 |
| cs101#0053 | price:amount | t4 | 3800 |

A few rules shape how it behaves. A row key is any string, and a read or write under one row key is atomic, whatever the number of columns it touches. That is the one transaction Bigtable offers, and it is a deliberate choice: atomic rows are cheap to provide, because a row lives on one machine.

Columns are grouped into **column families**, written `family:qualifier`. The family is declared up front and there are few of them, while qualifiers are free: a table can have an unbounded number of columns, and a row pays just for the cells it has.

That is the meaning of sparse. In the table above, the second row has no status, and no space is spent on the gap.

Each cell keeps several versions, indexed by a 64 bit timestamp and stored newest first. Versions are cleaned up by a per family setting, either the last n versions or the versions newer than some age, so a price history of seven days is a setting and not a job.

Notice what is missing. There are no types, no joins, and no way to ask for a row by anything other than its key or its place in the key order.

The data model gives the application control of two things instead: the order of the rows and which columns live together. The rest of the design turns on those two.

## Rows in Order, Tablets as Pieces

Bigtable keeps its rows in sorted order by key. A table starts as a single tablet, and as it grows it splits into tablets of roughly 100 to 200 MB, each holding a contiguous range of rows. A tablet is the unit that moves between machines, and a machine serves between ten and a thousand of them.

Because the rows are sorted, reading a short range touches one tablet or a few. The application gets to choose that range by choosing the row key, and the choice matters more than any setting.

The original example is a table of web pages, keyed by URL. The twist is that the host name is written backwards, so `maps.google.com/index.html` is stored as `com.google.maps/index.html`. We measured what that buys with a made up crawl of 298,000 pages on 3,000 domains, with sizes that fall off steeply, cut into 150 tablets of 2,000 rows:

| Domain Scanned | Rows | Tablets, Host Forward | Tablets, Host Reversed |
| --- | --- | --- | --- |
| Biggest | 23,364 | 21 | 12 |
| Medium | 1,062 | 8 | 1 |
| Small | 73 | 8 | 1 |

The ideal for the medium domain is one tablet, and the reversed key reaches it.

With the host written forward, the pages of one domain spread over a tablet for each subdomain name that sorts differently, here `www`, `m`, `mail`, `maps` and the rest, mixed in with the other sites that use the same names. A scan of 73 rows visited 8 tablets, which is 8 machines to ask.

The same idea shows up in table design after table design: put the things that are read together next to each other in the key. The cost of a careless key is the lesson of [Sharding Strategies](/system-design/sharding), and it is worse here, since Bigtable has no other way to find a row.

A key that starts with a timestamp sends each new write to the last tablet, the hot spot of [Handling Hot Spots and Celebrity Users](/system-design/hot-spots).

## Finding a Tablet

A client asks for a row, and the first question is which machine holds it. Bigtable could have kept a map of the whole set of tablets on its master, and the master would have become the bottleneck that [GFS and HDFS](/system-design/gfs-hdfs) already warned about. Instead the map is stored as a table, in three levels.

<figure class="diagram">
<div class="flow">
<div class="node">Lock Service File<small>root location</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Root Tablet</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Metadata Tablet</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">User Tablet<small>the data</small></div>
</div>
<figcaption>Three levels of lookup, like a B tree: each level points to the next</figcaption>
</figure>

A file in the lock service names the root tablet. The root tablet lists the tablets of a special METADATA table, and each of those lists a set of user tablets, under a row key built from the table and its last row. The root is kept whole and not split, which caps the depth at three.

The capacity is easy to compute. A METADATA row takes about 1 KB, and a METADATA tablet is limited to 128 MB, so it holds 131,072 rows, which is 2 to the 17th power.

Two levels of that address 2 to the 34th power tablets, about 17 billion, and at 128 MB each that is 2 to the 61st power bytes. The structure has more room than anyone needs.

A client caches what it learns. With an empty cache a lookup costs three round trips, one of them to the lock service. With a stale cache it can cost up to six, since a wrong entry is found when it fails.

Clients also prefetch the entries of neighboring tablets, so most requests skip the lookup entirely, and the master stays out of the data path.

## One Master, Many Tablet Servers, One Lock Service

The cluster has three kinds of part: a library inside each client, one master, and many tablet servers. The master hands out tablets, notices servers joining and dying, balances load and cleans up files. It doesn't serve reads or writes, which is why one master is enough.

The interesting question is how the master knows a server is gone, and the answer is a lock service, Chubby, which comes back in [Chubby and ZooKeeper](/system-design/chubby-zookeeper). A tablet server that starts creates a uniquely named file in a directory and takes an exclusive lock on it. The master watches the directory.

If a server loses its lock, for instance through a network cut that ends its session, it stops serving its tablets.

It tries to take the lock again as long as its file exists, and kills itself if the file is gone. That gives a clean rule: serving needs the lock, so two machines can't serve one tablet.

When the master finds a server unreachable, it tries to take that server's lock itself. If it succeeds, the lock service is alive and the server is dead or cut off, so the master deletes the file, which makes sure the server can't serve again, and moves its tablets to others.

The master also kills itself if its own session expires, and a restarted master takes a master lock, scans the directory for live servers, asks each what it serves, and then reads the METADATA table to find the tablets nobody has.

The design has one price. If the lock service is unavailable for long, Bigtable is unavailable. Google measured the effect over 14 clusters: the share of server hours in which some data could not be reached because of the lock service averaged 0.0047 percent, and 0.0326 percent for the worst cluster.

That is a design to copy when the lock service is far more reliable than what depends on it.

## The Life of a Write and a Read

A tablet's state lives in files on the distributed file system, and its recent changes live in memory. Three structures work together.

<figure class="diagram">
<p class="rowname">Write</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Commit Log</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Memtable</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">SSTable</div>
</div>
<p class="rowname">Read</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Merged View</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Memtable and SSTables</div>
</div>
<figcaption>A write is logged, then held in memory, then flushed to a file, and a read merges the memory with the files</figcaption>
</figure>

A write is checked, then appended to the commit log, with several small writes grouped into one disk operation for speed, and just then inserted into the **memtable**, a sorted buffer in memory.

When the memtable reaches a size limit, it is frozen, a new one starts, and the frozen one is written out as an **SSTable**, an immutable sorted file of key and value pairs with an index of its blocks at the end.

A read looks at the memtable and each SSTable of the tablet and merges the answers. Because the pieces are sorted, the merge is cheap.

A tablet server that dies loses its memory but not its work: the new server reads the tablet's list of SSTables and replays the commit log from a recorded point to rebuild the memtable. This is the write ahead log idea of [Write-Ahead Logs](/system-design/write-ahead-logs) at the scale of a cluster.

Two things follow from immutability. Reads of the files need no locks, so the memtable is the one structure touched by both reads and writes. And deletion can't remove a value from an old file, so a delete writes a marker that hides older entries, until a later merge drops both.

## Compaction, and What It Costs

Every flush adds an SSTable, and a read has to look at each of them. Left alone, reads slow down with each flush. The cure is **compaction**: merge several SSTables into one in the background.

A minor compaction is the flush of the memtable. A merging compaction combines a few files, and a major compaction rewrites the whole set into one, which is also the moment deleted data truly disappears.

The trade is between reading and writing, and we measured it on one tablet. The simulation wrote 400,000 updates at random to 200,000 keys, flushed at 4,000 entries, and tried three policies: no merging, merging four files of similar size into one, and merging the whole set into one file on each flush.

It then counted the file blocks that a lookup had to read, once with a Bloom filter in front of each file and once without. A Bloom filter answers whether a file might hold a key, with a false positive rate that we set to 1 percent.

| Compaction Policy | Files at the End | Times Each Entry Is Written |
| --- | --- | --- |
| No Merging | 99 | 1.0 |
| Merge Four Similar Files | 5 | 3.5 |
| Merge on Each Flush | 1 | 30.2 |

Skipping merges is the cheapest write and the worst read. Merging into one file on each flush keeps one file and rewrites each entry about 30 times, which is the write cost that a busy system can't pay. The tiered middle path rewrites each entry a few times and keeps a handful of files.

Now the reads. The numbers are blocks read from disk for one lookup, for a key that exists and for a key that doesn't:

| Setup | Key Exists | Key Missing |
| --- | --- | --- |
| No Merging, No Filter | 43.0 | 99.0 |
| No Merging, With Filter | 1.29 | 1.00 |
| Merge Four, No Filter | 4.06 | 5.00 |
| Merge Four, With Filter | 0.88 | 0.05 |
| Merge Into One, No Filter | 1.00 | 1.00 |
| Merge Into One, With Filter | 0.86 | 0.01 |

The filter is the surprise. A lookup of a missing key must otherwise ask each file in turn, and with the filter it asks close to zero.

With four similar files and a filter, a missing key cost 0.05 blocks, less than merging into one file, and a key that exists cost under one block on average because some keys were still in the memtable.

A small amount of memory spent on filters buys back most of what compaction costs in reads, and it is why [Bloom Filters and Sketches](/system-design/probabilistic-structures) is in this phase. The idea of the tree of files is the subject of [LSM Trees](/system-design/lsm-trees).

## Small Choices That Add Up

Several smaller design choices carry weight, and each solves a specific problem:

- **Locality groups**: a locality group puts chosen column families into their own SSTable. The metadata of a page, such as its language and checksum, sits in one group and the page contents in another, so a job that reads just the metadata doesn't read the contents. A group can also be declared in memory, which is how the small table of tablet locations is served
- **One commit log for each tablet server**: not for each tablet, since a thousand log files written at once would mean a thousand disk seeks and groups too small to batch. The price is paid at recovery, when the tablets of a dead server go to many machines and each needs just its own entries. Reading the whole log 100 times would be wasteful, so the master has the log sorted first, by table, row and sequence number, in 64 MB segments sorted in parallel, and each new server then reads one contiguous piece
- **Two log writers**: a write to the distributed file system can stall, so each server keeps two log writers and switches to the other when one is slow, with sequence numbers to skip the duplicates
- **Quick tablet moves**: the old server does a minor compaction, stops serving, does a second very short compaction for what arrived meanwhile, and then the new server can load the tablet with no log to replay
- **Quick splits**: the files are immutable, so the two child tablets just share the parent's files
- **Compression by block**: a small part of a file can be read without unpacking the rest. A two pass scheme, one over long repeated strings and one over short ones, reached a 10 to 1 reduction on web pages, against about 3 or 4 to 1 for ordinary compressors. The reason is the row key again: pages of one host sit next to each other, and they share a lot of boilerplate

## What the Numbers Say About Scale

The system scaled by adding tablet servers. In the original measurements, going from 1 to 500 tablet servers raised aggregate throughput by more than a factor of a hundred, and by almost 300 for random reads from memory.

It didn't scale linearly: per server throughput fell between 1 and 50 servers, from uneven load and from the limit on how fast tablets are allowed to move.

Random reads from disk scaled worst, and the reason is a lesson in blocks. Each random read fetched a 64 KB block over the network to use a single value of 1,000 bytes.

One server read about 1,200 values a second, which was about 75 MB a second from the file system and enough to fill the machine's network link. The usual fix was a smaller block, about 8 KB.

The arithmetic is plain: the useful share of that 64 KB block is 1,000 divided by 65,536, about 1.5 percent. Shrinking the block to 8 KB raises it to about 12 percent, and the same network can move up to 8 times as many lookups.

Scans were fastest, since one request returns a large range, and sequential reads next, since a block that is read serves the next 64 reads from the cache. The pattern repeats through the whole design: Bigtable is built for large ranges and bulk writes, and a random read of a cold row is its slowest move.

## What It Leaves Out

The list of things Bigtable doesn't do is as important as the list of things it does. It supports transactions within a row, and no further.

It has no joins, and no secondary index, so any question that isn't a lookup or a range over the row key needs a second table that the application keeps up to date, with the care of [Keeping Caches, Indexes and Copies in Sync](/system-design/keeping-copies-in-sync).

It treats values as uninterpreted bytes and leaves types to the client. A hot row is a hot spot, since a row lives on one tablet server.

Those limits came with the design, and the design was right for its users. The families of systems it inspired, which [Wide Column Stores](/system-design/wide-column-stores) describes, kept the row key, the families and the merge of memory and files, and each changed a different part: how data is placed, how copies agree, and what a transaction may touch.

The next topics, [Dynamo](/system-design/dynamo) and [Cassandra](/system-design/cassandra), take the placement and replication in a different direction, and [Spanner](/system-design/spanner) adds the transactions that Bigtable left out.

## What the Textbook App Takes From It

The company is not Google, and the ideas still apply at small scale.

| Choice | Decision |
| --- | --- |
| Row Key | Course code followed by listing id, so a course report scans one range |
| Families | price, status and views, with the views family in its own locality group |
| Versions | Keep the last 30 versions of price, and 7 days of daily views |
| Hot Spots | Avoid leading a key with a timestamp, and hash a prefix for the write heavy event table |
| Reads | A Bloom filter on each file, and a small block size for the random lookups |
| Missing Pieces | A second table, keyed by seller, for the seller dashboard |
| When Not to Use It | Anything that needs a join or a multi row transaction stays in PostgreSQL |

## Pitfalls

- **A key that starts with a timestamp**: one tablet takes each new write
- **A forward host name**: one domain scatters over many tablets
- **A big block for random reads**: most of the bytes moved are not used
- **No filter on lookups of missing keys**: each file is asked in turn
- **Merging into one file often**: each entry is rewritten dozens of times
- **Expecting a join or a secondary index**: the key order is the sole index
- **A lock service that fails more often than the data store**: its outage becomes yours

## Key Points

- Bigtable is a sorted map from row, column and time to bytes, with atomic single row operations, a few column families and a sparse set of columns
- Rows are cut into tablets of about 100 to 200 MB, found through a three level lookup that addresses 2 to the 34th power tablets, and the row key decides what is read together: in our crawl, a reversed host name took a medium domain from 8 tablets to 1
- Each tablet is a commit log, a memtable and immutable SSTables on the file system, with a lock service tracking which server holds which tablet and one master that stays out of the data path
- <u>Compaction trades write cost for read cost</u>: in our simulation, merging into one file on each flush rewrote each entry 30.2 times, merging four similar files rewrote it 3.5 times, and a Bloom filter cut a missing key lookup from 5 blocks to 0.05
- Match the block size to the lookup, keep related columns in a locality group, and accept the limits: no joins, no secondary indexes and no transactions across rows
