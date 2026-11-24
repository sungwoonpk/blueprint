> **MapReduce** is a programming model and a runtime for processing huge data sets on a cluster of cheap machines. The programmer writes two functions, a map that turns each input record into key and value pairs and a reduce that combines the values of one key. The runtime splits the input, moves the data between the two steps, and recovers from machine failures by running lost tasks again.

At the end of each semester the textbook app wants one number: how often was each book searched, summed over a year of logs.

The logs are 4 TB. A single machine can't read them in a reasonable time, and splitting the job by hand over 200 machines means writing code for the splitting, the moving of data, the machines that die in the middle, and the machine that is merely slow.

Google had that problem at the scale of the whole web. By 2004 its engineers had written hundreds of special purpose programs, each a simple idea, such as counting URLs in access logs or building an inverted index, and each surrounded by pages of code for parallelism and failure.

They noticed that the simple idea had the same shape each time, and they put the shape into a library.

This topic walks through that shape, shows why a model this small was enough to survive failures and stragglers, and tests three of its ideas on our own simulations: backup tasks, the combiner, and the size of a task.

It builds on [GFS and HDFS](/system-design/gfs-hdfs), where the data lives, and it leads into [Spark](/system-design/spark) and [Dataflow](/system-design/dataflow), which keep the idea and change the machinery.

## Two Functions

The model asks for two functions. A **map** takes one input pair, say a document name and its text, and emits any number of intermediate pairs. A **reduce** takes one intermediate key and the list of values that were emitted for it, and produces a result for the key.

Counting searches per book is a short program. The map reads one log line and emits the book and a 1. The reduce adds the 1s for a book:

```text
map(line):
    emit(book_of(line), 1)

reduce(book, counts):
    emit(book, sum(counts))
```

Between the two, the system groups the pairs by key. That grouping is the step called the shuffle, and nobody writes it.

The same two function shape covers a surprising range:

- **Distributed grep**: the map emits a line if it matches, and the reduce copies it
- **The reverse of a link graph**: the map emits a target and its source
- **An inverted index**: the map emits a word and a document, and the reduce lists the documents
- **A sort**: the map emits a key and the record, and the system's ordering does the rest

The restriction is the gift. A map handles one record at a time and can't see another, and a reduce sees one key at a time.

Because of that, the system may run any number of maps at once on any machines, run a task twice without harm, and move a task to another machine without asking. The program is simple enough to be correct when the machinery is not.

## How a Job Runs

The runtime has one master and many workers. It splits the input into M pieces, usually 16 to 64 MB each, and cuts the intermediate keys into R partitions, by default with a hash of the key modulo R. The master hands out M map tasks and R reduce tasks to idle workers.

<figure class="diagram">
<div class="flow">
<div class="node">Input Splits</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Map Tasks<small>local disk</small></div>
<div class="arrow" data-label="shuffle" aria-hidden="true"></div>
<div class="node">Reduce Tasks<small>sorted by key</small></div>
</div>
<figcaption>Map tasks write partitioned output to local disk, and reduce tasks pull their partition from each map task</figcaption>
</figure>

A map worker reads its split, applies the map function, and buffers the output in memory. From time to time it writes the buffer to its own local disk, divided into R regions, and reports their locations to the master.

A reduce worker, told where the data is, reads its region from each map worker, sorts it by key so that equal keys sit together, and calls the reduce function on each key and its values.

Its output goes to a final file, one for each reduce task, and the job is done when the last one finishes.

Two choices in this flow are worth noticing. Intermediate data goes to local disk and not to the distributed file system, since it is temporary and replicating it would cost more than recomputing it.

And map tasks are placed near their input: GFS keeps three copies of each 64 MB block, and the master tries to run the map on a machine that holds a copy, or on the same switch.

On large jobs, most input is read locally and uses no network, which matters because the network was the scarce resource.

## Failure Is the Normal Case

The master pings each worker. A worker that doesn't answer is marked failed, and its tasks go back to idle. The rule for what to redo follows the place where the output lives.

A completed map task must be redone, because its output sat on the failed machine's local disk. A completed reduce task doesn't need redoing, since its output is in the file system. A task in progress is redone either way.

The system survived failures that look dramatic. During one job, network maintenance made groups of 80 machines unreachable for several minutes at a time, and the master ran their work again and went on.

The master itself is a single process, whose state could be checkpointed, but the implementation simply aborted the job if it died, on the argument that a single machine rarely fails and the client can retry.

The correctness argument is a short one. When the map and reduce functions are deterministic, the output equals that of a run without failures. A task writes to private temporary files.

The master accepts the first completion message for a map task and ignores later ones, and a finishing reduce task renames its temporary file to the final name with an atomic rename, so two executions of the same task leave exactly one result.

The pattern is the idempotent step of [Idempotency and Safe Retries](/system-design/idempotency), and the rename is a tiny version of commit. If a task has side effects beyond its output files, the programmer must make them atomic and repeatable, since the system offers no commit across several files.

## Tasks That Are Small

How many tasks should a job have? The answer in the original design is many more than workers: M and R much larger than the number of machines. A typical large job used M of 200,000 and R of 5,000 on 2,000 machines. The reason is how a failure is repaired, and we put numbers on it.

Take 2,000 workers each with 100 minutes of map work, and a worker that dies at 90 percent of the map phase. Its completed map tasks are lost and must be redone. The work is spread over the survivors, so the extra time is about one task:

