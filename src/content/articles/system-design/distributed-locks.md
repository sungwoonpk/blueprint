> A **distributed lock** lets one process at a time use a shared resource when the processes run on different machines. It is usually a **lease**, a lock that expires, so a crashed holder doesn't keep it forever. A **fencing token** is a number that grows with each grant, which the resource checks so that an old holder can't do damage.

The textbook app has jobs that must not run twice at once: the nightly price job, and the update of a listing's stock when two servers handle the same purchase. A lock looks like the simple answer: take it, do the work, release it.

[Consensus and Leader Election](/system-design/consensus-leader-election) ended on the trouble with that picture, and Jepsen's test of etcd locks showed it: about 18 percent of acknowledged updates were lost in one run, because holders paused and their leases ran out.

This topic explains why a lock with an expiry can't, alone, keep two processes apart, and what a fencing token adds.

## Why Lock at All

Martin Kleppmann, in his widely cited 2016 essay, separates two reasons, and the choice of tool follows from them:

| Reason | If the Lock Fails | Tool That Suffices |
| --- | --- | --- |
| Efficiency | Work is done twice: extra cost, a duplicate email | A simple lock, such as one Redis node |
| Correctness | Data is corrupted or lost | A lock from a consensus system plus fencing tokens |

For the nightly job, a rare double run wastes some compute, which is an efficiency lock. For the stock of a listing, a double write loses a sale, which is a correctness problem.

## How Locks Are Built

Several mechanisms are in use, each with a lease or a session that bounds the holder's time.

In Redis the recipe is `SET resource_name my_random_value NX PX 30000`, which sets the key when it doesn't exist and lets it expire after 30,000 ms. The value must be unique to the client, and release must check the value before deleting, with a script or a newer check and delete command, since a plain `DEL` can remove another client's lock.

In ZooKeeper, each client creates an ephemeral sequential node, and the lowest number holds the lock. Each waiter watches the node ahead of it alone, so a release wakes one client, and the node disappears when the client's session ends.

In etcd, a lock is a key attached to a lease. When the lease expires or is revoked, the lock is released, and the Go client's session defaults to a 60 second TTL.

In DynamoDB, a conditional write does the job. AWS's lock client stores the owner, a lease duration and a random record version, and the owner heartbeats by changing the version. In AWS's example the lease is 10 seconds and the heartbeat 3 seconds, and a waiter treats the lock as expired if the version doesn't change for a full lease. The lock is advisory.

Each is a lease, and each has the same gap.

## The Gap: A Pause After the Check

Kleppmann's scenario: Client 1 acquires the lock with a 30 second lease and starts to write. Then it pauses, from a garbage collection, a page fault or a stalled process.

The lease expires. Client 2 acquires the lock and writes. Client 1 wakes, doesn't know that time has passed, and writes its old result over the new one.

Checking the lease just before the write doesn't fix it, since a pause can land between the check and the write. His examples of long delays include a GitHub incident with about 90 seconds of packet delay and an HBase bug.

<figure class="diagram">
<p class="rowname">Client 1</p>
<div class="flow">
<div class="node">Gets Lock<small>token 33</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Pauses</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node wait">Writes With 33</div>
</div>
<p class="rowname">Client 2</p>
<div class="flow">
<div class="node">Lease Expired</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Gets Lock<small>token 34</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Writes With 34</div>
</div>
<figcaption>Client 1's late write carries token 33 and the storage has seen 34</figcaption>
</figure>

The lease length is a guess about how long a holder can pause. We simulated 100,000 critical sections in which 0.2 percent include a pause that averages 8 seconds, with a contender waiting for the lock each time. The last column shows the result when the storage checks tokens:

| Lease | Lost Updates Without Fencing | Lost Updates With Fencing | Stale Writes Rejected |
| --- | --- | --- | --- |
| 1 second | 177 | 0 | 177 |
| 3 seconds | 136 | 0 | 136 |
| 10 seconds | 56 | 0 | 56 |
| 30 seconds | 10 | 0 | 10 |

