> **Spark** is a cluster computing engine built on one idea, the **resilient distributed dataset**, or RDD: an immutable collection of records split into partitions across machines, which remembers how it was computed. Because it keeps the recipe, called its lineage, a lost partition is rebuilt by running the recipe again, and datasets can sit in memory between steps without replication.

[MapReduce](/system-design/mapreduce) made the textbook app's yearly report easy to write, and slow in one specific way. The data team now wants to fit a model that predicts which listings will sell. The method repeats the same pass over the 100 GB of training data 30 times, each pass improving the answer a little.

In MapReduce each pass is a separate job. Each job starts up its tasks, reads 100 GB from disk, parses the text, does a little arithmetic, and writes its result.

Then the next job does the same, with the same input. Most of the time goes to reading and parsing the same bytes again, and little to the thinking.

The fix is obvious, and hard: keep the data in memory between passes. The hard part is failure. A machine that holds a piece of the dataset in memory can die, and memory holds no copy.

Spark's answer, from a 2012 paper, is to give up the freedom to change data in place, and in return get cheap recovery.

This topic explains the abstraction, the two kinds of dependency that decide how work is scheduled and recovered, and puts numbers on the benefit with a model of our own. It builds on [MapReduce](/system-design/mapreduce) and [GFS and HDFS](/system-design/gfs-hdfs), and leads into [Dataflow](/system-design/dataflow).

## Datasets That Remember How They Were Made

An RDD is created in two ways: by reading data from stable storage, or by applying a deterministic operation to another RDD. Those operations are **transformations**, such as filter, map and join.

A transformation doesn't run when it is called. It just records a step, and the result is a new RDD that points at its parent.

Work happens when a program asks for an answer. An **action**, such as count, collect or save, returns a value or writes data out, and it triggers the computation of what it needs.

This laziness lets Spark see a chain of transformations before running it, and run them together as a pipeline, each record flowing through the steps with no intermediate copy.

The textbook app's log mining shows the style. An operator loads the logs, keeps the lines that are errors, and asks Spark to hold them in memory:

```text
lines  = read("hdfs://logs")
errors = lines.filter(is_error)
errors.persist()

errors.count()
errors.filter(mentions("checkout")).count()
errors.filter(mentions("search")).map(time_field).collect()
```

Nothing runs until the first count. After it, the error lines sit in memory across the cluster, and the later queries scan memory instead of the logs. The base dataset, `lines`, isn't loaded in full, which is just as well, since the errors are a small slice of it.

The chain of steps from `lines` to the final answer is the **lineage graph**. It is the whole fault tolerance story. If a partition of `errors` is lost with a machine, Spark recomputes it by applying the filter to the one matching partition of `lines`, and to no other.

There is no replica to restore and no checkpoint to roll back to. A useful consequence follows: a program can't refer to a dataset that it couldn't rebuild after a failure.

## Why Not Just Share Memory

The general tool for data in memory across machines is distributed shared memory: programs read and write any cell, anywhere. A key value store or a database in memory is the same kind of thing.

It is flexible, and flexibility makes failure expensive. To survive a loss, a system must either replicate each update to other machines, or log each update, and both copy huge amounts of data over a network that is far slower than memory.

The RDD makes a trade. Its writes are coarse: a transformation applies one operation to many records, so a log of the operations is tiny compared with the data. Its reads can be fine, and an immutable dataset can serve as a lookup table.

In return, RDDs give up fine grained updates, and the paper says so directly: they suit batch work that applies the same operation to a whole dataset, and they are a poor fit for a storage system behind a web app or a crawler that updates one record at a time. For those, a database is the tool.

Immutability pays in other places too. Two copies of a slow task can run without interfering, so the backup tasks of MapReduce work here as well. And partitions that don't fit in memory spill to disk and the program slows down gracefully to the speed of a disk based system, and doesn't fall over.

## Narrow and Wide

The scheduler needs to know how the partitions of one dataset depend on the partitions of its parent, and Spark sorts the dependencies into two kinds.

In a **narrow dependency**, each partition of the parent is used by at most one partition of the child. A map or a filter is narrow: output partition 7 needs just input partition 7.

In a **wide dependency**, a child partition may depend on many parents, as when grouping by key or joining two datasets that aren't partitioned alike: the records of one key could sit in any parent partition, so data must be shuffled across machines in a MapReduce style step.

The difference decides two things. For execution, narrow dependencies pipeline: one machine can run a map, then a filter, then another map over one partition, record by record, with no network.

A wide dependency is a barrier, because the shuffle needs the parent data to be ready. Spark cuts the lineage graph into **stages** at the wide dependencies, and each stage is a set of tasks that can run as a pipeline.

For recovery, a narrow dependency is cheap: just the lost parent partitions need to be recomputed, and in parallel on different machines. With a wide one, a single failed node can lose a partition from each parent, so recovery is a bigger, more tangled job.

That is the reason to persist datasets right after a wide step, and the reason a program can control how a dataset is partitioned. If two datasets are partitioned by the same key in the same way, a join between them is narrow and needs no shuffle.

## How Much Memory Buys

The benefit is easiest to see on an iterative job. We built a simple cost model for the textbook app's training run: 100 GB of data on 100 workers, so 1 GB each.

