> A **CRDT**, a conflict-free replicated data type, is a data structure built so that replicas can be changed independently and merged automatically, in any order, with the same result. Its merge is commutative, associative and idempotent, so replicas that have seen the same updates agree.

[Detecting and Resolving Conflicts](/system-design/conflicts) left the textbook app with a choice for each field: pick a winner, keep both, or write merge code. Merge code is easy to get wrong, and a last write wins rule loses data.

A CRDT takes a third path. It chooses the data type so that concurrent edits can't conflict, and puts the merge rule inside the type.

The idea was formalized in 2011 by Marc Shapiro, Nuno Preguiça, Carlos Baquero and Marek Zawirski. It suits the cases where replicas must accept writes while disconnected: phones, offline editing, several regions. The price is that a type must be designed to merge, and some rules can't be expressed that way.

## The Merge Laws

A merge function is the heart of a CRDT, and three laws make it safe:

- **Commutative**: Merging A with B gives the same result as merging B with A
- **Associative**: Merging in any grouping gives the same result
- **Idempotent**: Merging the same state twice changes no value, so duplicates are harmless

With these laws, replicas can exchange updates in any order, with duplicates and delays, and still converge. There are two ways to build it:

| Style | What Replicas Send | Requirements | Cost |
| --- | --- | --- | --- |
| State Based | The full state, merged with a join | A merge with the three laws, and updates that move in one direction | Large messages, and simple gossip is enough |
| Operation Based | Each operation, applied at the others | Operations that commute, and delivery that happens once and in causal order | Small messages, and stronger delivery guarantees |

Either style can build the same data types. A variant, the delta state CRDT, sends just the recent change. Both give strong eventual consistency: replicas that have received the same updates are in the same state, without any further coordination.

We tested the merge laws on an observed-remove set, described below. Three replicas took 60 random adds and removes with partial merges, and then merged in a random order. In 2,000 of 2,000 runs, the replicas agreed.

## Counters

A plain counter fails in replication. If two replicas each add 1 to a total of 5, a merge that keeps the newer total gives 6, and the other increment is lost.

A **G-Counter**, a counter with increments alone, gives each replica its own slot and lets that replica alone change it. The value is the sum of the slots and the merge takes the larger value for each slot.

If replica A holds [2, 0, 0] and replica B holds [1, 3, 0], the merge is [2, 3, 0], with a value of 5, whichever way it is done.

A **PN-Counter** uses two G-Counters, one for increments and one for decrements, and the value is their difference. The state keeps growing, even when the visible value goes down.

How much does it matter? We ran 30,000 increments spread over 3 replicas, with a merge between two of them at about 1 step in 20. The G-Counter ended at exactly 30,000. The rule that keeps the newer total ended at 12,079, losing 59.7 percent of the increments.

The loss depends on how often replicas merge, and it is large whenever updates are concurrent. Riak's counters are PN-Counters: the increments and decrements from each actor are applied.

## Sets

Sets are harder, because removing needs a rule for adds that race with removes:

| Type | How a Remove Works | Weakness |
| --- | --- | --- |
| G-Set | No removes, a union alone | No element can leave |
| 2P-Set | A second set of removed items, kept forever | An element removed once can't come back |
| LWW-Element-Set | Each add and remove has a timestamp, the later one wins | Needs good clocks, and ties need a bias |
| OR-Set | Each add has a unique tag, and a remove deletes the tags it has seen | Tombstones can pile up |

The **OR-Set**, observed-remove set, handles the saved list well. Each add creates a unique tag. A remove deletes the tags that the remover has observed. A concurrent add on another replica has a tag the remove did not see, so it survives: add wins. An add after a remove makes a new tag and is present again.

We tested an add after a remove. Replica A removes an item, and replica B, which has seen the remove, adds it back 50 ms later. We allowed B's clock to be off by up to 100 ms either way:

| Type | Result Wrong |
| --- | --- |
| 2P-Set | 100% |
| LWW-Element-Set | 25.0% |
| OR-Set | 0% |

