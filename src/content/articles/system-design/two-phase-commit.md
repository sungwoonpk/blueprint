> **Two-phase commit**, or 2PC, is a protocol that makes a transaction spanning several nodes commit on each of them or on no node. A coordinator first asks each participant whether it can commit, and tells them to commit if each said yes.

After [Sharding Strategies](/system-design/sharding), a purchase in the textbook app can touch two shards: the listing is on one, marked sold, and the buyer's wallet is on another, charged. A single database makes this safe with a transaction, as in [Transactions and ACID](/system-design/transactions-acid).

Two databases have two logs, and each can commit or fail on its own. If the listing is sold and the wallet charge fails, a buyer has a book that no one paid for.

Two-phase commit is the classic answer. It makes the two databases agree, and, as this topic shows, it makes them wait for each other, which is why newer designs try to avoid it.

## The Protocol

One node is the **coordinator**, and the others are **participants**, also called cohorts. The protocol runs in two phases:

- **Phase 1, voting**: The coordinator sends a query to commit and waits for each reply. Each participant does the work up to the point of committing, writes undo and redo records to its log on stable storage, and votes yes, or votes no if it can't commit
- **Phase 2, decision**: If each vote is yes, the coordinator sends commit, and each participant commits, releases its locks and acknowledges. If any vote is no, or a vote times out, the coordinator sends rollback, and each participant undoes its work

<figure class="diagram">
<p class="rowname">Phase 1: Vote</p>
<div class="flow">
<div class="node">Coordinator</div>
<div class="arrow" data-label="prepare?" aria-hidden="true"></div>
<div class="stack">
<div class="node">Listings Shard</div>
<div class="node">Wallet Shard</div>
</div>
<div class="arrow" data-label="yes or no" aria-hidden="true"></div>
<div class="node hot">Votes Collected</div>
</div>
<p class="rowname">Phase 2: Decide</p>
<div class="flow">
<div class="node hot">Coordinator Logs Decision</div>
<div class="arrow wide" data-label="commit or abort" aria-hidden="true"></div>
<div class="stack">
<div class="node">Listings Shard</div>
<div class="node">Wallet Shard</div>
</div>
</div>
<figcaption>The decision is made once, by the coordinator, after each participant has promised it can commit</figcaption>
</figure>

The key rule is in the vote. A participant that votes yes has promised to commit if told to, which means it must keep its changes and its locks safely until it hears the decision, even through a crash. That promise is written to disk before the vote is sent.

PostgreSQL exposes the participant side directly. After `PREPARE TRANSACTION`, the state is stored on disk, so the transaction can almost certainly be committed even after a crash, and the commit can come from any session:

```sql
-- on the listings shard
BEGIN;
UPDATE listings SET status = 'sold' WHERE id = 17 AND status = 'open';
PREPARE TRANSACTION 'order-8812-listing';

-- on the wallet shard
BEGIN;
UPDATE wallets SET cents = cents - 4500 WHERE buyer_id = 8 AND cents >= 4500;
PREPARE TRANSACTION 'order-8812-wallet';

-- the coordinator has both yes votes, logs the decision, then:
COMMIT PREPARED 'order-8812-listing';   -- on the listings shard
COMMIT PREPARED 'order-8812-wallet';    -- on the wallet shard
```

MySQL's XA support follows the X/Open standard with the same shape: the server is the resource manager, the client is the transaction manager, and XA START, XA END, XA PREPARE and XA COMMIT drive each branch.

XA RECOVER lists the prepared branches after a crash. A transaction with a single branch can skip the voting and commit in one phase.

## The Price: Prepared Means Locked

A prepared transaction is neither committed nor rolled back, and it holds its locks. Leaving one prepared for long interferes with vacuum in PostgreSQL and, in extreme cases, can force a shutdown to prevent transaction ID wraparound.

It says the feature is meant for external transaction managers and not for applications, and that if no manager tracks prepared transactions, `max_prepared_transactions` should stay at its default of 0. A prepared transaction that is forgotten holds its locks until someone finds it in `pg_prepared_xacts`.

The time a participant stays locked depends on the network. We calculated it, assuming 1 ms to force a log write:

| Setting | Locks Held | Hot Row Ceiling | In Flight at 200 a Second |
| --- | --- | --- | --- |
| One Data Center, 1 ms Round Trip | 3.5 ms | 286 a second | 0.7 |
| Two Regions, 70 ms Round Trip | 107.0 ms | 9 a second | 21.4 |

The client waits about 3.0 ms for the commit in the first setting and 72.0 ms in the second.

A row that each purchase touches, such as the stock of a popular book, can be updated by one prepared transaction at a time.

