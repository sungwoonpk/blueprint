> An **isolation level** is a database setting that decides how much of other transactions' work a transaction can see while both are running. Weaker levels wait less and allow stranger results. Stronger levels prevent more of them and cost more.

[Transactions and ACID](/system-design/transactions-acid) promised that concurrent transactions don't see each other's half finished work, "up to a level you choose". This topic is that choice. On registration day thousands of transactions overlap in the textbook app, and what each one is allowed to see decides whether the pages are right.

## Strange Things That Can Happen

Each of these is an **anomaly**, a result that couldn't happen if transactions ran one at a time. Each has a name, and each is easiest to learn from a bug it causes in the app:

- **Dirty read**: Reading another transaction's change before it commits. A buyer's page says listing 17 is sold, then the sale rolls back, and the listing was never sold
- **Nonrepeatable read**: Reading the same row twice in one transaction and getting different values. The price of listing 17 reads 4,500, the seller lowers it, and a second read gives 4,000, so a receipt built from both is wrong
- **Phantom read**: Running the same query twice and getting different rows, because another transaction committed a new matching row in between. A count of open calculus listings says 12, then 13
- **Lost update**: Two transactions read a value, and both write a new one based on what they read, so one write vanishes. Two requests read a view counter of 120, and each stores 121, when it should be 122
- **Write skew**: Two transactions each check a rule, then write different rows, and together they break it. A seller may have at most 3 open listings. Two requests each count 2, and each adds one, so the seller now has 4

The first three are listed in the SQL standard. The last two are not, and databases treat them differently. There is one more name for the general case, the **serialization anomaly**: a result that matches no order in which the transactions run one after another. Write skew is the most common example.

## The Four Levels

The SQL standard defines four levels, from weakest to strongest:

<figure class="diagram">
<div class="scale">
<div class="line"></div>
<div class="dot" style="--x: 8%"><span>Committed</span></div>
<div class="dot" style="--x: 50%"><span>Repeatable</span></div>
<div class="dot" style="--x: 92%"><span>Serializable</span></div>
<div class="ends"><span>More surprises</span><span>Fewer surprises</span></div>
</div>
<figcaption>One dial: Read Committed, Repeatable Read and Serializable, from least to most protection</figcaption>
</figure>

The standard also lists Read Uncommitted below Read Committed, which allows dirty reads. PostgreSQL accepts the name but treats it as Read Committed, so none of its levels allows a dirty read. Here is what can still happen at each of the three levels in PostgreSQL:

| Level | What Can Still Happen |
| --- | --- |
| Read Committed | Nonrepeatable reads, phantom reads, lost updates and write skew |
| Repeatable Read | Write skew |
| Serializable | Nothing from this list |

The names come from the standard, but products build them differently, so the table is about PostgreSQL. In MySQL's InnoDB the default is Repeatable Read, with snapshots for plain reads and range locks for locking reads.

The Jepsen project found that some Repeatable Read implementations still allow lost updates. When you change databases, check the documentation and don't trust the name.

Two ideas sit behind the table. **Read Committed**, the default in PostgreSQL, gives each statement a fresh snapshot of the committed data. **Repeatable Read** takes one snapshot when the transaction starts its first statement, and every read after that sees the same data. The second one is also called snapshot isolation.

## A Lost Update, Up Close

Here is the view counter, with two requests from two web servers:

<figure class="diagram">
<p class="rowname">Request A</p>
<div class="flow">
<div class="node">Read<small>views is 120</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Write<small>views is 121</small></div>
</div>
<p class="rowname">Request B</p>
<div class="flow">
<div class="node">Read<small>views is 120</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Write<small>views is 121</small></div>
</div>
<p class="rowname">Result</p>
<div class="flow">
<div class="node lost">Stored<small>121, not 122</small></div>
</div>
<figcaption>Both requests read before either wrote, so one update is lost</figcaption>
</figure>

The bug lives in the app, which reads, thinks, and then writes. Giving the database the whole job fixes it, and it works at Read Committed:

```sql
-- Risky: read in one statement, write in another
SELECT views FROM listings WHERE id = 17;
UPDATE listings SET views = 121 WHERE id = 17;

-- Safe: one statement reads and writes
UPDATE listings SET views = views + 1 WHERE id = 17;
```

Here is why the second form is safe. If another transaction changed the row first, the `UPDATE` waits for it to finish, then checks the row's newest version again and applies its change to that one.

When the read has to be separate, because the app needs the value to decide something, there are two tools. `SELECT ... FOR UPDATE` locks the rows you read, so that others wait until your transaction ends. A stronger level fails instead of losing the update. At Repeatable Read, PostgreSQL stops the second writer with an error:

```text
ERROR:  could not serialize access due to concurrent update
```

## Write Skew and Serializable

Write skew is harder to spot, because the two transactions write different rows and neither one overwrites the other. Take the rule of three open listings per seller:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM listings
  WHERE seller_id = 3 AND status = 'open';  -- 2
INSERT INTO listings (seller_id, status, ...)
  VALUES (3, 'open', ...);
COMMIT;
```

Two copies of this run at once. Each snapshot shows 2 listings, each check passes, each insert is a new row that doesn't touch the other's, and nothing conflicts. Together they leave the seller with 4.

Jepsen describes the same pattern with two electricians who each see room for one more circuit on a panel and both add one.

At **Serializable**, PostgreSQL watches for exactly this: transactions that read what another one writes, and write what another one read. It uses a technique called Serializable Snapshot Isolation. When it finds a pattern that no order of running them one after another could produce, it aborts one of the transactions:

```text
ERROR:  could not serialize access due to
        read/write dependencies among transactions
```

The check doesn't add locks that make others wait. It adds some overhead, and it means some transactions fail, which leads to the main rule of the stronger levels: **the app must retry**.

At Repeatable Read and Serializable, the application has to be ready to run the whole transaction again, and these failures carry the SQLSTATE code `40001`. A sketch:

```python
for attempt in range(3):
    try:
        with db.transaction(isolation="serializable"):
            add_listing(seller_id, data)
        break
    except SerializationFailure:   # SQLSTATE 40001
        continue
```

Retry the whole block, not the last statement, and not forever.

On the second try, the new snapshot includes the other transaction's commit, so the count says 3 and the check does its job.

If you can't use Serializable, locking the seller's row first with `SELECT ... FOR UPDATE` makes the competing transactions wait for each other, and a constraint or trigger can enforce the rule where the database can see it.

## Choosing a Level

No level is right for all queries, so the choice is made by what a transaction does:

- **Read Committed**: The default, and a sound one when each statement stands alone. Single row updates, simple reads and statements like `views = views + 1` are fine here. It is a poor fit for logic that reads several things and then writes
- **Repeatable Read**: Use it when many reads must agree with each other, such as a report that adds up totals from several tables. Mark it `READ ONLY` if it doesn't write. Transactions that write need to be ready to retry
- **Serializable**: Use it when a rule spans rows and a bug would be costly, such as limits, balances or stock, and you would rather have the database catch a mistake than a person. Expect some retries, and keep transactions short and few

You set it per transaction with `BEGIN ISOLATION LEVEL ...`, or for a session or for the whole server through a setting. PostgreSQL's default is Read Committed, and InnoDB's is Repeatable Read, so an app that moves between them can behave differently with no code change.

One limit is worth knowing. Isolation is about transactions overlapping on one database. A reader that lands on a lagging replica sees old data at any level, a separate problem from [Replication Lag](/system-design/replication-lag), and [Consistency Models](/system-design/consistency-models) gives the vocabulary for it.

## Key Points

- Concurrent transactions can cause dirty reads, nonrepeatable reads, phantom reads, lost updates and write skew, and each level allows some of them
- Read Committed gives each statement a fresh snapshot, Repeatable Read gives one snapshot per transaction, and Serializable also catches write skew
- <u>Let one statement do the read and the write</u>, as in `views = views + 1`, or lock the rows first with `SELECT ... FOR UPDATE`
- Repeatable Read and Serializable can abort a transaction, so the app has to retry the whole transaction
- Level names are standard but behavior varies, so read your database's documentation
