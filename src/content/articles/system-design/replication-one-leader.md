> In **single leader replication**, one node, the **leader** or primary, accepts the writes and sends a log of its changes to other nodes, the **followers** or replicas, which apply the changes in the same order. Followers can serve reads and take over if the leader fails.

The textbook app's database is one machine, and it has two weaknesses. If it dies, the app is down until someone restores a backup.

And at 3,000 requests a second on registration day, most of them reads of listings, it is the busiest part of the system. Adding copies of the data helps with both: a copy can answer reads, and a copy can replace the machine that fails.

The question is how to keep copies identical when the data keeps changing. The most common answer is the simplest one: let one node decide the order of writes.

## How Followers Stay Current

The leader appends each change to a log, the same kind of log that [Write-Ahead Logs](/system-design/write-ahead-logs) described for crash recovery, and followers read that log and apply the changes in order. Because they apply the same changes in the same order, they end up with the same data.

<figure class="diagram">
<div class="flow">
<div class="node">Writes<small>from the app</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Leader<small>appends to log</small></div>
<div class="arrow wide" data-label="log stream" aria-hidden="true"></div>
<div class="stack">
<div class="node">Follower 1<small>serves reads</small></div>
<div class="node">Follower 2<small>serves reads</small></div>
</div>
</div>
<figcaption>One node orders the writes, and the followers replay its log</figcaption>
</figure>

The databases do this in similar ways. In MySQL, the source writes its binary log and a dump thread sends it to each connected replica.

On the replica, an I/O thread copies the events into a relay log and an SQL thread reads that log and executes the transactions. With parallel workers configured, a coordinator hands transactions to several appliers.

PostgreSQL's streaming replication has a standby connect to the primary and receive the write ahead log as it is produced. A warm standby accepts no connections until it is promoted, and a hot standby serves queries that read. A standby can also feed other standbys in a cascade.

Redis uses a replication ID and an offset that grows with each byte of its stream, so a replica that reconnects can say where it stopped. If the leader's backlog still holds the gap, it sends just that. Otherwise it sends a full snapshot, a more expensive resync.

## Synchronous or Asynchronous

When does the leader tell the client that a write is done? There are two answers, and they trade safety for speed.

- **Asynchronous**: The leader commits, answers at once, and ships the log in the background. It is fast, and the writes still in flight when the leader dies are lost. This is the default in MySQL, PostgreSQL and Redis
- **Synchronous**: The leader waits until a follower has the change. A single follower slows each commit, and a follower that stops answering can stall writes entirely

PostgreSQL offers levels in `synchronous_commit`: wait for the standby to write the commit record to disk, or just to receive it, or to replay it so that queries can see it. Its `synchronous_standby_names` is empty by default, meaning no synchronous standbys.

It can name the first n in a priority list or any n of a group. Commits can wait indefinitely if a synchronous standby crashes, so the list should name spares.

MySQL's semisynchronous mode makes the commit wait until at least one replica acknowledges receipt, and falls back to asynchronous after a timeout of 10,000 ms by default. After a fallback, a crash can lose transactions, and fully synchronous replication is not offered except in NDB Cluster.

MongoDB's default write concern is a majority of the data bearing voting members, and a write acknowledged by the primary alone can be rolled back after a failover.

We simulated a leader with 2 followers and a stream of 1,000 writes a second. Followers received each write 0.5 to 3 ms after it was sent, except for 0.2 percent that were delayed by 50 to 300 ms, and the leader crashed at a random moment.

These delays are our assumptions. We counted the acknowledged writes missing from the follower that took over, over 300 crashes:

| Mode | Acknowledged Writes Lost, Average | Worst Crash | Commit Latency, Average |
| --- | --- | --- | --- |
| Asynchronous | 5.0 | 112 | 0 ms |
| Wait for One Follower | 0.0 | 0 | 7.2 ms |
| Wait for Both Followers | 0.0 | 0 | 59.1 ms |

Waiting for one follower removed the loss, since at least one follower had each acknowledged write, at a cost of a few milliseconds on average. Waiting for both cost 8 times as much, with no gain here.

These runs promoted the follower that was furthest ahead. When we promoted a random follower instead, waiting for one lost 18.1 writes on average, and up to 282, which shows why the choice of the new leader matters.

## Failover: Choosing a New Leader

When the leader fails, a follower has to take over. The steps are the same everywhere: notice the failure, choose the most up to date follower, send writes to it, and turn the old leader into a follower when it returns. Each step has a way to go wrong.