| Map Tasks per Worker | Task Length | Tasks Lost in the Failure | Extra Time After the Failure |
| --- | --- | --- | --- |
| 1 | 100 min | 1 | 100 min |
| 10 | 10 min | 9 | 10 min |
| 100 | 1 min | 90 | 1 min |
| 1,000 | 6 s | 900 | 6 s |

With one big task each, a late failure doubles the job. With small tasks, the lost work is shared by the other workers and the delay is about one small task. The same small tasks also balance load, because a fast machine takes more of them, and they make the locality rule easy to meet.

The price is bookkeeping in the master, which makes a decision for each task and keeps about one byte of state for each pair of a map and a reduce task, which bounds how far M and R can go.

## Stragglers and Backup Tasks

A slow machine is as bad for a job as a dead one, and harder to see. A disk with correctable errors can fall from 30 MB a second to 1, a neighbor job can steal the CPU, and one real bug turned off the processor caches and made computations over a hundred times slower.

The job is finished when its last task is, so one slow machine sets the time of the whole job.

The remedy is simple. When a job is close to completion, the master starts backup copies of the tasks still running, and the first copy to finish counts. The mechanism is tuned to add no more than a few percent of resources.

We simulated it. 20,000 tasks of about a minute each on 200 workers, with 2 percent of the workers running slower:

| Slow Workers | Time Without Backups | Time With Backups | Extra Work From Backups |
| --- | --- | --- | --- |
| None | 6,186 s | 6,178 s | 0.5% |
| 2%, 10 Times Slower | 6,832 s | 6,333 s | Near 0% |
| 2%, 100 Times Slower | 11,466 s | 6,435 s | 4.1% |

Four slow machines out of 200 almost doubled the job without backups, and the backups brought it back within 4 percent of the healthy time for 4 percent more work. The original measurement told a similar story: a sort took 44 percent longer with backups switched off.

The design shows a general rule for any tail: spend a little extra work to hedge the slowest few at the end, the same instinct as the hedged requests of [Timeouts, Retries and Backoff](/system-design/timeouts-retries).

## Moving Less Data

The shuffle is the expensive step, because each map task sends data to each reduce task. Two refinements cut it, and one decides where it goes.

A **combiner** is an optional function that merges the output of one map task before it leaves the machine. When the reduce is a sum, or any operation that is the same in any order and grouping, the map worker can add its own counts first.

For word counts under a skewed distribution, a map task emits thousands of pairs for the word "the", which could be one pair.

We measured it on a Zipf distributed vocabulary: 1 million words from a vocabulary of 50,000, split over 100 map tasks. Without a combiner, 1,000,000 records crossed the network, and with one, 393,204 did, a reduction of 2.5 times.

The gain grows with the skew and with the size of each map task, and it is zero when each key appears once.

The partitioning function can be replaced too. The default hash spreads keys evenly, and a custom function can put related keys in one file, for example the URLs from one host through a hash of the host name.

And within a partition, keys arrive in sorted order, which makes it easy to produce sorted output files that support lookups by key.

## What It Gave Up

The model is rigid on purpose, and the costs show up quickly. A job reads its input from disk and writes its output to disk, and a pipeline of several jobs writes and reads the intermediate results between them, which is slow for work that iterates, such as graph algorithms and machine learning.

A reduce can't start until its data has arrived from the maps, so a job is bounded by its slowest stage.

A single master is a single point of failure, accepted for the sake of simplicity. And a model with two steps pushes a join or a multi stage computation into several jobs chained by hand.

Those limits are what the next systems answered. [Spark](/system-design/spark) keeps data in memory between steps and tracks how to rebuild it, and [Dataflow](/system-design/dataflow) generalizes the two steps to a graph and joins batch and streaming. The core of MapReduce, small deterministic tasks that can be rerun, and a runtime that hides the machines, survived in both.

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Search Counts per Book | Map to book and 1 for each log line, combine on the map side, reduce by sum |
| Task Size | Splits of 64 MB, so a 4 TB log is about 65,000 map tasks on 200 workers |
| Slow Machines | Backup copies of the last 1 percent of tasks |
| Failures | Tasks that write to temporary files and commit by an atomic rename |
| Joins With Listing Data | A second job, or a modern engine that supports joins directly |
| Small Data | Skip it: a single server handles a few gigabytes without a cluster |

## Pitfalls

- **A map that isn't deterministic**: two executions of one task disagree, and the output is not the output of any single run
- **A few huge tasks**: a late failure repeats a large share of the work
- **No backup for the tail**: a few slow machines set the job time
- **A reducer key that is much more common than the others**: one reduce task takes most of the data
- **Side effects outside the output files**: a rerun repeats them
- **A job for a small data set**: the startup and the shuffle cost more than the work
- **Chaining many jobs for an iterative algorithm**: each step writes to disk and reads again

## Key Points

- MapReduce lets a programmer write a map and a reduce, and the runtime handles splitting, shuffling, scheduling and failures, because deterministic tasks that see one record or one key can run anywhere and run twice
- Map output goes to local disk, reduce tasks pull it, and a completed map task is redone after a failure while a completed reduce task isn't, since its output is in the file system
- <u>Many small tasks bound the cost of a failure</u>: with 2,000 workers and a failure at 90 percent of the map phase, one big task each meant an extra 100 minutes and 1,000 tasks each meant an extra 6 seconds
- Backup tasks hedge the slow tail: with 2 percent of workers 100 times slower, they cut our job from 11,466 to 6,435 seconds for 4.1 percent more work
- A combiner cut the records crossing the network by 2.5 times on skewed word counts, and the model's limits, disk between steps and one master, led to Spark and Dataflow
