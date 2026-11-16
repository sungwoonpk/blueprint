> In **multi-leader replication**, several nodes accept writes at the same time and send them to each other, so each location or device has a leader of its own. Writes stay local and fast, and the price is that two leaders can accept conflicting changes that must be reconciled.

The textbook app is now used in two regions, and sellers in the second region wait for each write to travel to the single leader in the first.

A round trip across an ocean is about 150 ms in the latency table from [Why Distributed Systems Are Hard](/system-design/why-distributed-is-hard), and a listing form can make several writes. If the first region's data center goes down, the second can't post until a failover.

An obvious fix is a leader in each region. Both accept writes and copy them to the other. That is multi-leader replication, and it is the first design in this phase where two nodes can disagree about the same row at the same moment.

## Where It Is Used

Three situations lead to more than one leader:

- **Several data centers**: Each region has a leader, so writes are local and a region keeps working if the link to the other fails. Azure Cosmos DB's multi region writes and DynamoDB global tables both work this way
- **Offline clients**: A phone that edits a draft without a connection is a leader of its own, and it syncs later. CouchDB was built around this, with replication between any two copies
- **Collaborative editing**: Each user edits a local copy, and the changes are merged, as in Google Docs and Figma

| Question | One Leader for the Regions | A Leader in Each Region |
| --- | --- | --- |
| Write Latency From Far Away | A full round trip | Local |
| A Region Goes Down | Failover needed | Others keep accepting writes |
| Conflicting Writes | Not possible | Possible, must be resolved |
| Complexity | Lower | Higher |

<figure class="diagram">
<div class="flow">
<div class="stack">
<div class="node hot">East Leader<small>takes writes</small></div>
<div class="node hot">West Leader<small>takes writes</small></div>
</div>
<div class="arrow wide" data-label="copy each other" aria-hidden="true"></div>
<div class="stack">
<div class="node">East Followers</div>
<div class="node">West Followers</div>
</div>
</div>
<figcaption>Each region writes locally, and the leaders exchange their changes in both directions</figcaption>
</figure>

## The Problem: Conflicts

A seller in the East lowers a listing's price to 4,000 cents. In the same second, an admin in the West sets it to 3,500. Each leader accepts its write at once. When they exchange changes, each finds a different value for the same field, and neither can tell which one is right.

Cosmos DB names three kinds: **insert conflicts**, where two regions create an item with the same unique value, **replace conflicts**, where two regions update the same item, and **delete conflicts**, where one deletes and another updates.

How often does it happen? We simulated two regions that each took 500 writes a second for 2 minutes over 1 million listings, where 70 percent of writes went to the hottest 1 percent of listings. We counted a write as a conflict when the other region had written the same listing within the replication delay:

| Replication Delay | Writes That Conflict |
| --- | --- |
| 0.1 seconds | 0.24% |
| 1 second | 2.33% |
| 5 seconds | 10.19% |

With uniform popularity, with each listing equally likely to be written, the 1 second figure fell to 0.047 percent. Conflicts depend on how long the leaders disagree and on how concentrated the writes are. A few popular rows account for most of them, and a slow link multiplies them.

## Avoiding Conflicts

The cheapest conflict is one that can't happen. Route the writes for a given record to one leader, its home region. Within that record there is a single writer, as in single leader replication, and the system still survives the loss of a region by changing the home.

EDB's multi-master PostgreSQL product suggests this too: it lists quorum commit, CRDT data types and a connection manager that routes writes to one write leader as ways to avoid conflicts.

The price is latency for the writes that arrive in the wrong region, which need a trip to the home. In the textbook app, a seller's listings can live in the seller's region.

## Last Write Wins

When conflicts can't be avoided, the simplest rule is to keep the write with the latest timestamp and drop the other. DynamoDB global tables do this for each item, using an internal timestamp, and the replicas converge on the last write.

Cosmos DB's default policy keeps the highest value of a path, `_ts` unless you pick another numeric field, and deletes beat inserts and replaces. Its documentation adds that conflicts settled this way do not appear in the conflicts feed.

The rule is easy and has two weaknesses. Each conflict throws away one of two valid edits without a record: at 1 second of delay in our simulation, about 2 percent of writes. And the winner depends on clocks.

As in [Physical and Logical Clocks](/system-design/clocks), 10 ms of clock error was enough to let the earlier write win in 11 percent of cases within a 50 ms window. LWW is fine for values where the latest wins by nature, such as a "last seen" time, and risky for anything a person edited.

