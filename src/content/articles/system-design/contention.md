> **Contention** is many requests competing for a resource that can serve a few of them at a time: the last copy of a book, a seat in a course, the balance of an account, a time slot. The goal is correctness, so that three copies are sold three times and not four, and also throughput, since the competitors queue on one row.

Registration week opens, and a popular textbook has 100 copies for sale across the market. Six hundred students click buy within a minute.

A buyer's request does what the code reads like it should: look at the stock, and if it is above zero, subtract one and record a sale. Each step is right, and the sequence is wrong, because two requests can both read a stock of 1 before either writes.

We ran it. A SQLite database holds one book with a stock of 100, and 16 threads run 600 purchases of the read then write kind. The result is the reason this topic exists:

| Method | Copies Sold | Stock Left | Retries | Seconds |
| --- | --- | --- | --- | --- |
| Read, Then Write, No Protection | 600 | 81 | 0 | 0.19 |
| One Atomic Conditional Update | 100 | 0 | 0 | 0.08 |
| Optimistic Version Check With Retry | 100 | 0 | 283 | 0.07 |
| Lock the Row, Then Read and Write | 100 | 0 | 0 | 0.40 |

The unprotected code sold 600 copies of a book that had 100 and left a stock of 81, since most of the writes overwrote each other with stale values. That is the **lost update**. The next sections cover the other three rows and when each fits.

## What the Database Promises

Isolation levels set what a transaction sees while others run. The PostgreSQL documentation describes what each level does with a concurrent change:

| Level | What Happens on a Concurrent Change |
| --- | --- |
| Read Committed, the Default | The statement waits for the other writer, then evaluates its condition again on the new row version |
| Repeatable Read | The second writer fails with an error and has to retry the whole transaction |
| Serializable | The same, with extra checks for anomalies across rows |

At Read Committed, a single `UPDATE ... WHERE stock > 0` is safe, because after waiting it checks the condition against the new value. A separate read and write is not, since the read happened before the wait.

At the stricter levels, the documentation says applications must be prepared to retry transactions because of serialization failures: a conflicting writer gets `could not serialize access due to concurrent update`, and a serializable transaction can fail with SQLSTATE 40001. The retry has to repeat the whole transaction, not just the failed statement.

The documentation also says that under Serializable, unique constraint violations can appear where a serial run wouldn't produce them, unless the inserters check for the key first, and it advises short transactions.

## Tool One: Make the Check Part of the Write

The cheapest fix moves the condition into the statement:

```sql
UPDATE book SET stock = stock - 1 WHERE id = 1 AND stock > 0;
-- one row changed: the buyer got a copy; zero rows changed: sold out
```

The database applies the condition and the change as one step on the current value, so there is no gap to race through. The application reads the number of rows changed to learn the outcome. In our test it sold exactly 100 copies with no retries, and it was the fastest of the correct methods.

DynamoDB has the same idea in its conditional writes: a condition expression such as `attribute_not_exists(Id)` makes a put succeed when no item with that key exists, and a conditional update can include a comparison on the current price or count. The failed condition is reported to the caller.

The method works when the rule is a condition on one row that the database can evaluate. It stops working when the rule spans rows, such as a student can hold at most 5 books, or when other systems are involved.

## Tool Two: Optimistic Concurrency

Optimistic concurrency assumes that conflicts are rare. Each row has a version. A client reads the row and its version, does its work, and writes if the version is still what it read, adding one at the same time. A failed write means someone else got there first, and the client reads again and tries again.

In our test, 283 retries were needed for 600 requests, and the total time was as short as the atomic update.

<figure class="diagram">
<div class="flow">
<div class="node">Read Version</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Do Work</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Write If Same</div>
<div class="arrow" data-label="else" aria-hidden="true"></div>
<div class="node wait">Retry</div>
</div>
<figcaption>Optimistic concurrency: work without a lock, and write just when the version is unchanged</figcaption>
</figure>

