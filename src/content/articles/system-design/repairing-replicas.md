> **Replica repair** is how a store with no leader pulls copies that have drifted apart back together. **Hinted handoff** delivers writes that a node missed while it was down, **read repair** fixes stale copies that a read happens to find, and **anti-entropy** compares replicas in the background, using hash trees to find differences without sending the data.

[Leaderless Replication and Quorums](/system-design/leaderless-replication) gave the textbook app replicas that accept writes while others are down, and [CRDTs](/system-design/crdts) gave merge rules that converge when updates arrive. Both assume that the updates do arrive.

Nothing so far makes sure of it. A node that is down for an hour misses an hour of writes, a message is dropped, and a disk quietly corrupts a block. Without a repair, replicas stay different.

Dynamo, the design behind Cassandra and Riak, answered with three layers, each catching what the one before misses.

## Three Layers

| Layer | When It Runs | What It Covers | What It Misses |
| --- | --- | --- | --- |
| Hinted Handoff | On the write path, when a replica is unreachable | Short outages | Long outages and lost hints |
| Read Repair | On the read path, when replicas disagree | Data that is read | Cold data that nobody reads |
| Anti-Entropy | In the background, on a schedule | The full data set | Little, at a cost in disk and network |

## Hinted Handoff

When a replica is down during a write, the system keeps the write for it. Dynamo's description: the write goes to the next healthy node in the key's list, with a hint in its metadata naming the intended owner.

That node keeps the hinted replicas in a separate store and scans it periodically. When it sees that the owner is back, it sends the data and deletes its own copy. This works best when membership churn is low.

Cassandra stores the hint at the coordinator, on local disk, and replays it when the replica returns. The defaults:

- **A time window**: Hints are kept for `max_hint_window`, 3 hours by default. If the replica returns in time, the hints are replayed, and if it stays down longer, it stays out of date until a repair
- **Timeouts count too**: A write that times out at `write_request_timeout`, 2,000 ms by default, also produces a hint
- **Safe to replay**: Each hint keeps the original mutation's timestamp, so replaying one twice does no harm
- **A throttled delivery**: 1,024 KiB a second for each delivery thread, with 2 threads by default, and the throttle is scaled down with cluster size

Hints are best effort and no substitute for repair. The throttle matters, because a backlog can take a long time to drain. With RF 3 on 6 nodes and the textbook app's 3,000 writes a second, each node receives about 1,500 writes a second. We assumed 1 KB for each hint:

| Node Down For | Hints Stored | Size | Replay at 2 MiB a Second |
| --- | --- | --- | --- |
| 30 minutes | 2.7 million | 2.6 GiB | 0.4 hours |
| 2 hours | 10.8 million | 10.3 GiB | 1.5 hours |
| 3 hours | 16.2 million | 15.4 GiB | 2.2 hours |

The recovered node is stale for a while, and while it replays, reads that reach it can return old values. The scaled throttle makes the real figures longer.

## Read Repair

When a read asks several replicas and they disagree, the coordinator writes the newest value to the stale ones. In Cassandra, the default option blocks the reply until the repair has met the consistency level, which gives monotonic quorum reads, and a read at level ONE doesn't compare replicas, so it can't repair.

Background read repair, a chance of repairing on any read, was removed in Cassandra 4.0. Riak repairs the same way when the replicas it asked disagree.

Read repair fixes the data that is read. A record that no one asks for can stay wrong indefinitely, which is why a third layer exists. Read repair is not an alternative to full repair.

## Anti-Entropy With Merkle Trees

The anti-entropy process compares replicas in the background. Sending each key to compare would cost as much as copying the data, so Dynamo uses a **Merkle tree**: a tree of hashes in which each leaf is the hash of a key's value and each parent is the hash of its children.

