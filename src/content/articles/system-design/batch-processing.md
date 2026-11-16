> **Batch processing** runs a job over a fixed, known set of data from start to finish, usually on a schedule, and produces a result when it ends. It trades freshness for throughput: the answer comes later, and a large amount of data is handled cheaply and completely.

The textbook app wants to suggest a price for each listing, based on what similar books sold for. The suggestion needs the whole sales history, compared by course, edition and condition.

Nobody is waiting for it at 9:00 AM on registration day, so it can run at 3:00 AM. This is the kind of work [Job Schedulers](/system-design/job-schedulers) starts, and a task queue from [Task Queues](/system-design/task-queues) could run it as many small jobs.

This topic is about how to build one large job so that it finishes, survives failures and can be run again.

## Bounded Data

The key property of a batch job is that its input has an end.

Apache Beam's documentation draws the line: a bounded dataset, such as a file or a table, can be processed by a batch job that reads the data once and finishes, while an unbounded one, such as a feed of events that keeps arriving, needs a job that runs continuously. We come to that case in [Stream Processing](/system-design/stream-processing).

Because the data is complete when the job starts, batch jobs can do things that are awkward on a live system: sort the full dataset, join two large datasets, count distinct values across a year.

They also run on their own schedule, away from the users, which is why analytics usually uses a separate copy of the data, as in [OLTP, OLAP and Data Warehouses](/system-design/oltp-olap).

| Question | Request and Response | Batch |
| --- | --- | --- |
| Who Waits | A user | No one |
| Input | One request | A whole dataset |
| Measure of Speed | Latency | Throughput and total time |
| A Failure Costs | One retry | Hours, unless the job can resume |
| Typical Start | A click | A schedule or an event |

## Map, Shuffle, Reduce

Large batch jobs are split across many machines, and one model for that became the standard teaching example: MapReduce, described by Jeffrey Dean and Sanjay Ghemawat at Google in 2004, and implemented in open source as Apache Hadoop.

The user writes two functions. A **map** function looks at one record and emits keys with values. A **reduce** function receives one key with its values and combines them.

Here is the textbook app counting the books sold in each course, from a log of sales:

```python
def map_fn(sale):
    yield (sale["course"], 1)

def reduce_fn(course, counts):
    return (course, sum(counts))
```

Between the two, the framework does the **shuffle**: it moves each pair with the same key to the same reducer and sorts them by key. Hadoop's tutorial describes it as the reducers fetching each mapper's share of the output over the network, and grouping it by key.

| Course | Values After the Shuffle | Reduce Output |
| --- | --- | --- |
| CS101 | 1, 1, 1 | 3 |
| MATH201 | 1, 1 | 2 |
| BIO110 | 1 | 1 |

<figure class="diagram">
<div class="flow">
<div class="node">Input Splits<small>one per map</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Map<small>emit key, value</small></div>
<div class="arrow" data-label="shuffle" aria-hidden="true"></div>
<div class="node">Reduce<small>combine by key</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Output<small>files</small></div>
</div>
<figcaption>The framework splits the input, groups the map output by key and writes the reduce output</figcaption>
</figure>

Each map task reads one slice of the input, called a split, and Hadoop's tutorial says the number of map tasks follows the number of input blocks: its example is 10 TB of input in 128 MB blocks, which makes about 82,000 maps.

The paper says it often runs jobs with 200,000 map tasks and 5,000 reduce tasks on 2,000 machines, with each map task reading 16 to 64 MB of input.

Two optimizations are worth knowing:

- **Move the work to the data**: The paper and Hadoop's tutorial agree that the machines that store the data also run the tasks, so a task is placed on a machine that already holds its input, since the network is the scarce resource
- **Combine early**: A combiner does a partial reduce on each map's own output before the shuffle. In the sales count, a map task that saw 1,000 sales of CS101 sends one pair, `(CS101, 1000)`, and not a thousand of them. It works because adding is associative and commutative, as the paper points out

## The Shuffle Is the Expensive Part

Map tasks read their own slice and reduce tasks read from each map, so the shuffle sends data across the whole cluster. Spark's documentation says a shuffle involves disk writes, serialization and network transfer, and lists the operations that cause one: grouping by key, joins, and repartitioning.

Apache Spark, a later engine that keeps data in memory between steps, expresses a job as a chain of transformations, and its tuning guides give numbers for sizing the pieces:

- **Tasks for each core**: The tuning guide advises 2 to 3 tasks for each CPU core in the cluster
- **Shuffle partitions**: Spark SQL splits the output of a shuffle into 200 partitions by default, and its adaptive execution merges small ones toward 64 MB
- **Skewed keys**: A partition counts as skewed when it is 5 times the median and larger than 256 MB, and Spark can split it

Skew is the textbook app's problem too: if a few popular courses hold most of the sales, the reducers for those keys get most of the work, as with a hot shard in [Sharding Strategies](/system-design/sharding). The remedies are the same: split the hot key, or combine before the shuffle.