## Merging by Code

When both edits matter, keep both and merge. CouchDB treats a conflict as normal data. Each document keeps a tree of revisions, so conflicting updates become branches.

Each peer picks the same winner by a deterministic rule, so a plain read returns one version, and `_conflicts` lists the others. The application fetches the branches, writes a merged revision and marks the losers deleted in one request.

Cosmos DB offers a custom policy with a merge stored procedure, run on the server as part of the commit. It receives the incoming item, the existing one, a flag for deletes and the list of conflicting items, so it can combine the two prices into a rule, such as taking the lower.

When no procedure exists or it fails, the conflict goes to a conflicts feed to be resolved by hand. EDB's product offers row level resolution by default, picking the local or remote row, and a column level mode.

For the price edit, a merge rule could take the lower price, or keep both edits as a history. The rule should be written before the first conflict, and its behavior tested.

## Types That Merge Themselves

Some data can be designed so that any order of updates converges, with no conflict. Redis Enterprise's Active-Active databases are built on CRDTs, data types of this kind, with vector clocks, and need no application code to resolve. [CRDTs](/system-design/crdts) are a topic of their own later in this phase.

Collaborative editors use two other ideas. Operational transformation, invented by Ellis and Gibbs in 1989 and used in Google Docs, adjusts each incoming operation against concurrent ones so that positions still make sense, and has a reputation for being hard to get right.

Figma chose a simpler path: a central server defines the order, and for each property of each object, the latest value the server receives wins. Two edits to different properties of one object don't conflict, and two edits to one property keep one of them.

## Detecting and Refusing

A system can instead stop the second writer. MySQL Group Replication in multi-primary mode lets each member accept writes, and its documentation lists strict checks for this mode. A transaction at the serializable level fails, and so does one that touches tables with cascading foreign keys.

It also lists what it can't detect: gap locks, table locks, and concurrent DDL and DML on one object. The documentation recommends the read committed level, and limits a group to 9 members.

DynamoDB's strongly consistent mode for global tables takes the other route. Writes go to at least one other region before they are acknowledged, so a loss of the region doesn't lose data, and a concurrent write to the same item in another region fails with a conflict exception that the client retries.

It requires exactly three regions, and some features don't work with it.

Plain PostgreSQL logical replication is not a multi-leader tool, and its documentation shows the default for a conflict: replication stops until someone fixes it.

## Other Traps

Multiple leaders also complicate things that a single leader gives for free:

- **Unique keys and counters**: Two leaders handing out the next number would collide, which is the problem in [Unique ID Generation](/system-design/unique-ids)
- **Transactions**: DynamoDB says a transaction in the default mode is atomic in the region where it runs, and other regions can see partial results
- **Reads of your own writes**: Strongly consistent reads return the latest version when the item was last written in the same region
- **Replication cost**: Replicated writes use write capacity in each region

## Choosing

| Situation | Choice |
| --- | --- |
| Users are in one region, with a standby elsewhere | Single leader, with failover |
| Writes must be local in each region, and records have a home | Multiple leaders, routing writes to the home |
| Writes to a record can happen anywhere | Multiple leaders, with merge rules or CRDTs |
| Money moves, or conflicts are unacceptable | Single leader, or a synchronous multi region mode |

For the textbook app, listings are written by their sellers in one region, so a home region for each seller avoids most conflicts. The seller's rating, updated by buyers anywhere, can be merged with a counter type.

Detecting and resolving conflicts in general is the subject of [Detecting and Resolving Conflicts](/system-design/conflicts), and leaderless designs, which skip the leader altogether, come in [Leaderless Replication and Quorums](/system-design/leaderless-replication).

## Key Points

- Multiple leaders give local writes and survive a region's loss, and in return two leaders can accept conflicting changes for the same record
- In our simulation 2.33 percent of writes conflicted at 1 second of replication delay, and 10.19 percent at 5 seconds, with most conflicts on a few popular records
- <u>The best conflict handling is avoiding conflicts</u>, by giving each record a home region that takes its writes
- Last write wins is simple and discards one edit silently, and depends on clocks
- Merge by custom code, as CouchDB and Cosmos DB allow, use types that converge, such as CRDTs, or refuse the second write, and choose the rule before the first conflict