<figure class="chart">
<svg viewBox="0 0 420 210" role="img" aria-label="A hash tree over 8 data blocks. Each parent is the hash of its two children. One leaf differs between the replicas, and the path from that leaf to the root is highlighted, so the comparison descends along that path alone." style="width:100%;max-width:380px;height:auto;display:block;margin:0 auto">
<line x1="30" y1="176" x2="55.0" y2="124" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="80" y1="176" x2="55.0" y2="124" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="130" y1="176" x2="155.0" y2="124" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="180" y1="176" x2="155.0" y2="124" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="230" y1="176" x2="255.0" y2="124" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="280" y1="176" x2="255.0" y2="124" style="stroke:var(--accent)" stroke-width="2.5"/>
<line x1="330" y1="176" x2="355.0" y2="124" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="380" y1="176" x2="355.0" y2="124" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="55.0" y1="124" x2="105.0" y2="72" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="155.0" y1="124" x2="105.0" y2="72" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="255.0" y1="124" x2="305.0" y2="72" style="stroke:var(--accent)" stroke-width="2.5"/>
<line x1="355.0" y1="124" x2="305.0" y2="72" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="105.0" y1="72" x2="205.0" y2="22" style="stroke:var(--border)" stroke-width="1.5"/>
<line x1="305.0" y1="72" x2="205.0" y2="22" style="stroke:var(--accent)" stroke-width="2.5"/>
<rect x="12.0" y="165.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="30" y="180" text-anchor="middle" font-size="11" style="fill:var(--text)">k1</text>
<rect x="62.0" y="165.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="80" y="180" text-anchor="middle" font-size="11" style="fill:var(--text)">k2</text>
<rect x="112.0" y="165.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="130" y="180" text-anchor="middle" font-size="11" style="fill:var(--text)">k3</text>
<rect x="162.0" y="165.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="180" y="180" text-anchor="middle" font-size="11" style="fill:var(--text)">k4</text>
<rect x="212.0" y="165.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="230" y="180" text-anchor="middle" font-size="11" style="fill:var(--text)">k5</text>
<rect x="262.0" y="165.0" width="36" height="22" rx="4" style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="1.5"/>
<text x="280" y="180" text-anchor="middle" font-size="11" style="fill:var(--text)">k6</text>
<rect x="312.0" y="165.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="330" y="180" text-anchor="middle" font-size="11" style="fill:var(--text)">k7</text>
<rect x="362.0" y="165.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="380" y="180" text-anchor="middle" font-size="11" style="fill:var(--text)">k8</text>
<rect x="37.0" y="113.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="55.0" y="128" text-anchor="middle" font-size="11" style="fill:var(--text)">H1</text>
<rect x="137.0" y="113.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="155.0" y="128" text-anchor="middle" font-size="11" style="fill:var(--text)">H2</text>
<rect x="237.0" y="113.0" width="36" height="22" rx="4" style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="1.5"/>
<text x="255.0" y="128" text-anchor="middle" font-size="11" style="fill:var(--text)">H3</text>
<rect x="337.0" y="113.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="355.0" y="128" text-anchor="middle" font-size="11" style="fill:var(--text)">H4</text>
<rect x="87.0" y="61.0" width="36" height="22" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<text x="105.0" y="76" text-anchor="middle" font-size="11" style="fill:var(--text)">H5</text>
<rect x="287.0" y="61.0" width="36" height="22" rx="4" style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="1.5"/>
<text x="305.0" y="76" text-anchor="middle" font-size="11" style="fill:var(--text)">H6</text>
<rect x="181.0" y="11.0" width="48" height="22" rx="4" style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="1.5"/>
<text x="205.0" y="26" text-anchor="middle" font-size="11" style="fill:var(--text)">Root</text>
<text x="290" y="200" font-size="11" style="fill:var(--muted)">the differing block is k6</text>
</svg>
<figcaption>Equal roots mean equal data, and a difference is found by following the highlighted path</figcaption>
</figure>

Two replicas compare the root hashes of a key range they share. If the roots are equal, the data under them is equal and no data is sent.

If not, they exchange the hashes of the children and continue into the subtrees that differ, until they reach the leaves, which name the keys that are out of sync. This reduces both the data transferred and the disk reads. Each branch can be checked independently, without downloading the whole tree.

We measured the effect on 1 million keys where two replicas differ in k random keys, and a leaf covers B consecutive keys:

