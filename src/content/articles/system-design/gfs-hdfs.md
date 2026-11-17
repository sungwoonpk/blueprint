> The **Google File System (GFS)** and the **Hadoop Distributed File System (HDFS)** are distributed file systems built for very large files on many cheap machines. Both split each file into large blocks, copy each block to several machines, keep the file names and block locations in the memory of one master, and let clients move the data directly to and from the machines that hold it. GFS came from Google in 2003, and HDFS, an open source system with the same shape, was described by Yahoo in 2010.

Imagine that the textbook app grows into a company with a data team. Each night a job reads the day's logs and the archive of photos, terabytes together, to compute what students searched for and which listings sold.

One server's disk can't hold that, and a file system on one machine can't serve it. We need a place where a 10 terabyte file is an ordinary file, and where the loss of a disk is an ordinary day.

That was the problem GFS solved, and the answers it gave shaped the next two decades of data systems. This topic reads the two papers, adds our own arithmetic for the two parts that matter most, memory and recovery, and connects them to the topics before and after.

## The Assumptions Behind the Design

GFS's authors began from the workload, not from the usual file system. Their paper lists observations that look unusual and turned out to be common: component failures are normal, files are huge, most files change by appending and rarely by overwriting, and applications read large streams more often than small random pieces.

The paper says that it co designed the file system with the applications, which allowed it to relax the interface, including its consistency rules.

HDFS's design page states the same ideas in its own words. Hardware failure is the norm and not the exception. Applications need a write once, read many access model.

Streaming throughput matters more than latency, and files run from gigabytes to terabytes. It adds a principle that shaped what came next: moving the computation to the data is cheaper than moving the data to the computation.

The consequences are choices that would be wrong for a laptop's file system: very large blocks, a single point that knows where each block is, and copies as the answer to failure.

## One Master, Many Chunkservers

A GFS cluster has one **master** and many **chunkservers**. A file is cut into fixed size **chunks** of 64 MB, each stored as an ordinary file on a chunkserver, and each chunk is copied to three chunkservers by default. The master holds the namespace, the map from files to chunks, and where each chunk's replicas are.

It doesn't carry the data. A client asks the master where a chunk is, caches the answer, and then reads from a chunkserver directly. HDFS names the parts the **NameNode** and **DataNodes**, uses blocks of typically 128 MB and, as its design page puts it, user data doesn't flow through the NameNode.

<figure class="diagram">
<p class="rowname">Metadata</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" data-label="where?" aria-hidden="true"></div>
<div class="node hot">Master<small>in memory</small></div>
</div>
<p class="rowname">Data</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Server A</div>
<div class="arrow" data-label="copy" aria-hidden="true"></div>
<div class="node">Server B</div>
<div class="arrow" data-label="copy" aria-hidden="true"></div>
<div class="node">Server C</div>
</div>
<figcaption>Control goes to the master, and the data goes straight to the chunkservers, which copy it along a chain</figcaption>
</figure>

The master keeps its metadata in memory, which makes it quick and lets it scan its whole state in the background to find chunks that need repair or moving. The GFS paper says it needs less than 64 bytes of metadata for each 64 MB chunk.

Changes to the namespace are recorded in an operation log on the master's disk and on remote machines, and the master takes checkpoints so that recovery replays a short log. HDFS uses the same pair under the names FsImage and EditLog.

The big chunk is the key choice, and the paper gives its reasons. A client needs fewer trips to the master, since reads and writes within one chunk need one lookup. It can keep a connection to a chunkserver open over a long time.

And the metadata stays small enough for memory. The price is hot spots: a small file is one chunk, and many clients reading it hit the same three servers. The paper reports that this happened when an executable was written to GFS and hundreds of machines started it at once.

Small files cost far more than their size, since each file takes at least one chunk entry. We computed it with the paper's 64 bytes for the textbook app's photos, 9 million of them at 300 KB, about 2.7 TB:

| Layout | Chunks | Metadata |
| --- | --- | --- |
| 9 Million Files of 300 KB | 9,000,000 | 576 MB |
| 90,000 Packed Files of 30 MB | 90,000 | 5.8 MB |
| 42,000 Packed Files of 64 MB | 42,000 | 2.7 MB |

The same bytes cost 200 times the metadata when stored as separate small files. A petabyte of full chunks needs about 1 GB at the paper's figure.

The lesson for any system of this shape is to pack small objects into big containers, and to treat the number of files, not the number of bytes, as the limit.

## Writing Without a Bottleneck

A write must reach three replicas, and in the same order on each, without sending the whole stream through one machine. GFS separates the two jobs.

The master grants a **lease** on a chunk to one of its replicas, the primary, for an initial 60 seconds, extended as long as the chunk is being written, with the extension requests carried on the regular heartbeat messages.