The cost of a conflict is the wasted work of one attempt, so the method suits low contention and long operations where holding a lock would hurt, and it degrades under heavy contention, when most attempts fail.

The same pattern appears in the interfaces of other systems:

- **HTTP**: A client sends the entity tag it last saw in `If-Match`, and the server answers 412 Precondition Failed if the resource has changed. RFC 9110 names the purpose as preventing the lost update problem
- **DynamoDB's mapper**: A version attribute is incremented on each save, and a save with an old version throws `ConditionalCheckFailedException`
- **A caveat from the same documentation**: Global tables reconcile concurrent updates with last writer wins, so this locking strategy doesn't work as expected there

## Tool Three: Pessimistic Locks

When conflicts are common or the rule spans rows, take a lock first. In PostgreSQL, `SELECT ... FOR UPDATE` locks the selected rows so that other writers, and others trying to lock them, wait.

The documentation lists four row lock modes, from the strongest, `FOR UPDATE`, through `FOR NO KEY UPDATE` and `FOR SHARE` to the weakest, `FOR KEY SHARE`. Row locks block writers and other lockers of the same row, and plain reads pass through.

The lock serialized our test, and the run took 0.40 seconds, five times longer than the atomic update, since each buyer had to wait for the one before. That is the price: correctness through a queue. Locks bring their own hazards:

- **Deadlocks**: Two transactions that lock rows in opposite order wait for each other forever, and PostgreSQL aborts one. The documentation's advice is that the applications acquire locks on multiple objects in a consistent order, and that aborted transactions are retried
- **Long holds**: A lock held while waiting for a user, or for a call to a payment provider, blocks the transactions behind it. The documentation says not to keep transactions open during user input
- **Queue tables**: The `SKIP LOCKED` option skips rows that are locked, which suits several workers taking jobs from one table, at the cost, as the documentation puts it, of an inconsistent view of the data
- **Advisory locks**: Locks on an application defined key, such as a seller's id, at session level, held until released and surviving a rollback, or at transaction level, released at the end. The documentation warns that a lock function in a query with `LIMIT` may run on more rows than the limit suggests

## Locks Across Machines

When the resource isn't in one database, such as a seat in a service that several databases touch, people reach for a distributed lock.

The Redis documentation describes the single instance version: set a key when it doesn't exist, with an expiry, using `SET resource_name my_random_value NX PX 30000`, and release when the value matches, since a plain delete can free someone else's lock.

Redlock extends it across several independent instances and counts the lock as held when a majority agree within the validity time.

Martin Kleppmann's analysis, which the Redis page itself cites, separates two uses. A lock for **efficiency**, to avoid duplicate work, can tolerate an occasional failure. A lock for **correctness**, where two holders corrupt data, can't. His argument against using Redlock for correctness is about time.

A client can pause, for garbage collection or a delayed network packet, after its lease has expired and then write anyway, and checking the expiry just before the write doesn't close the gap, since the pause can fall between the check and the write.

The remedy is a **fencing token**: the lock service hands out a number that grows with each acquisition, the client sends it with each write, and the storage rejects a write with a lower number than one it has seen. His complaint is that Redlock has no facility for generating such tokens.

<figure class="diagram">
<p class="rowname">Current Holder</p>
<div class="flow">
<div class="node">Lock Service</div>
<div class="arrow" data-label="token 34" aria-hidden="true"></div>
<div class="node">Client B</div>
<div class="arrow" data-label="write 34" aria-hidden="true"></div>
<div class="node">Storage<small>has seen 34</small></div>
</div>
<p class="rowname">Late Holder</p>
<div class="flow">
<div class="node wait">Client A<small>back from a pause</small></div>
<div class="arrow" data-label="write 33" aria-hidden="true"></div>
<div class="node lost">Storage<small>rejects it</small></div>
</div>
<figcaption>A fencing token: the storage refuses a late writer holding an older number</figcaption>
</figure>

