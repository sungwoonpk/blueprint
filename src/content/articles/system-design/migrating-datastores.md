> A **datastore migration** moves data, and the code that reads and writes it, from one store to another while the service keeps running. The pattern is to copy the data, keep both copies in step, check that the new one answers like the old one, and switch traffic a little at a time, with a way back at each step.

The textbook app keeps its 3 million listings in one database that has run out of room to grow. The plan is to move them to a new store: a sharded cluster, or a different engine.

Registration day is at 9:00 AM, and 3,000 requests a second arrive then. A maintenance window that stops the site is not an option.

The simple plan is to stop writes, copy the rows, point the code at the new store, and start again. At our assumed 2,000 rows a second, 3 million listings take 1,500 seconds, which is 25 minutes of a site that can read but not write.

The cost grows with the data, and the plan has no way back if the new store turns out to behave differently.

The usual answer is to stay online and move in small, checked steps. This article follows that path.

## Why Size Changes the Plan

Stripe met the problem in 2017 while moving its subscription data. It had hundreds of millions of objects, and at one second each, a sequential migration of 100 million objects takes more than three years. Its services had to stay fully available the whole time.

The lesson is in the arithmetic: the copy has to run in parallel, in the background, and for long enough that changes will arrive while it runs. Stripe also kept each change small, no more than a few hundred lines of code at a time.

## The Four Steps

Stripe's migration followed a pattern that most online migrations share, in four phases: write to the old and new tables, move the read paths to the new table, move the write paths to write just the new table, and remove the old data.

| Stage | Reads From | Writes To |
| --- | --- | --- |
| Dual Write | Old | Old and New |
| Switch Reads | New | Old and New |
| Switch Writes | New | New |
| Remove Old | New | New |

The existing rows get into the new store by a **backfill**, a background copy that runs after the dual write starts. Stripe also copied rows lazily when they were updated, and then ran the backfill for the rest.

Each stage can be backed out until the old store is removed, with one condition. After writes move to the new store alone, the old one goes stale, so the way back needs changes to flow in reverse.

The Azure Architecture Center makes the same point in its database example for the strangler pattern: rollback stays possible while the two stores are in sync, and removing the legacy objects is a deliberate last step.

## Backfill While the Data Moves

A backfill has a race in it. The copier reads a row, and a moment later writes it to the new store. If an update lands in between, or after, the copy is stale.

<figure class="diagram">
<p class="rowname">Live Traffic</p>
<div class="flow">
<div class="node">App</div>
<div class="arrow" data-label="writes" aria-hidden="true"></div>
<div class="stack"><div class="node">Old Store</div><div class="node">New Store</div></div>
</div>
<p class="rowname">Backfill</p>
<div class="flow">
<div class="node">Old Store</div>
<div class="arrow" data-label="reads" aria-hidden="true"></div>
<div class="node hot">Copier<small>rate limited</small></div>
<div class="arrow" data-label="writes" aria-hidden="true"></div>
<div class="node">New Store</div>
</div>
<figcaption>Dual writes keep the stores in step from now on, and the copier moves the rows that already exist</figcaption>
</figure>

We simulated it. The table has 200,000 rows, the copier moves 2,000 rows a second, and 500 updates a second arrive, with 80 percent of them going to 20 percent of the rows. The copier takes 20 ms between reading a row and writing it, an assumption:

| Method | Stale Rows | Share |
| --- | --- | --- |
| Copy Alone, No Dual Write | 27,775 | 13.89% |
| Dual Write and Blind Copy | 7 | 0.0035% |
| Dual Write and Version Check | 0 | 0% |

Copying alone left more than one row in eight wrong, because the copy is a photograph of the moment it was taken. With dual writes switched on before the backfill, most of that vanishes.

The seven stale rows are the ones updated inside the 20 ms gap, where the old value from the copier overwrote a newer one.

The fix is a version check: each row carries a version or an updated time, and the copier writes just when the new store doesn't already hold a newer one. That closes the race.

Stripe adds practical points:

- **List from a snapshot**: It built the list of ids to copy offline from a snapshot of the data, so the listing didn't load the production database
- **Parallel copy**: A fleet of multi threaded workers did the copying
- **Check for gaps**: It ran the listing again afterward to confirm that no id was missing

Our addition is that the copier needs a rate limit and a pause switch, since it competes with live traffic, as in [Scaling Writes](/system-design/scaling-writes).

## When Dual Writes Drift

Dual writing means the application writes to two stores with no transaction around both. [Keeping Caches, Indexes and Copies in Sync](/system-design/keeping-copies-in-sync) explained why that drifts, and the numbers show how.