The primary assigns a serial order to the mutations, and the other replicas follow it. The data itself flows along a chain from chunkserver to chunkserver, each forwarding to the next, so that the sending machine's network is used fully.

HDFS has the same pipeline, with the client sending to the first DataNode, which forwards to the second, and so on.

The paper's measurements show where the limit comes from. With 16 chunkservers each taking 12.5 MB/s, the ceiling for aggregate writes was 67 MB/s, since each byte is written to 3 servers, and the clients achieved about half of it.

A single client wrote at 6.3 MB/s. The authors call writes slower than they would like and note that the aggregate rate across many clients was what mattered for their workloads.

GFS also offers **record append**, where many clients add to one file and the system picks the offset. Each append is atomic and happens at least once, so a reader may see padding and duplicates and must handle them: the paper has writers add checksums and unique identifiers to records so that readers can skip the junk.

That is the pattern of [Avoiding Duplicate Work and Double Charges](/system-design/duplicate-work) applied inside a file system.

HDFS took the simpler route in its first design, a single writer for each file holding a lease, with a soft limit after which another client can take over and a hard limit of one hour after which HDFS closes the file for the writer.

## Surviving Failures

Placement decides what a failure costs. HDFS's default for three replicas puts the first on the writer's node, or a random node in its rack, the second on a node in a different rack, and the third on another node in that same remote rack.

The design page's reasoning is that a rack failure is far less likely than a node failure, and the policy cuts the network traffic between racks for writes, at the price of storing a block in two racks and not three. GFS spreads replicas across racks too, and prefers chunkservers with less disk used.

Failures are found by heartbeats. The HDFS paper gives a default interval of three seconds and declares a DataNode out of service after ten minutes without one, a delay the design page calls conservatively long, to avoid a storm of copying after a brief outage.

GFS detects stale replicas, ones that missed writes while down, with a version number for each chunk, and it detects corruption with a 32 bit checksum for each 64 KB block. [Failure Detection and Gossip](/system-design/failure-detection) covers the general problem.

When a node is declared dead, the system must make new copies, and the GFS master does it with rules. It re-replicates a chunk as soon as the live replicas fall below the goal, ordered by how far a chunk is from the goal, by whether its file is live, and by whether it blocks a client.

To keep the copying from overwhelming clients, it limits the active clone operations for the cluster and for each server, and each clone's bandwidth.

The paper reports two experiments. After killing a chunkserver with 15,000 chunks and 600 GB, with the limits set at 91 concurrent clones and 6.25 MB/s each, the whole set was restored in 23.2 minutes, at 440 MB/s.

After killing two chunkservers of about 16,000 chunks each, the 266 chunks left with a single replica were back to at least two within 2 minutes, because they were copied first.

Recovery speed is a reliability setting. We worked it out for a bigger cluster than the paper's: 1,000 nodes of 10 TB, so 10 PB, one node failing. The time to restore its 10 TB depends on the number of clones and their rate:

<figure class="chart">
<div class="hbars" role="img" aria-label="Hours to restore one node for four repair settings">
<div class="hbar peak"><span>10 Clones, 6.25 MB/s</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">44.4 h</span></div>
<div class="hbar"><span>91 Clones, 6.25 MB/s</span><span class="track"><span class="fill" style="--w: 11%"></span></span><span class="value">4.9 h</span></div>
<div class="hbar"><span>400 Clones, 6.25 MB/s</span><span class="track"><span class="fill" style="--w: 2.5%"></span></span><span class="value">1.1 h</span></div>
<div class="hbar"><span>400 Clones, 25 MB/s</span><span class="track"><span class="fill" style="--w: 0.6%"></span></span><span class="value">0.3 h</span></div>
</div>
<figcaption>Hours to restore the 10 TB of one failed node, by repair clones running and their speed, from our arithmetic</figcaption>
</figure>

The number of clones decides whether recovery takes 44 hours or about one. Slow recovery matters because data is lost when the three replicas of a chunk are gone together before one is rebuilt.

We modeled it simply: nodes fail on average once in 3 years, an assumption, chunks are placed at random, and a loss needs three failures to overlap in time.

With 149 million chunks, a given set of three failed nodes holds the three replicas of about 0.9 chunks on average, so any triple overlap is likely to lose data:

| Recovery Window | Triple Overlaps a Year | Chunks Lost a Year |
| --- | --- | --- |
| 1.1 Hours | 0.29 | 0.26 |
| 6 Hours | 7.5 | 6.7 |
| 44 Hours | 167 | 149 |

The model ignores the priority rule, which fixes the most endangered chunks first and shrinks the real risk, so the figures overstate the loss. The shape is what to take from it: the risk grows much faster than the window, because overlap needs several failures to coincide.