A longer lease loses fewer updates and doesn't reach zero, and it also delays recovery when a holder really does crash. Fencing turned each lost update into a rejected write.

## Fencing Tokens

The lock service hands out a number that grows with each grant. The client sends the token with each write to the protected resource, and the resource remembers the highest token it has seen and refuses lower ones. In the example above, client 2 writes with 34, and client 1's late write with 33 is rejected.

A database can do the check in the write itself:

```sql
UPDATE listings
SET stock = 0, last_token = 34
WHERE id = 17 AND last_token < 34;
-- 0 rows updated: a newer holder has already written, so reject this one
```

Where does the number come from? ZooKeeper's transaction id or a node's version can serve. In etcd the revision of the lock key works, and the lock key can be used in a transaction so that updates happen while the lock is held.

The number has to grow: DynamoDB's lock client uses a random record version, which can't be a fencing token, since it doesn't grow.

The check lives in the resource, and that is the catch. A storage system that can't compare tokens, such as a call to an email provider, can't be protected this way, and needs idempotent operations instead, as in [Idempotency and Safe Retries](/system-design/idempotency).

## The Redlock Argument

Redis's Redlock algorithm tries to get a safe lock from independent Redis nodes.

A client takes the time, tries to set the key on 5 independent masters, counts the lock as held if 3 or more agreed and the elapsed time is under the lease, and computes its remaining validity as the lease minus the elapsed time minus a drift allowance.

Kleppmann's critique is that Redlock is neither fish nor fowl: too heavy for an efficiency lock, and not safe enough for a correctness lock. It produces no fencing token, since its random value doesn't grow.

It also assumes bounded network delay, bounded pauses and bounded clock error, and Redis measures expiry with a clock that can jump, which can let two clients both hold the lock. His advice for correctness is a consensus system such as ZooKeeper, with fencing.

Salvatore Sanfilippo, Redis's author, replied that a lock which has already been broken has failed anyway, and that Redlock tolerates delay before it counts the lock acquired by checking elapsed time. He accepted the point about monotonic clocks, and conceded that a delay after acquisition is a problem for any lease.

Redis's maintainers now tell implementers to add fencing tokens, and note that Redis expiry doesn't use a monotonic clock. The disagreement is about assumptions about time, and the safe reading is to treat the lock as an efficiency tool unless the resource checks tokens.

## Often You Don't Need a Lock

Many uses of locks are better served by other tools:

| Goal | Better Than a Lock |
| --- | --- |
| Update a row once | A conditional write, or a version column, in the database |
| Only one worker runs a job | A queue with one consumer, or a unique key for each run, as in [Job Schedulers](/system-design/job-schedulers) |
| One owner for a shard | A lease from a Raft backed store, with the epoch as a fencing token |
| Avoid duplicate side effects | Idempotency keys, as in [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees) |

The conditional write from [Transactions and ACID](/system-design/transactions-acid) is the simplest fencing there is: `WHERE version = 7` fails if anyone else has written since.

## Choosing

| Situation | Choice |
| --- | --- |
| A rare double run is harmless | A simple lease, in Redis or the database, with a safe release |
| Double work corrupts data | A lock from etcd or ZooKeeper, with fencing tokens checked by the storage |
| The resource can't check tokens | Make the operation idempotent, or move the work behind a service that can |
| The lock protects a single database row | The database's own row lock or conditional update |

For the textbook app, the nightly job takes a lease in etcd for efficiency, and the stock update uses a conditional write with the lock's revision, so a paused server can't undo a newer sale.

## Key Points

- A distributed lock is usually a lease, and its purpose is either efficiency, where a failure repeats work, or correctness, where a failure corrupts data
- A pause after the lock check lets an old holder write after its lease has expired, and checking the expiry first doesn't prevent it
- <u>A fencing token that the resource checks</u> turned each lost update into a rejected write in our simulation: 56 lost with a 10 second lease, and 0 with fencing
- A longer lease loses fewer updates and recovers slower, and doesn't reach zero
- Redlock's safety depends on timing assumptions, so use consensus based locks with tokens for correctness, and prefer conditional writes and idempotency when they are enough
