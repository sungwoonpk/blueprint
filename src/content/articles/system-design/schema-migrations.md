> A **zero downtime schema migration** changes the structure of a database while the application keeps serving traffic. It works by splitting one risky change into several small steps, each of which is compatible with both the old and the new version of the code.

The textbook app stores a listing's price as a decimal number of dollars, and a bug in rounding has cost a few students a cent. The fix is to store the price in whole cents.

That means a new column, a conversion of 3 million existing rows, and a change in each place that reads or writes the price, while 6 servers keep answering students.

The change looks small. The trouble is that a database and an application can't be changed at the same instant. [Canary Releases and Other Deployment Strategies](/system-design/deployments) made this concrete: during any rollout, old and new code run side by side against one database.

A schema that suits just the new code breaks the old servers, and one that suits just the old breaks the new.

## The Order of Steps

Martin Fowler's pattern of parallel change names the order: **expand**, **migrate** and **contract**. First add the new structure beside the old, so both work. Then move the users of the old structure over, step by step. Last, remove the old one when no code uses it. The migrate phase is the transition, when the database supports both.

For the price column, it takes six steps, each its own release:

| Step | What Changes | Safe to Roll Back |
| --- | --- | --- |
| 1. Expand | Add the nullable column price_cents | Yes, drop it |
| 2. Write Both | The app writes price and price_cents | Yes, return to the old app |
| 3. Backfill | Fill price_cents for the existing rows, in batches | Yes, stop |
| 4. Read New | The app reads price_cents, with a check against price | Yes, switch the read back |
| 5. Write New | The app stops writing price | Yes, while price still exists |
| 6. Contract | Drop the column price | No, so wait and back up first |

Stripe described the same shape in its post on online migrations, with four steps: write to the old and new stores, move the reads to the new one, move the writes to the new one alone, and remove the old data.

The team moved hundreds of millions of subscription objects while the services stayed up, and it states the arithmetic of why a plan like this is needed: at one second per object, copying 100 million objects one by one would take over three years.

Two details from Stripe's account are worth copying. For step 4, it used GitHub's Scientist library to run both reads and raise an error when they disagree, and it switched after the results matched.

And it kept each code change small, attempting no more than a few hundred lines at once, since the old structure was used in thousands of places.

The steps don't have to be separate releases when the traffic is low, but each must be compatible with the one before it. A flag can control step 4, so the read switches without a deploy, as in [Feature Flags](/system-design/feature-flags).

## What the Database Locks

An ALTER takes a lock, and the lock decides whether the app notices. The PostgreSQL documentation says that an ALTER TABLE takes an ACCESS EXCLUSIVE lock unless a form is noted otherwise, and when several actions are combined, the strictest applies.

That mode alone blocks a plain read, so while it is held, the table can't be read or written. The documentation also says a statement that wants a conflicting lock waits until the lock is free, with no limit unless a deadlock is detected.

The real danger comes from the queue, not the lock itself. The MySQL documentation states it plainly: a pending exclusive metadata lock requested by an online DDL operation blocks subsequent transactions on the table.

Its example has one session that read the table inside a transaction and stays open, a second session that runs an ALTER and waits, and a third that runs a simple SELECT and waits too. PostgreSQL's conflict rules lead to the same shape.

An ALTER that needs 0.1 seconds can therefore hold up the traffic for as long as the oldest open transaction. Suppose a 60 second report holds a read lock and the ALTER arrives at 10 seconds.

With 1,000 reads a second, the ALTER waits 50 seconds and blocks 50,000 reads behind it. This is our arithmetic, not a measurement.

The remedy is to refuse to wait: give the statement a short lock timeout, such as 2 seconds, and retry it.

With the same numbers, a retry at 5 second intervals delays about 16,000 reads, each for 2 seconds at most, and the ALTER goes through the first time no long transaction is open. It also helps to look for long transactions before starting and to run changes at the quiet hour.

## Which Changes Are Safe

The details differ by database, and the documentation is the place to check for your version:

| Change | The Risky Way | The Safer Way |
| --- | --- | --- |
| Add an Index | A plain build, which locks out writes in PostgreSQL | CREATE INDEX CONCURRENTLY |
| Make a Column NOT NULL | SET NOT NULL, which scans the whole table under a lock | A CHECK constraint added as NOT VALID, then validated, then SET NOT NULL |
| Add a Foreign Key | ADD FOREIGN KEY with its table scan | Add it as NOT VALID, then VALIDATE CONSTRAINT |
| Rename a Column | RENAME, which breaks the old code | Expand and contract with a new column |
| Change a Column Type | An ALTER that rewrites the table | A new column, a backfill and a switch |

