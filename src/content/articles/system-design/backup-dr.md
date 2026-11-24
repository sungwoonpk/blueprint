> A **backup** is a separate copy of data that lets you restore it after loss or damage. **Disaster recovery**, or DR, is the plan and the capability to bring the whole service back after a disaster. Two numbers steer it: the **recovery point objective**, how much data loss is acceptable, measured in time, and the **recovery time objective**, how long the service may stay down.

At 14:07 on a Tuesday, an engineer runs a cleanup query against the production database and forgets a condition. The whole listings table is emptied. The replicas obey the leader and delete their copies within a second, as [Single Leader Replication](/system-design/replication-one-leader) promised. The service is up, fast and empty.

Replication protects against a machine dying. It copies a mistake as faithfully as it copies a write, so it can't protect against a deleted table, a corrupting bug or a malicious change. Those need a copy that lives apart and in the past, which is what a backup is.

## Three Ways to Copy a Database

The first question is what kind of copy to take. There are three, and most databases have an equivalent of each:

| Method | What Is Copied | Restores |
| --- | --- | --- |
| Logical Dump | A snapshot of one database as SQL or an archive | One database, even into a newer version |
| File System Copy | The data directory | The whole cluster, from a stopped server or a frozen snapshot |
| Continuous Archiving | A base copy plus the stream of write ahead log files | The whole cluster, at any moment since the base copy |

The logical dump is the gentlest. It writes the database out as SQL or an archive, as of the moment it began, and it doesn't block other work apart from operations that need exclusive locks.

Because it describes the data and doesn't copy files, its output can usually be loaded into a newer version of the server, and a restore can be partial.

The file system copy takes the data directory itself. A usable copy needs the server shut down, unless the file system can take a frozen snapshot that covers the volumes at the same instant. It brings back the whole cluster, and it can't give back a single table.

Continuous archiving starts from a base copy and keeps the log files that follow. A restore can stop at any chosen moment since the base copy, which is its great strength.

Its weakness is timing. A log segment is archived when it completes, so a long delay can open between a commit and its safe storage. A timeout of a minute or so bounds that delay. Like the file copy, it restores the whole cluster and no subset.

Whichever one you pick, set up and test the archiving procedure before taking the first base backup. At the end of a restore, inspect the contents of the database to make sure it recovered to the state you wanted.

## Recovering to Just Before the Mistake

The ability to stop replay at a chosen moment is **point in time recovery**. We tried the idea on a toy SQLite database that held 50,000 listings at midnight.

Changes then arrived at about 0.5 a second, an assumption of ours, for 25,288 logged changes by 14:07:30, when a mistaken delete removed the rows. The database had 60,093 listings just before:

| Recovery Option | Listings Restored | Listings Lost |
| --- | --- | --- |
| The Nightly Dump From 00:00 | 50,000 | 10,093 |
| The Hourly Dump From 14:00 | 60,009 | 84 |
| The Nightly Dump Plus the Change Log Replayed to 14:07:29 | 60,093 | 0 |

The third row restored the state a second before the mistake, and replaying 25,288 changes took 0.13 seconds.

It also shows what point in time recovery doesn't do: each change committed after the stop point is discarded with the mistake, so a real recovery usually involves restoring to a scratch server, copying the lost rows back to production, and keeping the later writes.

## How Much Can We Lose

The first number, the recovery point objective, follows from the schedule. If a disaster strikes at a random moment, the expected loss is half of the interval between copies, and the worst case is the whole interval:

| Backup Schedule | Average Loss | Worst Loss |
| --- | --- | --- |
| Nightly Dump | 12 hours | 24 hours |
| Hourly Dump | 30 minutes | 60 minutes |
| Log Shipped at 5 Minute Intervals | 2.5 minutes | 5 minutes |
| Log Shipped at 1 Minute Intervals | 30 seconds | 1 minute |

At 0.5 changes a second, the nightly case loses 21,600 changes on average and the minute case about 15. These are our arithmetic, and they assume the log shipping keeps up.

If archiving falls behind, more data is lost in a disaster, so the lag of the archive is a metric with an alert, as in [Alerting and Dashboards](/system-design/alerting).

## How Long Will It Take

The second number, the recovery time objective, depends on how fast a restore runs, and the restore is slower than most people expect. A database can't be used while its files are still being copied back:

| Database Size | Restore Speed | Copy Time Before Any Replay |
| --- | --- | --- |
| 0.5 TB | 200 MB/s | 0.7 hours |
| 2 TB | 200 MB/s | 2.8 hours |
| 2 TB | 1,000 MB/s | 0.6 hours |

Replaying the log adds more, and so does the rest of the runbook: finding the backup, creating servers, repointing the application and warming caches. The way to know the real figure is to time a restore, which is the next point.

## A Backup Nobody Restored

A copy that nobody has restored is a hope. Backups fail quietly: the job reports success while it writes an empty file, the credentials expired, the log has a gap, or the dump can't be loaded into the current version.