| Differing Keys | Keys per Leaf | Hashes Compared | Keys Streamed |
| --- | --- | --- | --- |
| 10 | 1 | about 294 | 10 |
| 10 | 100 | about 198 | 1,000 |
| 1,000 | 1 | about 20,394 | 1,000 |
| 1,000 | 100 | about 7,012 | 95,500 |
| 1,000 | 10,000 | about 206 | 1,000,000 |

A leaf per key finds 10 differing keys among a million with about 300 hash comparisons, against a million for a key by key check.

A coarse leaf is cheaper to compare and streams much more than it needs to: with 10,000 keys per leaf and 1,000 differences, each leaf differs, and the whole data set is streamed. Trees with fine leaves are large, and coarse ones over stream. This tension is the tuning problem of tree based repair.

Dynamo keeps a separate tree for each key range of a virtual node. It names the disadvantage: when a node joins or leaves, many key ranges change and the trees must be recomputed, a problem that its refined partitioning scheme reduces.

ScyllaDB ran into the trouble with fixed leaves before version 3.1.

Its old method split a range into pieces of about 100 partitions, compared checksums for each, and streamed a whole piece on a mismatch, so one differing row could stream 100 partitions, and in the worst case a single byte could stream up to 10 GB. Version 3.1 repairs at the row level, with a 64 bit hash for each row.

Their test on 3 nodes with a billion rows, 99.9 percent already in sync, took 96.4 minutes before and 14.2 minutes after, with transfer falling from 120.52 GiB to 4.28 GiB.

## Running Repairs

Repair is a scheduled job, and how it runs differs. Cassandra does not start a repair by itself. An operator or a tool runs `nodetool repair`:

- **Full or incremental**: A full repair covers the whole range. An incremental repair, the default, covers data written since the last one, and occasional full repairs are advised to catch corruption and mistakes
- **Primary ranges**: By default a node repairs each range it holds, which duplicates work, and `-pr` limits it to the ranges it owns first
- **Preview**: `--preview` builds the trees and reports what would stream, without streaming
- **Cadence**: A typical cadence is an incremental repair at 1 to 3 day intervals and a full one at 1 to 3 week intervals

Riak runs its version without being asked. Active anti-entropy is on by default, keeps its hash trees on disk and updates them as writes arrive, so a restart doesn't rebuild them, and regenerates them weekly by default to catch silent corruption.

Its defaults include a 15 second trigger interval and a limit of 2 concurrent exchanges, and `riak-admin aae-status` shows what has been repaired.

## The Deadline: Deletes

Repair has a deadline set by deletes. A delete in these stores writes a tombstone, a marker that must reach each replica before it is purged.

Repair must run often enough that the grace period, `gc_grace_seconds`, which defaults to 10 days, doesn't expire on unrepaired data. Otherwise a replica that missed the delete can send the old value back after the tombstone is purged elsewhere, and deleted data reappears.

Repairing each node at least once in 7 days leaves about 3 days of slack. If data is deleted often, repair more often than the grace period.

## A Plan for the Textbook App

| Failure | Layer That Handles It |
| --- | --- |
| A node reboots for 5 minutes | Hinted handoff |
| A popular listing is read from a stale replica | Read repair |
| A node was down for a day, past the hint window | A full repair after it returns |
| Listings nobody reads drifted apart | The scheduled anti-entropy repair |
| Deleted listings come back | Repair inside the grace period |

The team schedules incremental repairs at two day intervals and a full repair at two week intervals, off peak, watches how long they run and how much they stream, and alerts if a repair hasn't finished within the grace period.

## Key Points

- Replicas drift from outages, lost messages and corruption, and three layers repair them: hinted handoff, read repair and anti-entropy
- Hinted handoff keeps writes for a down node, for 3 hours by default in Cassandra, and best effort: a 2 hour outage left 10.8 million hints that took about 1.5 hours to replay in our calculation
- Read repair fixes the data that is read, so cold data needs the background process
- <u>A Merkle tree finds differences by comparing hashes</u>: about 300 comparisons located 10 differing keys among a million, though a coarse leaf streamed 1,000 times more than it needed
- Repair has a deadline set by the delete grace period, 10 days by default, or deleted data comes back