In the first test, 1,000,000 updates went to 100,000 rows, and the write to the new store failed with a fixed probability. A later successful write heals a row, since it writes the whole row:

| Failure Rate of New Store | Rows Left Wrong |
| --- | --- |
| 0.01% | 6 |
| 0.10% | 98 |
| 1.00% | 991 |

The count is close to the failure rate times the rows, because the last write to a row decides its state. The detail that matters is that a row nobody updates again stays wrong.

A busy table heals itself in part, and a cold one doesn't, so the backfill and a later reconciliation pass have to cover it.

The second test is about order. Two updates to the same row, close in time, can reach the two stores in different orders. We gave each store write a lognormal delay with a median of 5 ms, an assumption, at 1,000 updates a second with the same 80 and 20 skew:

| Rows Updated | Updates Applied in Different Order |
| --- | --- |
| 100,000 | 0.0136% |
| 10,000 | 0.13% |
| 1,000 | 1.32% |

The race is rare on a wide table and common on a narrow, hot one, which resembles a counter or a popular listing on registration day. The remedies are to send both writes through one ordered path, such as a version check on the new store, or to avoid writing twice.

## Copying from the Log Instead

The alternative is to let the old store's change log feed the new store, which is the idea of [Change Data Capture](/system-design/cdc). The log has one order, so the order race disappears, and the application writes to one place.

AWS Database Migration Service has two task types: a full load followed by ongoing change capture, and change capture alone for a target that already holds the data. It reads the source's log through the engine's native mechanism, such as row based binary logs for MySQL and a logical replication slot for PostgreSQL.

It also lists limits worth planning around:

- **No latency promise**: There is no service level for capture latency, and it depends on source load, network and instance size
- **Log retention**: The source has to keep its change log long enough, and for RDS sources about 24 hours is usually enough
- **Fixed start point**: The start is set when the task is created, and changing it means a new task
- **Open transactions**: For Oracle, starting from a point in time can miss transactions that were open then, with a setting to cover them

The strangler pattern's database example has the same shape: a bulk load and change capture, then a check for consistency, and then the new store becomes the system of record. A third route avoids the two writes by putting the change in an outbox, as in [The Transactional Outbox](/system-design/transactional-outbox).

## Check Before You Trust

Copying correctly doesn't prove that the new store answers correctly. A different engine can sort, compare and round differently.

GitHub's Scientist library, announced in 2016, is the standard technique. An experiment wraps the old code path, called the control, and runs the new one, the candidate, beside it.

<figure class="diagram">
<div class="flow">
<div class="node">Request</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack"><div class="node">Control<small>old store</small></div><div class="node">Candidate<small>new store</small></div></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Compare and Record</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Old Answer</div>
</div>
<figcaption>A Scientist style experiment: the caller gets the old answer, and the new one is just compared</figcaption>
</figure>

The results are compared, mismatches and timings are recorded, and the caller gets the control's result each time. Order is randomized, and an exception in the candidate isn't raised to the caller.

Stripe ran its reads against both tables this way and watched for mismatches before it switched the reads over. Know the limits:

- **Reads**: The tool is meant for code that doesn't change data, so writes need another method
- **Latency**: The candidate runs in the request, so it adds time to production
- **Timeouts**: A slow candidate isn't stopped for you, so run it on a small share of traffic
- **False alarms**: A value that changes between the two runs shows up as a mismatch

How many compared reads are enough? A mismatch that appears in a fraction r of reads is seen at least once, with confidence c, after ln(1 - c) divided by ln(1 - r) reads:

| Mismatch Rate | Reads for 90% | Reads for 99% |
| --- | --- | --- |
| 1% | 230 | 459 |
| 0.1% | 2,302 | 4,603 |
| 0.01% | 23,025 | 46,050 |

At 3,000 reads a second, comparing 1 percent of them gives 30 comparisons a second, so 46,050 take about 26 minutes.

The catch is that a rare bug often sits in a rare kind of row, such as a listing with unusual characters. Run the comparison through a full traffic cycle, and sample queries from production for the kinds that tests miss.

GitHub's MySQL 8.0 upgrade shows why. Queries with very long lists of values in a `WHERE IN` clause passed its test suite and crashed MySQL in production, and query sampling found them. Its validation included at least one full 24 hour traffic cycle.

## Same Store, New Version

An upgrade is a migration too, and GitHub's account of moving to MySQL 8.0 is the most complete we found. The fleet had more than 1,200 hosts, over 300 TB of data and 5.5 million queries a second across more than 50 clusters, and the work took over a year from July 2022.

The steps follow the same logic as the four stages:

- **Replicas first**: Upgrade one replica, watch it offline, then bring it into service, one data center at a time, while enough old replicas stay online to roll back
- **Topology for rollback**: An upgraded candidate replicated under the old primary, with new version replicas serving traffic and old version replicas kept idle as the way back
- **Primary last, by failover**: The primary wasn't upgraded in place, an upgraded replica was promoted, and the failover tool was set to exclude old hosts as candidates so a surprise failover couldn't go backward
- **Clean up late**: Old servers were removed after the cluster was confirmed not to need rollback

<figure class="diagram">
<div class="flow">
<div class="node">Old Primary<small>5.7</small></div>
<div class="arrow wide" data-label="replicates" aria-hidden="true"></div>
<div class="node hot">Upgraded Candidate<small>8.0</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack"><div class="node">New Replicas<small>serve traffic</small></div><div class="node wait">Old Replicas<small>idle, for rollback</small></div></div>
</div>
<figcaption>The rollback shape GitHub described for each cluster during its MySQL 8.0 upgrade</figcaption>
</figure>

The way back was the hard part. MySQL replicates from one release to the next, not explicitly the other way, and in staging a promoted 8.0 host broke replication on the 5.7 replicas. The causes were a default collation unknown to 5.7 and configuration statements that 5.7 couldn't run.

GitHub changed the defaults and adjusted permissions for the window. The lesson is to test the rollback path with as much care as the forward one. See [Single Leader Replication](/system-design/replication-one-leader) for the mechanics of promotion.

## Switching and Backing Out

Each move should be small, flagged and measured:

- **Ramp by percentage**: Stripe raised its dual writes gradually while watching production metrics, and a flag as in [Feature Flags](/system-design/feature-flags) does the same for reads
- **Gates between stages**: Move on when mismatches are zero or explained, lag is low, and error rates match the old path
- **Reverse path**: Before writes switch, have the new store's changes flow back to the old one, so a rollback doesn't lose data
- **Find leftover callers**: Stripe made the accessors of the old data raise hard errors, so forgotten code paths fail loudly in testing
- **Archive before deleting**: Keep a backup of the old store for a set period, as in [Backups and Disaster Recovery](/system-design/backup-dr)

Watch the migration with the signals of [Logs, Metrics and Traces](/system-design/observability): copy progress, dual write failures, mismatches, replication lag and the latency of both stores. The release practices of [Canary Releases and Other Deployment Strategies](/system-design/deployments) apply to each step.

Schema changes inside one store follow [Schema Migrations Without Downtime](/system-design/schema-migrations), and moving data between shards is covered in [Rebalancing Shards](/system-design/rebalancing). A split of the application along with its data is the subject of [Breaking Up a Monolith](/system-design/breaking-up-a-monolith).

## A Plan for the Textbook App

| Step | Move | Gate |
| --- | --- | --- |
| 1 | Add a version column and a flag for dual writes | Old path unchanged |
| 2 | Turn on dual writes at 1%, then 100% | Failures near zero |
| 3 | Backfill from a snapshot list, with a version check and a rate limit | Row counts match |
| 4 | Reconcile cold rows and compare hashes of ranges | Zero differences |
| 5 | Shadow read 1% of listing reads, then raise it | Mismatches explained |
| 6 | Switch reads by percentage, away from registration hour | Latency and errors equal |
| 7 | Add the reverse path, then switch writes | Rollback tested |
| 8 | Keep the old store, archived, until a full semester passes | Backup restored once |

## Pitfalls

- **A stop and copy plan**: The window grows with the data, and there is no way back
- **A backfill without dual writes**: The copy is stale on arrival, 13.89 percent in our test
- **A blind copy**: An old value from the copier overwrites a newer write
- **Dual writes without reconciliation**: Cold rows stay wrong for good
- **Ignoring order**: Close writes reach the stores in different orders, and a hot row suffers most
- **Skipping the check on reads**: Differences in sorting and rounding show up after the switch
- **An untested rollback**: GitHub's staging run broke replication in the reverse direction
- **Deleting the old store early**: A late bug leaves no reference to compare against

## Key Points

- Migrate online in small steps: dual write, backfill, check, switch reads, switch writes, remove the old store, with a way back until the end
- Copying alone isn't enough: in our test it left 13.89 percent of rows stale, while dual writes plus a version check left zero
- Dual writes drift in two ways, failed writes that cold rows don't heal and order races that grew to 1.32 percent of updates on a hot, narrow table, so reconcile and consider the log instead
- <u>Compare before you switch</u>: run old and new side by side, return the old answer, and sample enough reads, since a 0.01 percent bug needs about 46,000 comparisons for 99 percent confidence
- Test the rollback as carefully as the forward path, as GitHub's MySQL upgrade showed, and keep the old store until the new one has run a full cycle