With 107 ms of lock time across regions, the row's ceiling falls from 286 to 9 transactions a second. The last column is the number of transactions that are in the prepared state at any moment, which matters for the next problem.

## Blocking: When the Coordinator Dies

The weakness of the protocol shows when the coordinator fails after the votes. A participant that voted yes can't commit on its own, since another participant may have voted no. It can't roll back either, since the coordinator may already have decided to commit.

It must wait. That is the main disadvantage: it is a blocking protocol, and a participant that voted yes waits until it hears the decision, with its locks held.

The recovery is for the coordinator to come back, read its log and finish the decision. If the coordinator is gone for good, an operator has to resolve each prepared transaction by hand.

In our table, 21 transactions would be stuck at 200 a second across two regions when the coordinator crashed, and less than one in a single data center.

Narayana, a Java transaction manager, runs a recovery manager in periodic passes, which finds in doubt transactions and retries them, with defaults of a 120 second period and a 10 second backoff. Rows can stay locked by in doubt transactions until recovery completes.

Several fixes exist:

- **Paxos Commit**: Jim Gray and Leslie Lamport's design gives each participant's vote its own consensus instance, so a failed coordinator can be replaced. Two phase commit turns out to be Paxos Commit that tolerates no faults
- **Three-phase commit**: It adds a stage so that participants can decide if the coordinator fails, but it assumes bounded network delays and needs extra round trips, so it is rarely used
- **Replicated participants and coordinator**: This is the approach of real databases, described next

## How Databases Make It Practical

Google Spanner uses two phase commit when a transaction spans more than one split, its unit of data. A transaction inside one split commits through that split's Paxos group, which typically takes a handful of milliseconds. A transaction across splits has a participant leader act as coordinator.

In phase 1, each participant takes locks and records its prepared state in its own Paxos log. If each succeeds, the coordinator logs the commit decision in its Paxos group, and that log write is the commit point. Phase 2 tells the participants, which replicate the decision.

Because each participant and the coordinator are replicated groups, a single machine failure doesn't strand the transaction. Writes across splits take a few more milliseconds.

CockroachDB cut the cost further with parallel commits. Writing the changes is the prepare, and marking the transaction record committed is the commit, which classically costs two rounds of consensus. With parallel commits, the record is written as staging together with the list of writes in flight, in parallel with them.

The transaction counts as committed once each listed write has succeeded, which any observer can check, so the commit takes one round of consensus, which halves the latency of transactions across ranges. If the coordinator dies, a later observer checks the listed writes and either commits or aborts the transaction.

The pattern shows up in messaging as well. Kafka's transactions use a coordinator with a replicated transaction log, which defaults to 50 partitions and 3 replicas. The producer's coordinator writes a prepare record, then appends commit or abort markers to the partitions it wrote to, and then marks the transaction complete.

A stable `transactional.id` with an epoch fences out a zombie producer, and a transaction that shows no progress is aborted after a timeout that defaults to 60 seconds.

Flink's two phase commit sink prepares when a checkpoint barrier arrives, and commits once the checkpoint is confirmed complete. Its commit must succeed eventually, and so must be idempotent, since a restart repeats it.

## When Not to Use It

Two phase commit works inside one organization's databases with a reliable coordinator. It fits badly across services and companies, because each participant must support it, and a slow participant makes the others wait with locks held.

ACID doesn't carry across independently managed data stores, and two phase commit suits that setting less well.

The alternative is to give up atomic commit and accept eventual consistency with compensation, which is the subject of [Sagas](/system-design/sagas).

| Situation | Use |
| --- | --- |
| Two shards in one database system, with a rare cross shard write | Two phase commit, built into the database |
| A hot row touched by many transactions | Avoid the cross shard write, or keep the data together |
| Steps across services owned by different teams | A saga with compensating steps |
| A write to a database and a message | An outbox, as in [The Transactional Outbox](/system-design/transactional-outbox) |

For the textbook app, keeping a buyer's wallet on the same shard as the buyer's orders turns most purchases into single shard transactions, and a cross shard purchase can use the database's own two phase commit, or a saga.

## Key Points

- Two phase commit has participants vote yes after logging their work, and the coordinator then tells the participants to commit if each voted yes
- A yes vote is a promise, so a prepared transaction holds its locks: across two regions, the ceiling for one hot row fell from 286 to 9 transactions a second in our calculation
- <u>If the coordinator fails after the votes, participants block</u>, which Paxos Commit fixes with replication and three phase commit with more rounds
- Databases make it practical by replicating the coordinator and participants, as Spanner does, and by cutting the rounds, as with CockroachDB's parallel commits
- Across independent services, prefer sagas, and keep data that changes together on one shard
