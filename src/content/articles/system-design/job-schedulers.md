> A **job scheduler** starts work at set times or intervals, such as every night at 3:00 or every 15 minutes. **Cron** is the classic format for saying when. With one machine it is simple, and with many machines the hard part is making sure each run happens once, not zero times and not twice.

The textbook app has two recurring jobs. A weekly digest emails each student the new listings for their courses, every Monday at 8:00, and a nightly cleanup archives sold listings. On one server, a line in `crontab` does it.

Then the app grows to 6 servers, and the questions begin: which server runs the digest, what happens if that server is down at 8:00, and what happens if a run takes longer than the gap before the next. This topic takes them in turn, building on [Task Queues](/system-design/task-queues).

## Reading a Cron Line

A cron line has five fields: minute, hour, day of month, month and day of week. An asterisk means every value, `1-5` is a range, `1,15` is a list, and `*/2` is a step. The jobs of the textbook app look like this:

```text
0 8 * * 1        # the weekly digest: Monday at 08:00
0 3 * * *        # the nightly cleanup: every day at 03:00
*/15 * * * *     # the cache check: every 15 minutes
```

Two details catch people out. The first is that steps only count inside their field. The manual page's example is `*/35` in the minute field, which runs at minute 0 and minute 35 of every hour, not every 35 minutes.

The second is the day fields. When both the day of month and the day of week are restricted, the job runs when either one matches, not both.

Take `30 4 1,15 * 5`, which a reader may take to mean "on the 1st and 15th when that day is a Friday". In November 2026 it ran on 6 days:

| Date | Why It Matched |
| --- | --- |
| Sun 1 | Day of month |
| Fri 6 | Day of week |
| Fri 13 | Day of week |
| Sun 15 | Day of month |
| Fri 20 | Day of week |
| Fri 27 | Day of week |

If both had been required, it would have run on no day at all in that month.

Time zones add their own risk. When clocks change for daylight saving, a time in the hour that is skipped doesn't match, so a job set for then doesn't run, and a time in the hour that happens twice runs twice.

The usual protection is to schedule in UTC, or to keep jobs out of the hours between 1:00 and 3:00 local time. Kubernetes has a `timeZone` field that takes a name such as `Etc/UTC`, and without it uses the local time of its controller. BullMQ takes `tz: 'UTC'` for the same purpose.

## One Machine Is Easy, Many Are Not

If each of the 6 servers has the digest in its crontab, the students get 6 emails. If only one server has it, the digest stops when that server fails, and nobody notices until the students complain. There are three common fixes:

| Approach | How It Works | Watch Out For |
| --- | --- | --- |
| A Scheduler That Only Enqueues | One definition creates jobs, and workers run them | The scheduler must itself be defined once |
| A Clustered Scheduler | Nodes share a database, and the first to lock a trigger fires it | Lock contention, and clocks that disagree |
| A Platform Scheduler | The platform creates a job at each time, as a Kubernetes CronJob does | The semantics of missed and doubled runs |

The first is the most common. BullMQ's job schedulers define a schedule with `upsertJobScheduler`, with a name and either an interval or a cron pattern. Because it is an upsert, creating the same scheduler on every server at startup doesn't create 6 schedules: it updates or creates it without duplicates.

It also notes that the next job is produced only when the previous one begins processing, so a busy queue can make jobs run less often than the interval says.

The second is how Quartz, a Java scheduler, works. It uses nodes that share one database, where the first node to get the lock on a trigger fires it:

<figure class="diagram">
<div class="flow">
<div class="node">Trigger Due<small>03:00</small></div>
<div class="arrow" data-label="lock row" aria-hidden="true"></div>
<div class="stack">
<div class="node hot">Node A<small>gets the lock, runs</small></div>
<div class="node">Node B<small>skips</small></div>
<div class="node">Node C<small>skips</small></div>
</div>
</div>
<figcaption>All nodes see the trigger, and the database lock lets only one fire it</figcaption>
</figure>

If a node dies in the middle of a job, the others find the jobs it was running, and run again those marked as needing recovery. Quartz has two limits.

The lock gets slower as nodes are added, beyond about three nodes depending on the database, and the clocks of the nodes must be kept within about a second of each other by a time sync service.

## Missed and Overlapping Runs

A scheduler can be down at the moment a run is due, which Quartz calls a misfire. When the scheduler starts again, it applies a rule for each trigger: ignore the misfire, do nothing and wait for the next time, or fire now. For cron triggers, the default policy is to fire now.

Kubernetes makes the same choice explicit with `startingDeadlineSeconds`, how late a run may still start. A run that misses its deadline is skipped, and later ones carry on. If more than 100 runs have been missed, the controller logs a warning and starts only one job, for the most recent. Its `concurrencyPolicy` answers the overlap question:

| Policy | When the Previous Run Is Still Going |
| --- | --- |
| Allow, the default | Start the new run as well |
| Forbid | Skip the new run |
| Replace | Stop the old run and start the new one |

For the digest, a sensible choice is a deadline of an hour: if the platform was down at 8:00 and comes back at 8:20, the email goes out then, and after 9:00 it is skipped, since a digest sent at noon is stale.

For a cleanup that sometimes takes longer than its interval, `Forbid` keeps two copies from fighting over the same rows.

## Zero, One or Two Runs

No scheduler promises exactly once. A Kubernetes CronJob creates a job approximately once per scheduled time, so the jobs you define should be idempotent.

So the jobs have to cope with a rerun, using the techniques in [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees). A simple one is a key for each run, so that a second attempt at the same run is recognized:

```sql
INSERT INTO job_runs (job, run_date)
VALUES ('weekly_digest', '2026-11-16')
ON CONFLICT DO NOTHING;
-- 0 rows inserted: another worker already has this run
```

A scheduler that stops firing is worse than one that fires twice, because nobody sees it. Log the start and end of each run, and alert when an expected run doesn't appear.

## Keeping the Scheduler Small

The scheduler's only job should be to say "it is time". The work belongs in a task queue, with the retries, time limits and dead letter queue from the last topics.

A job that processes millions of rows should be split into smaller pieces, as in [Batch Processing](/system-design/batch-processing), so that a failure repeats one piece and not the whole run.

One more habit matters at scale. If all the nightly jobs run at midnight, they all start together and their load arrives in one spike.

The AWS Builders' Library advises adding a little jitter to timers and periodic work, and choosing it in a consistent way for each host, so that a failure shows up in a repeatable pattern that is easier to debug.

The cron implementation `cronie` has built in versions: a `~` in a range picks a random value when the crontab is read, and `RANDOM_DELAY` delays a start by up to a number of minutes.

## Key Points

- A cron line has five fields, steps count only inside their field, and when both day fields are set a job runs on either match
- Daylight saving can skip a run or double it, so schedule in UTC or avoid the hours when clocks change
- With many servers, <u>define each schedule once</u>: a scheduler that only enqueues, a database lock that lets one node fire, or a platform scheduler
- Decide what a missed run does with a deadline, and what overlap does with a concurrency policy
- Expect zero, one or two runs, so make jobs idempotent, and alert when an expected run doesn't happen
