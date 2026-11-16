> A **conflict** is a pair of writes to the same data made by nodes or users that didn't know about each other, so neither happened before the other. **Detecting** a conflict means telling concurrent writes from ordered ones. **Resolving** it means choosing a result: pick one write, keep both, merge them, or ask a person.

The textbook app lets a student keep a saved list of listings, on a phone and on a laptop. On the train, with no signal, the phone removes one book and adds another.

At the same moment, the laptop edits a note on a third. When both come online, the system holds two versions of the list, each built from the same starting point.

[Replication with Multiple Leaders](/system-design/replication-many-leaders) and [Leaderless Replication and Quorums](/system-design/leaderless-replication) both named this problem and pointed ahead to it. Here are the tools.

## Detecting: Concurrent or Not?

Two writes are ordered when one was made by someone who had seen the other, and concurrent when neither had seen the other. That is the happened-before relation from [Physical and Logical Clocks](/system-design/clocks), and version vectors are how stores track it.

If one vector is at least as large as the other everywhere, the newer write replaces the older. If neither dominates, the writes are concurrent and conflict.

Riak shows the machinery. Each object carries a **causal context**, which is a vector clock or, since Riak 2.0, a dotted version vector that attaches a dot, the event that created the value, to each value. A client reads an object with its context and returns the context when it writes.

Riak creates **siblings**, several values for one key, when it can't tell which is the most recent. It names three triggers: concurrent writes, a stale causal context and a missing causal context, as when a client writes without sending the context back.

Couchbase uses a different record. Each document has a revision counter that grows with each update. For timestamp based resolution it keeps a 64 bit value whose top 48 bits are physical time in nanoseconds and bottom 16 bits a logical counter, a hybrid logical clock.

CouchDB keeps a tree of revisions, so conflicting updates become branches, and the leaves are the conflicting versions.

## Choosing a Resolution

Each strategy gives something up:

| Strategy | What Happens | Gives Up |
| --- | --- | --- |
| Last Write Wins | The write with the latest timestamp survives | The other write, without notice |
| Keep Both | Store the versions and let the reader decide | Simplicity for the reader |
| Merge by Rule | Combine the versions with application logic | Exactness, for some edits |
| Three Way Merge | Compare each side to the common ancestor | Automation, when both sides change one part |
| Convergent Types | Use data types whose merge is built in | Freedom to model data |
| Avoid | Make conflicting commits impossible | Availability, or latency |

Examples are Cassandra and DynamoDB global tables for the first, Riak siblings, CouchDB and Dropbox for the second, Dynamo's shopping cart for the third, Git for the fourth and Riak Data Types for the fifth.

We tested three of them on the saved list. In 100,000 pairs of concurrent edits, each side made 1 to 3 changes to a list of 10 items: adding a new item, removing one, or editing a note. The pairs had 4.00 changes on average:

| Strategy | Result |
| --- | --- |
| Last Write Wins | 2.00 of the 4.00 changes discarded for each pair, 50 percent |
| Union of the Items | A deleted item came back in 76.3 percent of pairs |
| Three Way Merge | 82.6 percent merged cleanly, and 17.4 percent had a real conflict to resolve |

Last write wins loses half the work, by design. A union keeps the additions and brings back removals, since an item that is missing on one side is still present on the other. A three way merge lost no change and asked for help when both sides touched the same item.

## Last Write Wins

Last write wins is the easiest rule, and its cost is silent loss. Couchbase documents two policies: sequence numbers, where the higher count wins, and timestamps, where the later one wins. Its examples fit the rule: a hit counter suits the higher count, and a thermometer that keeps overwriting one key suits the latest timestamp.

Riak's documentation gives the same guidance: last write wins suits data that is immutable or inserted once, caches and sessions, and resolving by plain timestamps is risky for data loss.

Timestamps need clocks, so Couchbase says synchronized clocks are required, typically with NTP, and the hybrid clock reduces the effect of drift and doesn't remove it. Before failing over, it advises waiting for the longer of the replication latency and the clock skew between sites.