- **Concurrent index builds**: PostgreSQL's CREATE INDEX CONCURRENTLY builds without blocking inserts, updates and deletes. It scans the table twice, waits for older transactions, cannot run inside a transaction block, and on failure leaves an invalid index that still costs write overhead and must be dropped and rebuilt
- **NOT NULL without a long lock**: The documentation says the scan is skipped when a valid CHECK constraint already proves there are no nulls. Adding the CHECK as NOT VALID is quick, and VALIDATE CONSTRAINT takes a SHARE UPDATE EXCLUSIVE lock, which lets reads and writes continue
- **Foreign keys**: ADD FOREIGN KEY takes a SHARE ROW EXCLUSIVE lock on both tables, so the same NOT VALID and VALIDATE route avoids the long scan under the lock
- **MySQL**: Version 8.4 adds a column instantly by default, drops a column and renames one without changing its type as metadata changes, and adds a secondary index in place with concurrent writes. Changing a column type needs a table copy. The LOCK option sets what is allowed during the change, from the least strict to the most strict, and the statement fails if the request is stricter than the operation permits
- **Instant has limits**: MySQL counts each instant add or drop as a row version and allows 64 before it requires a rebuild

## Big Tables and Ghost Copies

For a table too large for an in place change, the approach is a copy: build a new table with the new shape, copy rows in small pieces, apply the live changes to it, and swap the names. GitHub's gh-ost does this for MySQL, and its notes explain a design choice.

Older tools use triggers, which run inside each write on the original table. Triggers add work to each write, compete for locks and can't be paused without losing data, since a throttled copy still has the triggers firing, and gh-ost's documentation reports lockups from them in production.

gh-ost instead reads the database's binary log and applies the changes to the new table asynchronously. The README says that lets it suspend the migration for real, with no writes to the main database while throttled.

It can also postpone the final swap until you choose the moment, and a test mode on a replica leaves two tables for comparison. Its advice is a dry run first, and then the real run.

## Backfilling Safely

Step 3 touches each row, and one statement that updates 3 million rows holds its locks for the whole time. We measured a toy version on SQLite, a single process with 1 million rows in write ahead log mode, which is much faster per row than a real server:

| Backfill Style | Longest Write Lock | Total Time |
| --- | --- | --- |
| One Statement | 0.23 s | 0.23 s |
| Batches of 100,000 | 0.024 s | 0.22 s |
| Batches of 10,000 | 0.007 s | 0.24 s |
| Batches of 1,000 | 0.003 s | 0.21 s |

The total stayed the same, and the longest lock shrank in proportion to the batch. A production database does far more work for each row, with indexes, a write ahead log and replicas, so the real numbers are much larger, and the ratio is what carries over.

A good backfill job is:

- **Keyed**: It walks the primary key in ranges, so each batch is an index lookup and not a scan from the start
- **Resumable**: It records where it stopped, so a failure or a pause loses no work
- **Safe to repeat**: A batch that runs twice gives the same result, as in [Idempotency and Safe Retries](/system-design/idempotency)
- **Throttled**: It pauses between batches and slows down when the replicas fall behind, since a fast backfill creates the [Replication Lag](/system-design/replication-lag) that users then read stale data through
- **Checked**: A final count of rows that still need conversion should be zero before step 4

Stripe found that even finding the rows was the costliest part on a live database, and ran that work offline over snapshots. The same idea applies at a smaller scale: scan from a replica when possible.

## Making It Routine

Practices that keep migrations from being an event:

- **Migrations as code**: Versioned files in the repository, reviewed like any change, and run by the pipeline
- **Separate from the app deploy**: The expand step ships before the code that needs it, and the contract step ships well after the code stopped using the column
- **Tested on realistic data**: Run on a copy of production size, since a change that takes seconds on a test table can take hours on the real one. MySQL's guidance is the same: check whether rows were copied, and try on a sample first
- **Contract with care**: Dropping a column can't be undone from the application, so confirm that no code reads it, keep a [Backups and Disaster Recovery](/system-design/backup-dr), and wait one or two release cycles

## Pitfalls

- **A rename**: It looks like one step and breaks the old servers during the rollout
- **An open transaction**: A forgotten session blocks an ALTER, and the queue behind it takes down the table
- **No lock timeout**: A migration that waits forever
- **A backfill in one statement**: Long locks, a flood of replication traffic, and a long rollback if it fails
- **Contracting early**: The old version, or a rollback, still needs the column
- **Skipping the check**: Switching reads without comparing the old and new values hides a bug in the conversion

## Key Points

- Old and new code run together during any rollout, so each schema change has to work with both: expand, migrate, then contract
- An ALTER takes a lock, and a waiting ALTER blocks the queries behind it, so use a short lock timeout and retry, and look for long transactions first
- <u>Use the non blocking forms</u>: concurrent index builds, NOT VALID constraints that are validated later, and instant metadata changes where the database offers them
- Backfill in small keyed batches: in our SQLite test the longest lock fell from 0.23 s to 0.007 s with batches of 10,000, and the total time didn't change
- Compare old and new values before the switch, keep the old column until confidence is high, and back up before the contraction
