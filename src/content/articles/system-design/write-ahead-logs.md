> A **write-ahead log**, or WAL, is an append-only file in which a database records each change before applying it to its main data files. After a crash, the database replays the log to get back to the last committed state.

[Transactions and ACID](/system-design/transactions-acid) promised that a purchase either happens completely or not at all, and that a committed one survives a crash. This topic is how a database keeps that promise.

The textbook app's purchase from that topic changes four places: a listing, an order and two balances. Those live on different pages of the database's files, so how can a crash leave them in a safe state?

## The Rule

The database keeps its tables and indexes in files made of pages, and edits the pages in memory first. Writing each edited page to its place on disk at each commit would be slow, since the pages are scattered. And a crash halfway through would leave some pages new and others old.

The answer is the **write-ahead rule**, which PostgreSQL's documentation also builds on: a change may reach the data files only once the log entry that describes it is safe on disk. The log is a single file that is only ever appended to. Here is what the purchase writes to it, in a simplified form:

```text
LSN 101  T42  update listings page 17    status open -> sold
LSN 102  T42  insert orders page 902
LSN 103  T42  update users page 55       credit - 4500
LSN 104  T42  update users page 31       credit + 4500
LSN 105  T42  COMMIT
```

Each record has a **log sequence number**, LSN, which only grows, and the transaction it belongs to. A transaction counts as committed when its `COMMIT` record is safely on disk.

After that, the data pages can be written whenever it suits the database, even minutes later, because the log already holds everything needed to redo the changes. A crash can then happen at any moment:

| The Crash Comes | The Log Holds | Recovery Does |
| --- | --- | --- |
| Before the commit record is flushed | Records 101 to 103, no commit | Treats the purchase as not having happened |
| After the commit, before data pages are written | Records 101 to 105 | Redoes the changes from the log |
| While a data page is being written | The log, plus a copy of the page | Restores the page, then redoes |

The last row refers to a PostgreSQL feature, `full_page_writes`, on by default: the first time a page is changed after a checkpoint, the whole page is logged, so a page torn by a half finished write can be rebuilt. Replaying changes that never reached the data files is called roll-forward recovery, or REDO, in PostgreSQL's documentation.

## What the Log Holds

The simplest log holds only redo information: how to reapply each change. Wikipedia's article on write-ahead logging says logs usually hold both redo and undo information, because of how databases manage memory. Two policies matter.

A database may write a dirty page to disk before its transaction commits, called **steal**, to free memory, which means recovery may have to undo changes that never committed. And it needn't force pages to disk at commit, called **no-force**, which means committed changes may be missing from the files and must be redone.

The classic design for this combination is ARIES, which Wikipedia describes as built for a no-force, steal database.

Recovery runs in three phases: analysis, which works out from the last checkpoint what was in flight, redo, which repeats history, including changes of transactions that were never committed, and undo, which rolls those back, writing a record for each undo so that a crash during recovery can itself be recovered.

The page's sequence number is also the trick that makes redo safe to repeat: each page stores the number of the last change applied to it, and a record already reflected in the page is skipped.

PostgreSQL's design differs in one respect. Because it keeps old row versions in the tables, as in [Isolation Levels](/system-design/isolation-levels), its documentation describes recovery as redo, and aborted transactions simply leave versions that nobody can see.

## The Price of a Commit: Flushing

A commit has to wait until the log is truly on the disk, not just in the operating system's cache. That wait is the main cost of durability. We measured it on a laptop, appending 2,000 records of 100 bytes to a file and forcing them to the disk:

| Flush Policy | Records per Second |
| --- | --- |
| After each record | 384 |
| After every 10 records | 3,754 |
| After every 100 records | 31,448 |
| Once, at the end | 249,797 |

These numbers are for one laptop, and a server with a fast SSD will differ, but the shape is the point. A flush costs about the same however many records it covers, so sharing it is the way to go fast.

This is **group commit**, which PostgreSQL's documentation describes: one flush of the log can commit many transactions that finish at the same time, and a setting named `commit_delay` lets a transaction wait a moment so that more can join.

Some data can give up the guarantee. With asynchronous commit, `synchronous_commit` turned off, the database reports success before the flush.

PostgreSQL's documentation says the risk is lost data, not damage: after a crash, the database comes back consistent but without the last few transactions, in their original order, and the loss window is at most three times `wal_writer_delay`.

For the textbook app, that suits a counter of page views and not a purchase. The same documentation warns that `fsync = off` is a different matter, since a crash can then corrupt the database in arbitrary ways.

## Checkpoints Bound the Replay

If the log only grew, recovery would have to replay it from the very start. A **checkpoint** prevents that: the database writes out each changed page it is holding in memory, then records the fact in the log. Recovery begins at the point that record names, and older log can be discarded or archived.

There is a tradeoff in how often to do it. Frequent checkpoints make recovery faster, since less log needs replaying, and cost more page writes, and they raise the log's volume because of the full page writes after each.

PostgreSQL starts one every `checkpoint_timeout` seconds, 5 minutes by default, or when the log is about to exceed `max_wal_size`, 1 GB by default, and spreads its writes over the interval so the disk isn't flooded. The log itself is cut into segments, normally 16 MB each.

## More Than Crash Recovery

Once a database keeps an ordered record of each change, other uses follow:

- **Point-in-time recovery**: Restore a base backup, then replay archived log up to any moment you choose, such as just before a bad deploy deleted rows
- **Replication**: Send the log to another server that replays it, as in a warm standby, which is how many replicas are kept up to date
- **Change feeds**: Tools such as the change capture in [Cache Invalidation](/system-design/cache-invalidation) read the log to learn what changed

The same pattern appears far beyond relational databases. RocksDB, the engine behind many stores, writes each update to its WAL and to an in-memory table, and the WAL recovers the table after a failure. A log is deleted once everything in it has been flushed to files.

Its documentation describes recovery modes for the awkward case of a damaged end of the log, which a crash in the middle of a write can leave: one tolerates a corrupted tail, one stops at the first error and returns to a consistent earlier point, and one treats any error as corruption.

The point in time mode has been the default since version 6.6. SQLite offers a WAL mode too, in which changes are appended to a separate file and readers can work while a single writer appends.

And the consensus algorithm in [Consensus and Leader Election](/system-design/consensus-leader-election) gives each server a log as well as a state machine: first agree on the log, then apply it.

## Key Points

- The write-ahead rule: log records reach permanent storage before the changes they describe reach the data files, so a commit only needs the log flushed
- Recovery replays the log: committed changes missing from the files are redone, and uncommitted ones are ignored or undone
- The log holds sequence numbers and often both redo and undo information, as in the ARIES design
- <u>The flush is the cost of durability</u>, so group commit shares it, and asynchronous commit trades the last few transactions for speed
- Checkpoints bound how much log must be replayed, and the same log feeds backups, replicas and change feeds