## Keeping Both

When both versions matter, keep them. Riak returns the siblings to the client, which merges them and writes back with the context. Its documentation recommends that order of preference: use a built in Data Type where possible, and otherwise resolve siblings in the application.

Siblings have a risk. Unresolved ones build up, which slows reads, can run a node out of memory and, in extreme cases, a huge object can crash a node on read.

Riak advises doing a read, modify and write each time with the causal context, and dotted version vectors keep the sibling count proportional to the number of concurrent updates and not unbounded. With plain vector clocks, its documentation notes that five concurrent clients writing one key can produce duplicate siblings.

Dropbox shows the human version. When two people change a file and sync conflicts, it keeps both: the version saved last appears as a conflicted copy named with the editor, the words conflicted copy and the date.

It does no merging, and its advice is to compare the versions by hand, or to avoid the conflict with real time collaboration tools.

## Merging by Rule

Amazon's Dynamo paper describes two kinds of reconciliation. In syntactic reconciliation, a new version subsumes the old and the system chooses. When versions are concurrent, the store returns the leaves with their context, and the client performs semantic reconciliation, collapsing the branches into one.

Its example is the shopping cart, where the collapse is a merge of the carts. The paper states the consequence: an add to cart is not lost, and deleted items can resurface.

That is the second row of our test, and it shows the lesson. A merge rule must say what to do with deletions, which a plain union forgets.

Tombstones, markers for deleted items, and a rule that a delete beats an update, as in Cosmos DB's default policy, are the usual answers, and each has its own surprises.

## Merging With a Base

Git's three way merge is the most precise tool of its kind. It compares each side to the common ancestor, the merge base. A change on one side, or the same change on both, applies cleanly.

Edits to the same region on both sides are a conflict, and Git marks it in the file, offering the base text as well when configured for it, and waits for a person.

This is why the third row of our test lost no change: with a base, "removed on one side, untouched on the other" is a removal and not a difference. The price is that the store has to keep the base, which is the causal context or revision history again.

## Avoiding Conflicts

The cheapest conflict is one that can't be committed. Firestore's transactions are optimistic: if a document that the transaction read has been changed, the function runs again, which means it may run more than once, and the transaction fails when the client is offline.

Batched writes with no reads work offline and aren't retried. A conditional write, as in [Distributed Locks and Fencing Tokens](/system-design/distributed-locks), is the same idea in a single statement, and a home region for each record, from the multi leader topic, avoids most conflicts by routing.

## Writing the Rules Down

The right resolution depends on the field, so write a rule for each:

| Field | Rule | Why |
| --- | --- | --- |
| Listing Status | Sold wins over open | A sale can't be undone by an old edit |
| Price | The later edit, or the lower price | A person chose it, and a surprise costs a sale |
| Seller's Notes | Keep both, flagged for the seller | Text edits can't be merged safely |
| Saved List | Three way merge with removals kept | The user's intent is the change, not the whole list |
| View Counter | Add the counts | A counter's changes combine |

Last, test the rules with concurrent edits and with deletes, since the conflict that surprises people is the one that no test tried.

The last row is better handled by a data type that merges by design, the subject of [CRDTs](/system-design/crdts).

## Key Points

- A conflict is a pair of concurrent writes, found with version vectors, revision counters or timestamps, and a store that can't tell them apart creates siblings or loses a write
- Strategies range from last write wins, which discarded half of the changes in our test, to keeping both versions, merging by rule, three way merges and avoiding conflicts
- <u>Merge rules must handle deletes</u>: a union brought deleted items back in 76.3 percent of our pairs, and Dynamo's cart has the same behavior
- Three way merges with a common ancestor lose no change, and ask for help in the 17.4 percent of pairs where both sides touch the same item
- Choose a rule for each field, keep the causal context with each write, and test with concurrent edits