The 2P-Set can't bring the item back, and the LWW set loses it whenever B's clock is behind A's. The OR-Set compares tags, not clocks.

The cost is metadata. An element added and removed 1,000 times, with no cleanup, left 1,000 tags and 1,000 tombstones in our run, and the set was empty. Implementations compact this with version vectors, and a store must plan for it.

Riak's data types show the choices in a product. Its sets give a concurrent add priority over a remove, flags let enable win over disable, registers keep the most recent value by timestamp, and maps let an add or update win over a remove.

Removes need the causal context from an earlier read, since without it a remove can fail or remove more than intended.

## Text and Documents

Editing text needs a sequence CRDT, in which each character has an identity that stays valid as others insert around it. Treedoc, RGA, WOOT, Logoot and LSEQ are published designs. Many published algorithms have anomalies, such as interleaved text from concurrent inserts, and naive implementations perform badly.

Two libraries are widely used. Yjs offers shared types, Y.Array, Y.Map, Y.Text and XML types, and is network agnostic, with providers for WebSocket, WebRTC and local storage. It merges adjacent items, drops the content of deleted ones, and garbage collects tombstones when their order no longer matters.

Automerge is a Rust core with bindings, a compact binary format and a sync protocol, and its version 3 cut memory use by about 10 times.

Kleppmann and Beresford's JSON CRDT extends the idea to nested maps and lists, with the aim that concurrent edits merge with no lost updates, and the replicas converge.

## Where They Are Used

The uses range from shopping carts and counters to collaborative editing and chat presence, and Riak ships counters, sets and maps as built in data types for this reason.

SoundCloud's Roshi is an LWW element set on Redis, and Redis Enterprise's Active-Active databases are built on CRDTs and offer strong eventual consistency. Apple Notes uses one for offline sync. Figma, though often named, doesn't use CRDTs in the pure sense: its server decides the order, with a last writer wins rule for each property.

## What They Can't Do

CRDTs guarantee convergence, which is not the same as keeping each rule of the application:

| Need | CRDT? | Why |
| --- | --- | --- |
| Count views | Yes | A counter merges by adding |
| A saved list with removes | Yes | An OR-Set keeps the intent |
| Sell the last copy once | No | The rule needs coordination, as in [The CAP Theorem](/system-design/cap) |
| A unique username | No | Two replicas can each accept the same name |
| A value that may not go below zero | No | Two decrements can both look safe |

Two replicas that each sell the last copy of a book converge on a count of minus one. A CRDT can't prevent it, since preventing it needs the replicas to agree before selling, which is the coordination CRDTs avoid.

Other limits are the metadata that grows, as the 1,000 tombstones showed, and merges that are correct but surprising, such as a deleted item reappearing when another replica's edit wins.

## Choosing

| Feature in the Textbook App | Data Type |
| --- | --- |
| View Count of a Listing | G-Counter |
| Seller's Rating Sum and Count | Two counters |
| Student's Saved List | OR-Set |
| Seller's Profile Name | Register, latest wins |
| Draft Listing Description Edited Together | A text CRDT such as Yjs or Automerge |
| Stock of a Listing | Not a CRDT, a single owner or a conditional write |

Repairing replicas that have drifted uses related ideas, with hints and trees to find differences, and is covered in [Repairing Replicas with Hinted Handoff and Merkle Trees](/system-design/repairing-replicas).

## Key Points

- A CRDT merges replicas with a function that is commutative, associative and idempotent, so replicas that saw the same updates agree, whatever the order
- State based CRDTs send full state and operation based ones send operations, which need causal delivery, once for each operation
- <u>Counters and sets show the design</u>: a G-Counter kept the full 30,000 increments, where keeping the newer total lost 59.7 percent, and an OR-Set brought items back correctly where a 2P-Set failed each time
- Metadata grows, since 1,000 add and remove cycles left 1,000 tombstones, so plan compaction
- CRDTs can't enforce rules that need agreement, such as a stock that can't go below zero or a unique name
