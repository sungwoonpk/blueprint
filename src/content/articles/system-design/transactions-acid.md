> A **transaction** is a group of database steps that happen as one unit: all of them, or none. **ACID** is the name for the four guarantees a good transaction gives you: atomicity, consistency, isolation and durability.

Buying a book in the textbook app is not one change but four. The listing is marked sold, an order row is created, and credit moves from the buyer's balance to the seller's, which is two more updates. Each step is fine alone. The trouble is what happens between them.

## Four Steps That Must Travel Together

Suppose the server dies after the second step:

<figure class="diagram">
<div class="flow">
<div class="node">Mark Sold<small>done</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Create Order<small>done</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node lost">Debit Buyer<small>server crashes</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node wait">Credit Seller<small>not reached</small></div>
</div>
<figcaption>A crash after two of four steps leaves a half finished purchase</figcaption>
</figure>

The book is gone from the listings, an order exists, and nobody paid. No later query can easily tell whether this order is real. A **transaction** fixes this by wrapping the steps in a block the database treats as one:

```sql
BEGIN;
UPDATE listings SET status = 'sold'
  WHERE id = 17 AND status = 'open';
INSERT INTO orders (listing_id, buyer_id, price_cents)
  VALUES (17, 8, 4500);
UPDATE users SET credit_cents = credit_cents - 4500
  WHERE id = 8;
UPDATE users SET credit_cents = credit_cents + 4500
  WHERE id = 3;
COMMIT;
```

PostgreSQL's tutorial calls this all or nothing. Until `COMMIT`, other sessions can't see any of the changes, and then all of them appear together. If something goes wrong first, `ROLLBACK` throws the whole block away. A crash before the commit has the same effect as a rollback.

Without `BEGIN`, PostgreSQL still wraps each statement in a transaction of its own, as its documentation notes. That is why one statement is safe alone, and four related ones are not.

Once a statement in a block fails, the block is aborted, and you must roll it back or return to a `SAVEPOINT`, a marker you can roll back to without losing earlier work.

The first `UPDATE` carries a check too. If it changes zero rows, the listing was not open, and the app should send `ROLLBACK` and tell the buyer.

## What ACID Promises

The four letters come from a 1983 paper by Theo Härder and Andreas Reuter, according to Wikipedia. Each answers a different worry:

- **Atomicity**: The block is all or nothing. The half finished purchase above can't be left behind, even by a crash
- **Consistency**: A transaction takes the database from one valid state to another, and the rules of that state hold when it commits. The database enforces the rules you give it, such as `CHECK (credit_cents >= 0)` or a foreign key, and rejects a commit that breaks one
- **Isolation**: Transactions running at the same time don't see each other's half finished work. Each behaves as if it had the database to itself, up to a level you choose
- **Durability**: Once the database says "committed", the change survives a crash or a power cut

Consistency is the odd one. The database can only check rules it was told about. "Credit moved between users must add up" is a rule of your own logic. It is kept by writing the debit and the credit in one transaction, and the database can't know it.

Sources also use the word loosely: Wikipedia describes it as preserving all defined rules, while MySQL's documentation uses it for protecting data from crashes. The word is also different from the C in the CAP theorem, which is about readers seeing the latest write, as in [The CAP Theorem](/system-design/cap).

## How the Database Keeps Its Promise

Atomicity and durability both depend on the same trick, the **write-ahead log**. A change is first written to a log, an append-only file, and flushed to disk. The data files are updated later, at the database's leisure:

<figure class="diagram">
<p class="rowname">At Commit</p>
<div class="flow">
<div class="node">Transaction</div>
<div class="arrow" data-label="appends" aria-hidden="true"></div>
<div class="node">Log<small>flushed to disk</small></div>
<div class="arrow" data-label="then replies" aria-hidden="true"></div>
<div class="node">Committed</div>
</div>
<p class="rowname">Later</p>
<div class="flow">
<div class="node">Changed Pages</div>
<div class="arrow" data-label="written" aria-hidden="true"></div>
<div class="node">Data Files</div>
</div>
<figcaption>The log is safe on disk before the database says committed</figcaption>
</figure>

