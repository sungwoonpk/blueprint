> **Stream processing** computes results continuously as events arrive, instead of waiting for a complete dataset. The input has no end, so the job does not finish: it keeps its running results up to date, a count or an alert, and writes them out as they change.

The textbook app has two questions that a nightly job answers too late. Which books are trending on campus this hour, so the home page can show them? And is one seller posting 20 listings in a minute, which looks like a scam?

A [Batch Processing](/system-design/batch-processing) job could answer both tomorrow. The events are already flowing through a log as in [Logs as Message Brokers](/system-design/log-based-brokers), and a stream processor reads them and keeps the answers current.

## From Batch to Stream

Tyler Akidau, an author of Google's Dataflow model, defines a streaming system as an engine built for unbounded data, the kind that keeps arriving. He argues it can match batch on correctness, with consistent state and exactly once processing, and that its extra strength is handling time, which we reach in [Windowing and Watermarks](/system-design/windowing-watermarks).

| Question | Batch | Stream |
| --- | --- | --- |
| Input | A fixed dataset | Events with no end |
| Result | One answer when the job ends | Answers that keep updating |
| Delay | Minutes to hours | Milliseconds to seconds |
| State | Rebuilt on each run | Kept between events, and must survive failures |
| After a Crash | Run the task again | Restore the state and resume from a position |

Latency depends on the engine. Kafka Streams handles one record at a time and aims for millisecond latency.

Spark's Structured Streaming runs small batch jobs, and its documentation gives end to end latency as low as about 100 ms with exactly once guarantees, or as low as about 1 ms in its continuous mode, which promises at least once.

## The Shape of a Job

A streaming job is a graph of steps that read events, change them and write results. Kafka Streams calls it a topology: a source reads from topics, processors in the middle do the work, and a sink writes to another topic or an outside system.

<figure class="diagram">
<div class="flow">
<div class="node">Source<small>topic</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Filter and Map<small>no memory</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Aggregate<small>keeps state</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Sink<small>topic or table</small></div>
</div>
<figcaption>Events enter at the source, and stateful steps remember what came before</figcaption>
</figure>

The steps differ in what they remember:

- **Stateless**: Filtering the views of one course, or adding a field to each event. Each event is handled alone, so a restart loses no state
- **Stateful**: Counting views for each course, joining a view with the listing it refers to, or detecting 20 posts in a minute. The step needs memory of past events, and that memory is the hard part of the topic

## Streams and Tables

Kafka's documentation describes a useful view of this: a stream and a table are two forms of the same thing. Counting views for each course turns a stream of events into a table with a row for each course, and each new event changes one row.

| Event in the Stream | Row Changed in the Table |
| --- | --- |
| View of CS101 | CS101 = 1 |
| View of MATH201 | MATH201 = 1 |
| View of CS101 | CS101 = 2 |

Read the right column as its own stream, and it is the changelog of the table. That is the same idea as [Change Data Capture](/system-design/cdc): a table's changes form a stream, and replaying a stream rebuilds the table.

The documentation adds that an aggregation produces a table, so that a late event can update a result already emitted, and the new value replaces the old one.

## Keeping State

State has to be fast, since each event touches it, and safe, since a machine can die. The engines do both by keeping state beside the code and saving it elsewhere.

- **Kafka Streams**: Each task keeps a local state store, a key-value store or an in memory map, and logs each update to a changelog topic in Kafka. Log compaction keeps that topic from growing without end. After a failure the task moves to another instance and replays the changelog to restore its store. An optional standby replica keeps a copy ready, which shortens recovery
- **Flink**: Keyed state lives in an embedded store partitioned with the stream by key, so an operator touches just the state of the current event's key. Snapshots of that state are written to durable storage
- **Spark**: Aggregates and join buffers live in state stores, and a checkpoint location in fault tolerant storage holds the progress of each trigger and the state

Splitting by key is what lets the work spread. As in [Partitions, Ordering and Consumer Groups](/system-design/ordering), each key lives on one partition, so one task owns its state.

Kafka Streams creates a fixed number of tasks from the input partitions: with 5 partitions, up to 5 instances work, and extra instances stay idle until one fails. A hot key, such as a popular course, still lands on one task.

## Surviving a Crash

When a processor crashes, it must come back with its state and its position in the input agreeing with each other. If they disagree, the results are wrong. We simulated 1,000,000 view events counted for each of 50 courses, with 3 crashes at random points and a save after each 1,000 events:

| Design | Counted | Error |
| --- | --- | --- |
| State in Memory, Position Saved | 294,000 | 706,000 events lost |
| State Saved on Each Event, Position Saved Later | 1,002,306 | 2,306 events counted twice |
| State and Position Saved Together | 1,000,000 | 0 |

In the first design, a crash lost the counts but kept the position, so the restart didn't replay the events that the lost counts came from. In the second, the state was ahead of the position, so the events between the last saved position and the crash were counted again. The third keeps them together.

That is what a **checkpoint** is: a consistent snapshot of the state together with the input position. Flink injects markers called barriers at the sources, which flow along with the records.

An operator saves its state when a barrier reaches it, and after a failure the job restores the latest completed checkpoint and replays input from the recorded positions. Kafka Streams reaches the same result by committing the input offsets, the state updates and the output records in one atomic step, using Kafka transactions.

## Exactly Once, and Where It Stops

The guarantee is a setting and not a given. Kafka Streams defaults to at least once, and exactly once is turned on with `processing.guarantee` set to `exactly_once_v2`, which needs brokers of version 2.5 or newer.

Its documentation is careful about the limits: the guarantee holds for the input topics, the state stores and the output topics, because they take part in one transaction.

Writing to an outside system, such as sending an email or updating a database, is beyond it. Spark states the general rule: replayable sources plus idempotent sinks give end to end exactly once.

The techniques of [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees) and [Idempotency and Safe Retries](/system-design/idempotency) apply at the edge, such as an idempotency key on each email.

## When the Stream Falls Behind

If events arrive faster than the job can process them, the lag grows, and the state may fall behind real life. The remedies are in [Backpressure](/system-design/backpressure): add partitions and instances, so that more tasks share the work, and watch consumer lag as the main health signal.

An alert that fires 10 minutes late is worth little, so the lag has to be monitored, as it is for any consumer of a log.

## When to Use It

Use a stream when the answer loses value with age: an alert, a recommendation that should reflect the last few minutes, a dashboard, a cache or search index that has to follow the database.

Use batch when a delay of hours is fine and the logic needs the full history at once, since batch is simpler to run, to test and to correct.

Kafka's documentation notes that teams who can't accept any loss or duplicates have often added a batch pipeline beside the stream, an arrangement called the Lambda architecture. Engines that offer exactly once can make that duplication less necessary, and many systems still keep a nightly batch to recompute the numbers from the raw events.

In the textbook app, the trending list and the scam alert are streams, and the nightly price suggestions stay batch.

## Key Points

- Stream processing keeps results continuously current over events that keep coming, where batch gives one answer when a fixed dataset has been read
- A job is a graph of stateless steps and stateful steps, and aggregating a stream gives a table whose changes are a stream again
- State is split by key and saved elsewhere: a changelog topic in Kafka Streams, snapshots in Flink and a checkpoint location in Spark
- <u>A checkpoint saves the state together with the input position</u>, and our simulation lost 706,000 events or counted 2,306 twice without that
- Exactly once is a setting that covers the stream engine and its log, so outside systems still need idempotent writes, and lag is the number to watch