The cure is to restore on a schedule. Each night or week:

- Restore the latest backup into a scratch environment and record how long it took
- Compare row counts and checksums with production
- Run a smoke test of the application against the restored copy

Then wire an alarm to it, so that a failed or slow drill pages someone, and so does a backup that didn't run. The measured restore time is the real recovery time objective, so compare it with the target.

The rule of thumb for where the copies live is 3-2-1: three copies of the data, on two kinds of storage, with one kept off site. The reasoning is to make no single event, whether a failed disk, a lost account or a building, take the whole set of copies.

A fourth point matters for attackers and mistakes alike: keep one copy that the production credentials can't delete or change, such as a copy in a separate account with write once storage, since an attacker or a runaway script with production access can reach every copy that production can reach.

Backups need protecting too. They contain the same personal data as the database, so they are encrypted, with the keys kept separately, as in [Encrypting Data at Rest](/system-design/encryption-at-rest), and they are part of the retention plan in [Data Privacy and Compliance](/system-design/privacy).

## Four Disaster Recovery Strategies

Four strategies lie along a scale of cost and speed. They come without fixed recovery times, so the table keeps to words:

| Strategy | What Runs in the Recovery Region | Recovery |
| --- | --- | --- |
| Backup and Restore | No servers, just copies of data and the code to rebuild | The slowest, with the largest data loss |
| Pilot Light | Data replicated continuously, core infrastructure switched off | The servers must be started and scaled up first |
| Warm Standby | A scaled down but fully working copy | Faster, since it needs scaling up and no more |
| Multi Site Active/Active | A full copy serving traffic | Near zero for most disasters |

Backup and restore is the cheapest and the simplest, and without infrastructure defined as code, recovery may overshoot the target.

A pilot light keeps the data replicated and the core infrastructure switched off, which holds the running cost down, but the recovery time and the recovery point are above zero because servers must start and scale up first.

A warm standby runs a scaled down, working copy in another region at any hour. Unlike a pilot light it can serve requests with no extra action first, and it is cheaper and simpler to run than active/active.

Active/active is the most complex and costly approach. Asynchronous replication can give a near zero recovery point, and corruption still needs backups, since the corruption replicates too.

A managed database service shows concrete figures: promoting a replica region takes less than a minute, and replication latency is under a second. The ordering of cost and recovery follows the options in [Balancing Cost and Performance](/system-design/cost-performance), and the multi region case is the next topic, [Surviving a Region Outage](/system-design/region-outage).

## Choosing for the Textbook App

The targets come from the business and not from the engineers. A table for the app, with targets that are our assumptions:

| Situation | Recovery Point | Recovery Time | Approach |
| --- | --- | --- | --- |
| Mistaken Delete or Bad Release | 1 minute | 1 hour | Point in time recovery from the log archive |
| Lost Database Server | 1 minute | 30 minutes | A replica, promoted |
| Lost Region, in Registration Week | 5 minutes | 1 hour | Warm standby in a second region |
| Lost Region, Rest of the Year | 1 hour | 8 hours | Backup and restore from code |

The last two rows differ because the cost of an hour of downtime differs. An hour is serious on registration day and tolerable in July, and the plan can change with the calendar, as the capacity did in [Capacity Planning](/system-design/capacity-planning).

## The Parts Beyond Data

A restored database isn't a restored service. The servers, networks and settings must be created from a repository, so infrastructure as code comes first. The keys from [Secrets and Key Management](/system-design/secrets) need copies stored where a disaster in the main region can't take them.

Traffic needs a tested way to move, with DNS included. And someone has to follow a runbook written for a tired person at night, including the decision of when to declare a disaster.

Then practice the whole plan to see that it meets the objectives, as in a game day from [Chaos Engineering](/system-design/chaos-engineering).

## Pitfalls

- **Treating replicas as backups**: a mistake is copied in a second
- **A backup that lives next to the data**: the same account, region and credentials
- **No restore test**: the first restore is the disaster
- **An unmeasured recovery time**: the target is a guess
- **Backups without the keys**: the data is there and unreadable
- **Objectives chosen by engineers alone**: the business pays for the downtime and has to set the numbers

## Key Points

- Replication protects against machine failure and copies mistakes, so backups are needed for deletes, corruption and attacks
- Dumps, file copies and continuous archiving trade granularity against data loss, and point in time recovery with a log restored the whole set of 60,093 listings where the nightly dump lost 10,093
- The recovery point is half the backup interval on average, and the recovery time is dominated by restore speed: 2 TB at 200 MB/s took 2.8 hours to copy
- <u>Restore regularly and time it</u>, keep 3-2-1 copies including one that production credentials can't change, and alert when backups or restores fail
- Pick a strategy by what the business can afford to lose: backup and restore, pilot light, warm standby or active/active, each faster and costlier than the one before