## Lazy Plans and Recovery

Spark's documentation explains that its transformations are lazy: `map` and `filter` just record what to do, and no work runs until an action such as writing the output.

The recorded chain is the lineage, and when a partition is lost with a failed machine, Spark recomputes just that partition from its inputs and not the whole job. Hadoop does the same at the level of tasks: the framework monitors them and runs the failed ones again.

The MapReduce paper shows how much of this matters. During one job, network maintenance made groups of 80 machines unreachable for several minutes at a time, and the job kept making progress by running their work again.

## Failures and Chunks

A job that does its work in one piece loses its progress when it fails. To see how much, we simulated a job over 2,000,000 rows at 100 rows a second, which is 5.6 hours without failures, on a machine that crashes about once in 4 hours.

| Design | Mean Finish | 95th Percentile |
| --- | --- | --- |
| One Piece, Restart From the Start | 12.1 hours | 28.2 hours |
| 200 Chunks of 10,000 Rows, Retry the Failed One | 5.6 hours | 5.6 hours |

With chunks, a crash costs at most 100 seconds of work, and a run takes about as long as it would without failures. Without chunks, a single bad night costs more than a day.

This is the reason the paper and Hadoop split the work into thousands of tasks, and the reason [Job Schedulers](/system-design/job-schedulers) advised splitting a job that handles millions of rows.

## Running It Twice

Retries mean a chunk can run twice, and a batch run can be started again by hand. The output has to come out the same, as in [Idempotency and Safe Retries](/system-design/idempotency). Airflow's best practices say to treat a task like a database transaction that leaves no half finished output, and give the working rules:

- **Write with an upsert, not a plain insert**: A rerun replaces the rows it wrote before, and doesn't add them again
- **Read a named slice, not "the latest"**: Read the partition of the run's data interval, so a rerun a week later sees the same input
- **Keep the clock out**: A call to `now()` in the logic gives a different answer on each run
- **Don't leave results on a local disk**: Tasks may run on different workers, so intermediate results belong in shared storage

The paper's approach to output is the model: each task writes to a temporary file and renames it to the final name when it finishes, and the file system's atomic rename lets a single execution of a task win. For a table, the same idea is to replace a whole day in one transaction:

```sql
BEGIN;
DELETE FROM price_suggestions WHERE run_date = '2026-11-16';
INSERT INTO price_suggestions (run_date, listing_id, suggested_cents)
SELECT '2026-11-16', listing_id, suggest(listing_id) FROM listings;
COMMIT;
```

A rerun of the same day produces the same table, not twice the rows.

## Stragglers

The last few tasks decide when a job ends, and one slow machine can hold the whole run. The paper describes machines with a bad disk that read at 1 MB a second instead of 30, and a bug that slowed some by more than a factor of 100.

Its answer is backup tasks: near the end, the master starts a second copy of each task still running, and takes whichever finishes first. The paper says this adds no more than a few percent of extra work, and that its 1 terabyte sort took 44 percent longer with backups switched off.

We simulated 200 tasks of 100 seconds on 20 workers, one of them 10 times slower. Without backups the job took 2,000 seconds, since the slow worker held a task for 1,000 seconds and then took another.

With a backup of the last tasks it took 1,100 seconds, close to the 1,050 seconds an even cluster would need.

## Time Slices and Catching Up

Batch jobs are usually tied to a period: yesterday's sales, last week's listings. Airflow gives each run a data interval, the period of data it covers, and with a data interval timetable a run normally starts after its interval has ended, since the data is not complete before then.

A run for 16 November's sales starts after midnight at the end of that day.

When something was wrong, or a job is new, a backfill creates runs for past intervals. Airflow can create the missing runs alone, the missing and failed ones, or each of them again, and it can limit how many run at once so that a backfill does not swamp the cluster.

Rerunning a month of intervals is safe because each run is idempotent and reads its own slice.

Managed services take care of the machines. AWS Batch, for example, starts containerized jobs and finds the compute to run them, and the job design still decides whether a retry is safe.

## When Batch Is Not Enough

The price of batch is the wait. A suggestion computed at 3:00 AM is stale by the afternoon. If a result is needed within seconds or minutes, such as a fraud alert, the job has to run on events as they arrive: [Stream Processing](/system-design/stream-processing), next.

Many systems use both, with a stream for quick, approximate answers and a nightly batch to recompute the complete, correct ones.

## Key Points

- A batch job processes a bounded dataset to completion, trading freshness for throughput and the ability to see the full dataset
- MapReduce splits the work into map, shuffle and reduce, with tasks placed near their data, and the shuffle is the costly step
- <u>Split a big job into many small tasks</u>: in our simulation chunks cut the mean finish from 12.1 hours to 5.6 and removed the long tail
- Make each task idempotent with upserts, named input slices and atomic output, since retries and reruns will happen
- Expect stragglers and use backup tasks, run by data interval with backfills for the past, and choose streaming when the result is needed soon