A system that copies fast and a placement that limits which nodes share chunks both reduce it. This is the same reasoning as the repair processes of [Repairing Replicas with Hinted Handoff and Merkle Trees](/system-design/repairing-replicas) and the movement of data in [Rebalancing Shards](/system-design/rebalancing).

## The Single Master

One master is simple, and a risk. GFS keeps it small and fast: the operation log and checkpoints let a new master start quickly, and shadow masters can serve reads from a replica of the log, slightly behind the primary. HDFS clusters grew to a size where the NameNode was a real limit.

The HDFS paper describes a Yahoo cluster of 3,500 nodes with about 60 million files and 63 million blocks, so each DataNode hosted about 54,000 block replicas, and it describes 25,000 servers holding 25 PB across their clusters. It also notes that GFS was evolving to many namespace servers, with a target of 100 million files each.

The HDFS answer for availability, later than the paper, is a standby. The current documentation describes an active NameNode and a hot standby sharing an edit log kept on a group of JournalNodes.

The active writes each change to a majority of at least 3 of them, the standby reads and applies it, and the journal accepts a single writer at a time, which prevents two active NameNodes.

Fencing, killing or cutting off the old active, is still advised. It is the majority log and the leader switch of [Consensus and Leader Election](/system-design/consensus-leader-election) in a concrete form, and the fencing is the problem of [Distributed Locks and Fencing Tokens](/system-design/distributed-locks).

## Erasure Coding

Three copies cost 200 percent extra. HDFS's erasure coding documentation says typical erasure coding costs no more than 50 percent.

With the default policy, called RS-6-3-1024k, each stripe has 6 data blocks and 3 parity blocks, so a file of 6 blocks takes 9 blocks of disk, where 3 copies take 18. Any 3 of the 9 can be lost.

For 1 PB of data, that is 3 PB with replicas and 1.5 PB with the 6 and 3 code, a saving of 1.5 PB. The documentation lists the costs:

- **CPU**: Encoding and decoding take work on clients and DataNodes
- **Network**: A striped file is spread over racks, so most reads and writes cross racks, and the documentation says network bisection bandwidth is very important. Rebuilding one lost block reads several of the others, at least 6 for this code by our arithmetic, where a replica copy reads one
- **Machines**: The 6 and 3 policy needs at least 9 DataNodes, and at least 3 racks to survive a rack, ideally more
- **Features**: Append, truncate and the flush calls aren't supported on erasure coded files, and changing a file's policy means rewriting it

So the choice follows the heat of the data, as in [Tiering Hot and Cold Data](/system-design/hot-cold-data): replicate data that is read and written often, and erasure code the cold data that is written once.

## What the Textbook App Takes From It

| Question | Lesson |
| --- | --- |
| Who needs this today? | Mostly big data platforms, since most applications use object storage, as in [Choosing Between Block, Object and File Storage](/system-design/storage-types) |
| Photos and logs | Pack small files into large objects, and keep the file count in check |
| Copies | Three replicas in two racks for hot data, erasure coding for cold data |
| Repair | Measure how long a lost disk takes to rebuild, and cap repair traffic so clients keep working |
| Metadata | One node's memory bounds the file count, so watch it |
| Failure | Use heartbeats with a delay long enough to avoid copying after a short outage |
| Next Steps | [MapReduce](/system-design/mapreduce) and [Bigtable](/system-design/bigtable) were designed to run over this kind of file system |

## Pitfalls

- **Millions of small files**: The master's memory limits the count long before the disks fill
- **Instant re-replication after a blip**: A short outage starts a storm of copying
- **Unthrottled repair**: Rebuilding crowds out the clients
- **Slow recovery with random placement**: Overlapping failures lose data
- **A single master with no standby**: A restart stops the cluster
- **Erasure coding for hot, small, or appended files**: The features and the network cost don't fit

## Key Points

- GFS and HDFS split huge files into big blocks, keep three copies, and keep the map in one master's memory, with data going straight between clients and chunkservers
- Big chunks keep the master small and clients quiet, but small files cost a chunk each: in our arithmetic, 9 million photos took 576 MB of metadata and the same bytes packed took 2.7 MB
- Leases fix the order of writes and a pipeline moves the data, so no single machine carries the whole stream
- <u>Recovery speed is a reliability setting</u>: in the paper, a 600 GB node was restored in 23.2 minutes, and in our model a 10 TB node took 44 hours with 10 clones and 1.1 hours with 400
- The single master is the weak point and a standby with a majority log fixes it, and erasure coding cuts storage from 200 to 50 percent overhead for cold data, at a cost in CPU, network and features