PostgreSQL's documentation explains the payoff. A commit only needs the log on permanent storage, which is a sequential write, cheaper than flushing every changed page, and one flush can cover many transactions committing together. After a crash, the database replays the log to redo changes that never reached the data files, and that is durability. [Write-Ahead Logs](/system-design/write-ahead-logs) goes deeper.

Rollback needs the opposite: a way back. MySQL's InnoDB keeps undo records that describe how to reverse each change, and PostgreSQL leaves old row versions in place until nothing needs them. Either way, the database can restore the earlier state without help from your code.

Durability has a price, which is the wait for that flush on each commit. Most databases let you relax it for data you can afford to lose a little of, such as a page view counter, and MySQL's documentation lists several settings that trade safety against speed.

## Isolation in a Crowd

Now the textbook app has the busy day it was designed for. Two students tap Buy on the same listing at the same moment. Both reached the listing while it was open. What stops both purchases from going through?

In PostgreSQL's default isolation level, the first `UPDATE` to reach row 17 locks it until its transaction ends. The second waits, then looks at the row again and finds it sold, so the check `status = 'open'` matches nothing:

<figure class="diagram">
<p class="rowname">Buyer A</p>
<div class="flow">
<div class="node">Update Row 17<small>locks it</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Commit<small>sold, 1 row</small></div>
</div>
<p class="rowname">Buyer B</p>
<div class="flow">
<div class="node wait">Update Row 17<small>waits for A</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Check Again<small>0 rows, rollback</small></div>
</div>
<figcaption>The second buyer waits, then finds the book already sold</figcaption>
</figure>

Two kinds of lock are at work here. A **row lock** is taken by an update or by `SELECT ... FOR UPDATE`, which locks rows you only read so that nobody changes them before your transaction ends.

Plain reads take no row locks, since PostgreSQL's MVCC gives each statement a snapshot, so readers and writers don't block each other. What a reader sees, and the anomalies that can still happen, is the subject of [Isolation Levels](/system-design/isolation-levels).

Locks bring one more risk. Say a transfer debits user 8 and then credits user 3, while another moves credit the other way, and each has done its first step. Each now waits for the row the other holds, which is a **deadlock**.

PostgreSQL's documentation says the database detects the cycle and aborts one of the transactions, and which one is hard to predict. The best defense is to touch rows in the same order each time, for example the lower user id first. The fallback is to catch the error and retry the transaction.

## Short Transactions and Their Limits

PostgreSQL's documentation also calls it a bad idea to hold transactions open for long, with waiting for a user to click as the example. Locks stay held, and every transaction that needs the same rows waits. A few habits help:

- **Keep them short**: Do the thinking before `BEGIN`, and hold the transaction only for the writes
- **Keep outside calls out**: A payment provider or an email service can't be rolled back with the database. Make the call before or after the transaction, and make it safe to repeat, as in [Idempotency and Safe Retries](/system-design/idempotency)
- **Retry whole transactions**: After a deadlock or a failed commit, run the whole block again, not just the last statement

The biggest limit is reach. A transaction covers one database. Once the order lives in one service and the credit in another, no single `COMMIT` can span both, and later phases return to this with [Sagas](/system-design/sagas) and [The Transactional Outbox](/system-design/transactional-outbox).

## Key Points

- A transaction groups steps into an all or nothing unit, and without `BEGIN` each statement is its own tiny transaction
- ACID means atomic, consistent, isolated and durable, and the database enforces the rules you declare, while keeping your own rules true is up to your transactions
- A write-ahead log makes commits durable and lets the database recover after a crash
- <u>Concurrent writers are kept apart by locks</u>, and locks can deadlock, so touch rows in a consistent order and retry on failure
- Keep transactions short, keep outside calls out of them, and remember that one transaction covers one database