The Redis documentation agrees that tokens should be implemented. The topic of [Distributed Locks and Fencing Tokens](/system-design/distributed-locks) and [Consensus and Leader Election](/system-design/consensus-leader-election) goes into the mechanics. The practical rule: for correctness, put the protection into the system that owns the data, with a conditional write or a fencing token, and treat a lock as an optimization.

## Holds, Retries and Hot Rows

Scarce resources have a shape of their own:

- **A hold with an expiry**: A buyer who clicks reserve gets the copy held for 10 minutes while paying, and the hold expires if payment doesn't finish. The hold is a row with an expiry time, and a sweeper or a condition on the read frees it. The payment itself stays outside the hold's transaction
- **Idempotency keys**: A retried reservation must not take a second copy. Stripe's API shows the usual design: the client sends an `Idempotency-Key` header, up to 255 characters, and a retry with the same key returns the saved response, with keys pruned after at least 24 hours. [Idempotency and Safe Retries](/system-design/idempotency) has the pattern
- **Pre split inventory**: A hot item can be divided into buckets, say 10 of 10 copies each, so that buyers hit different rows. The price is that a bucket can run out while another has stock, so a buyer whose bucket is empty tries the next
- **Serialize through a queue**: Send the purchases for one item to one consumer, for instance by using the item as the partition key, and the consumer applies them one at a time with no locking, at the cost of a delay, as in [Absorbing Traffic Spikes](/system-design/traffic-spikes)
- **Keep the hot transaction short**: Do the slow work, such as a payment call or a confirmation email, before or after the lock, and not inside it

A single row is updated by one transaction at a time, so a hot row is a throughput ceiling however many servers there are, the problem of [Handling Hot Spots and Celebrity Users](/system-design/hot-spots).

## Choosing

| Situation | Tool |
| --- | --- |
| A Counter or a Stock With a Floor | One atomic conditional update |
| A Read, Some Thinking, Then a Write, With Rare Conflicts | Optimistic version check and retry |
| A Rule Over Several Rows, or Frequent Conflicts | A lock, taken in a consistent order |
| Workers Taking Jobs From a Table | A lock that skips locked rows |
| A Resource Behind Several Services | A conditional write at the owner, with a fencing token if a lock is used |
| A Very Hot Item | Pre split inventory, or a queue per item |

## A Plan for the Textbook App

| Resource | Design |
| --- | --- |
| Copies of a Book | `UPDATE ... WHERE stock > 0`, with a 10 minute hold row while the buyer pays |
| A Listing Edited by Two Devices | A version check, with a 409 or 412 and a prompt to refresh |
| Seats in a Registered Study Group | A transaction that locks the group row, then counts the members |
| Receipt Emails | A queue with workers that skip locked jobs |
| Payment Retries | An idempotency key for each checkout |
| The Popular Book on Registration Day | Inventory split in 10 buckets, behind the waiting room |

## Pitfalls

- **Read, then write**: The check and the change must be one step
- **Retrying a single statement**: Under strict isolation, the whole transaction repeats
- **A lock held during a payment call**: The transactions behind it wait for the provider
- **Locks in different orders**: A deadlock, and an aborted transaction
- **A distributed lock for correctness, without a token**: A paused client writes after its lease ends
- **Optimistic checks under heavy contention**: Most attempts fail and the work is wasted
- **No hold expiry**: An abandoned checkout keeps a copy forever

## Key Points

- A check followed by a write is a race: in our test, 600 buyers bought a book with 100 copies, and the stock ended at 81
- The cheapest correct fix is one atomic conditional update, which sold exactly 100 copies and was the fastest, and it works whenever the rule is a condition on one row
- <u>Match the tool to the conflict rate</u>: optimistic checks need 283 retries in our test and suit rare conflicts, and locks serialize the work, costing five times more time but handling rules across rows
- A distributed lock for correctness needs fencing tokens, since a paused client can write after its lease has expired, and the protection belongs in the system that owns the data
- Use holds with expiry and idempotency keys for reservations, split hot inventory or serialize it through a queue, and keep the contended transaction short
