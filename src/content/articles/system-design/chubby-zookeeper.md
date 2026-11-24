> **Chubby** and **ZooKeeper** are small, replicated coordination services that other distributed systems use to elect a leader, hold a lock, find each other and keep a little configuration in one agreed place. Chubby, from Google, is a lock service with consistent caching. ZooKeeper, from Yahoo, gives up locks and blocking calls and offers wait free data nodes, ordering guarantees and watches, from which clients build their own tools.

Throughout this phase, systems have leaned on a service that we skipped. [GFS and HDFS](/system-design/gfs-hdfs) needs to know which machine is the master. [Bigtable](/system-design/bigtable) keeps the lock files of its tablet servers there and finds its root tablet through it.

[Cassandra](/system-design/cassandra) used one to elect a leader. Each of those systems has its own replication, and each still needs one small thing that the machines agree on.

The textbook app has the same need at a smaller size. Six servers run a nightly job, and exactly one of them should run it. A configuration flag changes during registration week, and each server should see the change within seconds.

A new search server joins, and the others should find it. A file on a shared disk could hold those facts, until the disk is a single point of failure and two servers disagree about who got the lock.

That is the problem of coordination, and it is a form of consensus: the machines must agree on a value, in a network that loses, delays and reorders messages.

Writing a consensus protocol into each system is hard and easy to get wrong, so two services packaged it. This topic compares their choices, and puts numbers on two of them. It builds on [Consensus and Leader Election](/system-design/consensus-leader-election) and [Distributed Locks and Fencing Tokens](/system-design/distributed-locks).

## Why a Service and Not a Library

Chubby's author considered writing a Paxos library that each system would link in, and chose a lock service instead, for four reasons that still apply:

- **Prototypes grow up**: developers start with a prototype that has no plan for high availability, and add replication and leader election later. With a lock service, adding a primary is a few lines: acquire a lock, pass the lock's acquisition count with each write, and have the file server reject a write whose count is older. That is easier than making an existing server take part in a consensus protocol
- **Announcing the primary**: services that elect a primary also need to announce who it is, so the service allows small files, and a lock service that holds them gives clients one fewer system to depend on
- **Familiar tools**: programmers understand locks, even if they are usually wrong about how locks behave when machines fail independently
- **Fewer machines**: a service reduces the number of machines a client system needs. Chubby's five replicas need three to be up, and a client system with a single running process can still obtain a lock and make progress safely

Chubby chose coarse grained locks, held for hours or days, such as the lock that elects a primary. They put little load on the service, survive its failures, and let a modest number of servers serve many clients.

A system that needs fine grained locks can build them on top, using a coarse lock to hand out groups of locks to its own lock servers.

## How Chubby Works

A Chubby cell is five replicas, placed to reduce correlated failures. They use a consensus protocol to elect a master, which holds a lease of a few seconds, renewed as long as it keeps winning a majority. Only the master serves requests.

A write is acknowledged once a majority of replicas have it, and reads are served by the master alone, which is safe while its lease is valid, since no other master can exist. A failed master is replaced within a few seconds, with elections measured at 4 and 6 seconds and some as long as 30.

The interface looks like a small file system with advisory locks: paths like `/ls/cell/service/primary`, whole file reads and writes, and a node that can be a lock. Nodes can be ephemeral, deleted when no client holds them open, which makes a file that says that a client is alive.

Each client holds a **session**, kept alive by KeepAlive calls. The session has a lease, and the master extends it each time it answers a KeepAlive, by 12 seconds by default.

The client sends the next KeepAlive as soon as one returns, so one is usually waiting at the master, and the master uses the reply to carry events and cache invalidations back.

If a client can't renew in time, it enters a period of grace and tells its application that the session is in jeopardy, which gives a master failover time to complete without clients losing their locks. In practice the grace period was long enough that applications saw a pause and no worse effect.

Clients cache file data in memory, and the cache is kept consistent, not by timeouts. When a file changes, the master blocks the write until it has invalidated the cache of each client that holds it.

The authors chose this deliberately: developers don't have to pick a time to live, which, as with DNS, is either too long for failover or too short for load.

It also shows in the size of the load: most of the requests to a cell were KeepAlives, not reads, so the master was busy with sessions rather than data.

One more tool deals with delayed messages. A lock holder can request a **sequencer**, a string that names the lock and its acquisition count, and pass it with its requests to other servers, which check it against the lock service or against the latest one they have seen.

It is the fencing token of [Distributed Locks and Fencing Tokens](/system-design/distributed-locks): a request from a client whose lock has since moved on is refused.

## The Cost of Consistent Caches

Chubby's invalidation scheme has a cost that ZooKeeper's authors pointed at. When a client that caches a file is slow or dead, the write waits for it to acknowledge or for its lease to expire. The lease bounds the damage, and it is still a delay.

We computed how often that happens. Say that each client that caches a file is unresponsive at a given moment with probability 0.1 percent, and a write must wait for each of them. The write is delayed if at least one of the clients is unresponsive:

| Clients Caching the File | Chance a Write Waits for a Lease |
| --- | --- |
| 10 | 1.0% |
| 100 | 9.5% |
| 1,000 | 63.2% |
| 10,000 | 99.995% |

With a thousand clients, most writes wait, and the wait can be as long as the lease, 12 seconds by default. That is acceptable for configuration that changes rarely, which is Chubby's use, and it is the reason that a system with many cachers and frequent writes wants another design.

## What ZooKeeper Does Differently

ZooKeeper starts from the opposite instinct: don't block. It leaves locks out of the service and offers a small set of operations on **znodes**, nodes in a tree that hold small amounts of data, and each call returns without waiting for another client.