- **Noticing**: Detection is a guess, as in [Failure Detection and Gossip](/system-design/failure-detection). Patroni, a PostgreSQL manager, keeps a leader key in a store such as etcd with a lifetime of 30 seconds by default and a 10 second loop. MongoDB's election timeout defaults to 10 seconds, and the median time to elect a new primary is no more than 12 seconds. Google's Cloud SQL checks the primary once a second and reports about 60 seconds of unavailability during a failover
- **Choosing**: The new leader should be the follower with the most data. Patroni refuses to promote a follower more than 1,048,576 bytes behind by default, which bounds the data that an asynchronous failover can lose. Patroni's synchronous mode will not promote a follower unless it is certain to have the acknowledged transactions, and it prefers unavailable writes to lost ones
- **Switching**: Clients and proxies have to find the new leader. Cloud SQL keeps a shared IP address so that clients reconnect with the same connection string
- **The old leader**: When it returns, it may hold writes that no one else saw. Something must tell it that it is no longer the primary, a practice called STONITH, and without it both nodes can believe they are the primary and data is lost

## Two Leaders

The worst failure is two nodes that both think they lead. GitHub's report on its October 2018 incident shows how it happens. Maintenance on optical equipment cut the link between its East Coast network hub and its primary East Coast data center for 43 seconds.

Orchestrator, its failover tool, ran a consensus among nodes in several places, and a quorum outside the East Coast promoted new primaries on the West Coast.

When the link returned, the application wrote to the new West Coast primaries. The East Coast servers held a few seconds of writes that had not been copied west, so each side had writes the other lacked, and failing back was no longer safe.

GitHub chose to keep the West Coast primaries and repair the data. Restoring several terabytes from backups, which were taken at 4 hour intervals, took hours, replicas stayed behind, and the site was degraded for 24 hours and 11 minutes.

Their report says no user data was lost, and that reconciling a few seconds of writes was still under way. One of the busiest clusters had 954 writes in the window.

Two changes followed. The tool was reconfigured so that primaries are not promoted across regional boundaries, since a promotion inside one region is generally safe and the cross country latency made the damage worse, and they moved toward designs that survive losing a data center.

The lesson is to treat a 43 second glitch as a real possibility, and to decide in advance what the automation may do.

This is the kind of problem that [Consensus and Leader Election](/system-design/consensus-leader-election) addresses: agreeing, with a majority, on who the leader is, so that two nodes can't both be right.

## A Follower That Falls Behind

A follower that can't keep up, or goes offline, has to catch up from the log. The leader has to keep the log long enough. PostgreSQL's `wal_keep_size` defaults to 0, so a standby that falls too far behind may need a new base backup unless an archive exists.

Replication slots avoid that by holding the log for each consumer, and a slot can fill the disk, the warning from [Change Data Capture](/system-design/cdc). `max_slot_wal_keep_size` can cap it.

Followers can lag even when they stay connected, which makes reads from them stale. The next topic, [Replication Lag](/system-design/replication-lag), covers how to live with that. Amazon RDS's read replicas are asynchronous and report a `ReplicaLag` metric, and its Multi-AZ mode keeps a separate synchronous standby that doesn't serve reads.

## Choosing a Setup

| Goal | Setup |
| --- | --- |
| Scale reads | Asynchronous followers, with lag in mind |
| No lost writes on failover | Wait for at least one follower, and promote the furthest ahead |
| Survive a lost data center | A synchronous follower in another zone, as in Cloud SQL's regional mode |
| Automatic recovery | A manager with a majority based store, and rules against cross region promotion |

For the textbook app, one leader with two followers fits. The followers answer the listing searches, one of them waits synchronously for commits to payments, and failover is automatic within one region.

## Key Points

- A single leader orders the writes, ships a log, and followers replay it, so they converge and can serve reads
- Asynchronous replication loses writes in flight at a crash, 5 on average in our simulation, and waiting for one follower removed the loss for a few milliseconds of latency
- <u>Failover has to promote the most up to date follower</u>, since a random one lost 18.1 writes on average in our test even with one synchronous follower
- Two nodes that both think they lead cause the worst damage, as in GitHub's 24 hour incident after a 43 second partition, so fence the old leader and limit what automation can promote
- A follower that lags serves stale reads, and a slow one forces the leader to keep its log or resync it