A worker reads a disk at 100 MB a second and a memory at 2 GB a second, parsing the text takes 8 seconds, the arithmetic of one pass takes 2 seconds, and starting a MapReduce job costs 15 seconds. All of these numbers are our assumptions.

A MapReduce style job pays startup, a disk read, parsing and computing on each pass, 35 seconds. A cached Spark job pays the disk read and the parsing once, in the first pass, 20 seconds, and after that scans parsed data in memory and computes, 2.5 seconds a pass:

| Passes | Job at a Time, Reading Again | Cached in Memory | Speedup |
| --- | --- | --- | --- |
| 1 | 35 s | 20 s | 1.8 times |
| 10 | 350 s | 42.5 s | 8.2 times |
| 30 | 1,050 s | 92.5 s | 11.4 times |
| 100 | 3,500 s | 267.5 s | 13.1 times |

<figure class="chart">
<div class="hbars" role="img" aria-label="Time for 30 passes with and without caching in memory">
<div class="hbar peak"><span>Reading Each Pass Again</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">1,050 s</span></div>
<div class="hbar"><span>Cached in Memory</span><span class="track"><span class="fill" style="--w: 8.8%"></span></span><span class="value">92.5 s</span></div>
</div>
<figcaption>Time for 30 passes over 100 GB, from our cost model</figcaption>
</figure>

The first pass is no faster by much, and each later pass is cheap, so the gain grows with the number of passes and approaches the ratio of the two per pass costs.

The published measurements point the same way: Spark ran up to 20 times faster than Hadoop on iterative machine learning and graph jobs, answered interactive queries on 1 TB in 5 to 7 seconds, and the first iteration was moderately faster, because it had to read the disk too.

The authors were also surprised that even a Hadoop that kept binary data in memory lost by a wide margin, since much of the time went to startup and to converting stored bytes into objects, which caching parsed objects avoids.

## Recovery by Recipe

Failure handling follows from the lineage, and the cost of the alternatives is worth computing. Take the same job, 100 passes of 10 seconds each, with the state of 100 GB spread over 100 workers, and a worker that dies.

With lineage, the lost partitions are 1 percent of the state. They are recomputed by replaying the steps since the last persisted data, spread over the 99 surviving workers, and a failure late in the job costs about 1 percent of the elapsed time again, around 5 seconds for a failure halfway through the passes.

With a general checkpoint, each snapshot writes 100 GB to replicated storage. At an aggregate 1 GB a second, that is 100 seconds a snapshot.

Checkpointing at 10 pass intervals adds 1,000 seconds to a job that takes 1,000, and the system has to roll the whole program back to the last snapshot on failure, not just the lost piece.

Lineage doesn't make checkpoints useless. A lineage graph grows with each iteration, so a very long chain with wide dependencies can take a long time to replay, and Spark lets a program checkpoint chosen datasets. Because the data is immutable, the snapshot can be taken in the background without pausing the program.

## What Spark Is Not

Spark is a batch engine first, and the abstraction has edges. It suits operations that apply to the whole dataset, and it doesn't suit one record updates. Keeping data in memory needs the memory: if the working set doesn't fit, the job spills to disk and runs at disk speed.

And lineage depends on determinism, because a recomputed partition has to equal the lost one, so a step that draws random numbers or reads the clock must be made repeatable.

Later versions grew into a platform with SQL, a structured data model, and streaming built on small batches, and those pieces rely on the same lineage idea. Where the computation is a stream and not a batch, [Stream Processing](/system-design/stream-processing) covers the different set of trade offs, and [Dataflow](/system-design/dataflow) is the next step on that road.

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Model Training | Cache the parsed training set in memory and run the 30 passes over it |
| Log Mining | Persist the error lines after the first filter, and query them interactively |
| Joins | Partition both datasets by the listing id, so the join is narrow |
| Recovery | Rely on lineage, and checkpoint a dataset when its chain grows long |
| Memory Planning | Check that the working set fits, or accept disk speed for the overflow |
| One Record Updates | Stay in the database, since an RDD can't be changed in place |

## Pitfalls

- **Using it for one pass over the data**: The first pass is barely faster than a plain job
- **Not persisting a dataset used twice**: Each action recomputes it from the source
- **A wide step in each iteration without partitioning**: A shuffle on each pass
- **A long lineage with no checkpoint**: Recovery replays the whole chain
- **Steps that are not deterministic**: A rebuilt partition differs from the lost one
- **A working set larger than memory**: The speedup vanishes
- **Updating one record at a time**: An RDD can't be changed in place

## Key Points

- An RDD is an immutable partitioned dataset that remembers its lineage, the steps from stable storage, so a lost partition is rebuilt by recomputing just that partition
- Transformations are lazy and actions run them, which lets Spark pipeline narrow steps and cut the graph into stages at wide dependencies, where a shuffle is needed
- <u>Caching pays most when data is reused</u>: in our cost model 30 passes took 1,050 seconds when each pass read again the data and 92.5 seconds with the parsed data in memory, and a single pass gained little
- Recovery by lineage replays about 1 percent of the work after one worker in 100 dies, while a general checkpoint of 100 GB cost 100 seconds each time in our arithmetic
- RDDs give up fine grained updates, so they fit batch analytics and iterative jobs and not a database behind a web app