A slow or faulty client can't hold up a fast one. The service is a kernel, and clients build locks, queues, barriers and elections from it.

Znodes come in kinds:

- **Regular**: created and deleted explicitly
- **Ephemeral**: vanishes when the session that made it ends, whether the client left or died
- **Sequential**: a flag that appends a counter, which doesn't go backwards, to the name

Reads can set a **watch**: a one time notification that the data or the children changed. A watch says that something changed and not what, and is deleted once it fires. Updates take an expected version, so a conditional write fails if another client got there first.

The ordering guarantees are two:

- **Linearizable writes**: all writes are ordered by a leader through an atomic broadcast protocol called Zab
- **FIFO order for each client**: each client's requests run in the order it sent them, so a client can send many requests at once without waiting for each answer

Reads are served locally by the server the client is connected to, with no broadcast, which lets read throughput grow with the number of servers, at the price that a read can be slightly old.

A `sync` call makes a server catch up first, for the cases where it matters. The design targeted workloads with 2 to 100 reads for each write, and measured tens to hundreds of thousands of operations a second.

The same difference shows in caching. ZooKeeper doesn't manage the client cache. A client that wants to cache sets a watch and clears its cache when the watch fires. A slow client then delays just itself, and a write doesn't wait for it.

## Building a Lock From Parts

The best test of a kernel is whether it can build what the lock service offers. A lock with ZooKeeper is built in a few steps, and the first version shows a problem.

The simplest version has each waiting client try to create the same ephemeral znode. The winner holds the lock, and the others watch the znode, and when the holder dies or deletes it, they rush to create it again. With N waiters, each release wakes the N and one wins, which is the herd effect.

The better version gives each client a sequential, ephemeral znode in a directory, and the client with the lowest number holds the lock. Each other client watches the znode just before its own and no other.

When the holder leaves, exactly one waiter wakes. A crashed client's znode disappears with its session, so its place in line is released on its own.

We counted what the herd costs in wakeups. N clients wait, and the lock passes down the line one at a time:

| Waiting Clients | Wakeups, Everyone Watches One Znode | Wakeups, Each Watches the Previous |
| --- | --- | --- |
| 10 | 45 | 9 |
| 100 | 4,950 | 99 |
| 1,000 | 499,500 | 999 |

The first column grows with the square of the number of waiters, which is N times N minus 1 over 2, and the second grows in a line. At a thousand waiters, the difference is half a million notifications against a thousand.

The same pattern, a sorted list of ephemeral nodes and a watch on the predecessor, builds read and write locks, queues and leader elections, and each has a standard recipe.

## Comparing the Two

| Question | Chubby | ZooKeeper |
| --- | --- | --- |
| Central Idea | A lock service with small files | A kernel for building coordination |
| Blocking | Locks and blocking calls | Wait free operations |
| Caching | Consistent, invalidated by the master | Clients cache and use watches |
| Reads | Served by the master | Served by any server, possibly stale |
| Ordering | One master orders the writes | Linearizable writes, FIFO per client |
| Fencing | Sequencers on locks | Version numbers and sequential nodes |

Both rest on the same foundation: a small replicated state machine with a leader, and a quorum of three out of five.

Both are meant for metadata and not for bulk data: a few kilobytes in a node, a modest count of nodes, and a modest write rate. Using one to store large or fast changing data makes the leader the bottleneck of a whole fleet.

## Using Them Well

A few habits follow from the designs. Keep the data small and the writes rare. Use ephemeral nodes for liveness, and set the session timeout to balance two failures: too short and a brief pause makes the system think a healthy client is dead, too long and a dead client holds a lock for ages.

Protect the work behind a lock with a token, since a client whose session expired can still believe it holds the lock, as in [Distributed Locks and Fencing Tokens](/system-design/distributed-locks).

And treat the service as a dependency with an availability of its own: Bigtable measured the share of server time lost to the lock service being unreachable at 0.0047 percent on average, and the design pays attention to it because Bigtable is down when Chubby is.

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Nightly Job on One Server | An ephemeral lock znode, with a token written to the job's output |
| Configuration | A few small nodes, read with watches, and not polled |
| Finding Search Servers | Each server registers an ephemeral node, and clients watch the directory |
| Queue of Waiters | Sequential nodes, each waiter watching the one before |
| Ensemble | Five servers across three zones, so two can fail |
| Data Limits | Kilobytes, not megabytes, and rare writes |

## Pitfalls

- **Large or fast changing data in the service**: the leader becomes the bottleneck of the fleet
- **Everyone watching the same node**: a release wakes the whole herd
- **A lock without a token**: a client with an expired session still writes
- **A session timeout copied from another system**: too short causes false deaths, too long delays failover
- **Reading a possibly stale replica and assuming freshness**: a sync is needed where it matters
- **Fine grained locks held in the service**: its load grows with the clients' transaction rate
- **A single replica for the service**: the coordinator becomes the single point of failure it was meant to remove

## Key Points

- Coordination services give distributed systems one small place to agree: leader election, locks, configuration and membership, built on consensus so that each system doesn't have to
- Chubby is a lock service with five replicas, a master lease and sessions kept alive by KeepAlive calls, and it targets coarse grained locks held for hours or days, with sequencers to fence delayed requests
- <u>Consistent caching has a price</u>: when a write must wait for each caching client, 1,000 clients each unresponsive 0.1 percent of the time made 63.2 percent of writes wait for a lease, 12 seconds by default
- ZooKeeper offers wait free znodes, linearizable writes, FIFO client order, local reads and one time watches, and clients build locks from them: waiters watching the predecessor needed 999 wakeups for 1,000 waiters, against 499,500 for a herd
- Keep the data small, use ephemeral nodes for liveness, set session timeouts on purpose, and fence the work that a lock protects
