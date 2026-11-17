> **Dataflow** is a model for processing data that doesn't end and arrives out of order. It asks four questions of any pipeline: what is computed, where in event time results are grouped into windows, when in processing time results are emitted, and how later results refine earlier ones. The same program then runs as a batch job or as a stream, and the choice becomes one of latency and cost.

The textbook app now logs a view event each time a student opens a listing, 50 a second at registration time. The product team wants "views per listing in each minute", on a dashboard that moves, and they also want the final number to be right, because sellers are charged a fee that depends on it.

Two things make this harder than a nightly job. The events keep coming, so there is no moment at which the input is complete. And they don't arrive in the order they happened: a phone loses signal in a lecture hall, comes back ten minutes later, and uploads its views with their original times.

The old answer was to run two systems, a fast stream that was approximate and a nightly batch that was right, and to hope the two agreed. The Dataflow model, which Google published in 2015, took a different view.

Stop treating the data as something that will eventually be complete. Assume that new data keeps arriving and that old results may need to change, and give the programmer a way to say how much of each of correctness, latency and cost to buy.

This topic explains the vocabulary, measures the central trade off on our own simulated stream, and connects it to [Batch Processing](/system-design/batch-processing) and [Stream Processing](/system-design/stream-processing). It builds on [MapReduce](/system-design/mapreduce) and [Spark](/system-design/spark), and the logs it reads usually come from a system like [Kafka](/system-design/kafka).

## Bounded and Unbounded, Not Batch and Stream

The model changes the words first. A **bounded** data set has an end and an **unbounded** one doesn't. Batch and streaming, on the other hand, describe engines.

A batch engine can process an unbounded set by running again and again on slices, and a streaming engine can process a bounded set, so the data and the machinery are two separate choices.

That separation is the main idea. If the program is written against the data, and not against an engine, the engine can be chosen for the reasons that really differ: latency and resource cost. A batch engine waits to collect data and answers late and cheaply. A streaming engine answers early and costs more to keep running.

## Two Kinds of Time

Each event has two times. The **event time** is when it happened, and it doesn't change. The **processing time** is when the pipeline sees it, and it changes as the event moves through the system. The gap between the two is the skew, and it varies with load, outages and the state of the network.

For a count per minute, the event time is the meaningful one. A view at 12:00:59 belongs to the 12:00 minute, even if it arrives at 12:10. If the pipeline grouped by arrival time instead, the answer would depend on how the network behaved that day.

We measured how bad the shortcut is. The simulated stream is one hour of 180,000 views. Most arrive within a few seconds, with an average delay of 3 seconds, and 2 percent are delayed between 1 and 10 minutes, the phones that were offline.

If windows are cut by arrival time, 6.87 percent of the views land in a different minute from the one in which they happened. That is the error in a dashboard that reports a minute by when the data was processed, and it is larger around an outage, when a whole minute of events arrives late together.

## Windows

To compute anything over an unbounded input, the data has to be cut into finite pieces. That is **windowing**. Three shapes cover most needs.

Fixed windows, also called tumbling windows, have a set size, such as each minute, and don't overlap. Sliding windows have a size and a period, such as ten minutes long and starting each minute, so they overlap and each event belongs to several.

Session windows group the activity of one user, separated by a gap of quiet, such as 30 minutes with no events.

Sessions are the instructive case, because their boundaries come from the data. They belong to one key, so each user has windows of their own, and two windows merge when a late event bridges the gap between them.

The model treats each window as unaligned, tied to a subset of the data, and it handles the aligned case as an optimization. The program says how to assign an element to windows and how to merge windows, and the system does the rest.

## The Watermark and the Trigger

Windows raise the question of when to emit a result. The group for the 12:00 minute is finished when its events have arrived, and the system can't be sure of that. A phone in the wilderness can upload next week.

A **watermark** is the pipeline's estimate of how far event time has progressed: a claim that it is unlikely to see events with a time older than the watermark.

It is a heuristic, since a perfect one would need to know the future, and in practice it is usually computed from what has been seen, such as the newest event time minus a delay.

It helps the pipeline to decide when to emit, and it can't promise completeness. Late data, arriving behind the watermark, is a fact of life.

We tested the trade on the same stream, with the watermark set to the newest event time seen minus a delay D, and one result per window emitted when the watermark passes the end of the window. A bigger D waits longer and drops fewer events as late:

| Watermark Delay D | Events Missed by the One Result | Wait for the Result After the Window Ends |
| --- | --- | --- |
| 0 s | 6.35% | 0 s |
| 5 s | 2.79% | 5 s |
| 30 s | 1.94% | 30 s |
| 120 s | 1.57% | 120 s |
| 600 s | 0% | 600 s |

<figure class="chart">
<div class="hbars" role="img" aria-label="Share of events missed by the single on time result for five watermark delays">
<div class="hbar peak"><span>Delay 0 s</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">6.35%</span></div>
<div class="hbar"><span>Delay 5 s</span><span class="track"><span class="fill" style="--w: 43.9%"></span></span><span class="value">2.79%</span></div>
<div class="hbar"><span>Delay 30 s</span><span class="track"><span class="fill" style="--w: 30.6%"></span></span><span class="value">1.94%</span></div>
<div class="hbar"><span>Delay 120 s</span><span class="track"><span class="fill" style="--w: 24.7%"></span></span><span class="value">1.57%</span></div>
<div class="hbar"><span>Delay 600 s</span><span class="track"><span class="fill" style="--w: 0%"></span></span><span class="value">0%</span></div>
</div>
<figcaption>Share of events missed by one on time result, by watermark delay, from our simulation</figcaption>
</figure>

The curve is the lesson. The first few seconds of waiting remove more than half of the missed events, because most delays are small, and after that each extra minute buys little, until the delay covers the slowest phone in the data, ten minutes, at which point no event is missed and each result is ten minutes late.

There is no setting that gives both a fast answer and a complete one.

## Four Questions, and a Way Out

The model's answer to that trade is to stop asking for one result. A pipeline is described by four questions. What results are computed: the sum, the count, the sessions.

Where in event time they are computed: the windowing. When in processing time they are materialized: the triggers. And how earlier results relate to later refinements: the accumulation mode.

A **trigger** sets when a window emits, and a window can emit more than once.

A common plan has three firings: an early result, at intervals of a few seconds while the window is open, so a dashboard moves; an on time result when the watermark passes the end of the window; and a late result each time a straggler arrives, up to a limit on how late.

Each later firing has to say what it means. It can replace the last result, it can add the new data since the last one, or it can retract the old value and send the new one, which matters when the output feeds another aggregation downstream that would otherwise count twice.

Back to the numbers. With a watermark delay of just 5 seconds, 2.79 percent of the events arrive after their window has fired. With late firings, no event is lost: in our run, 59 of the 60 windows received late data and the pipeline refined results 5,028 times.

The dashboard is quick, the seller's fee is eventually right, and the cost is the work of updating results and the need for the consumer to accept refinements.

## What It Replaced

The earlier approach was the Lambda architecture: a streaming layer for fast approximate answers and a batch layer for exact ones, reconciled at read time. It works and it costs double. There are two codebases to keep in step, two systems to run, and answers that differ between them.

The Dataflow model says that the same logic, with windows and triggers, can serve both, with the engine chosen by the freshness and the cost that the case needs. A replay of history through the same pipeline is a batch run of the same program, and a live feed is a streaming run.

The model doesn't make hard things easy, and its authors said so: the limits of CPU, memory and disk remain. What it does is give a common language for the trade, so that a team can tune latency and correctness with settings and not with a rewrite.

## Correctness at the Edges

Processing money from this stream needs the other tools. A pipeline that retries must not count an event twice, and the usual form is exactly once effects built from replayable input and idempotent or transactional output, as in [Delivery Guarantees and Exactly Once Processing](/system-design/delivery-guarantees) and [Avoiding Duplicate Work and Double Charges](/system-design/duplicate-work).

Event time itself depends on clocks that disagree, so timestamps are assigned at the source as carefully as the source allows, as in [Physical and Logical Clocks](/system-design/clocks).

## What the Textbook App Takes From It

| Need | Decision |
| --- | --- |
| Views per Minute | Fixed windows of one minute in event time, not arrival time |
| Dashboard | An early result at 5 second intervals, so the chart moves |
| Seller Fees | A final result when the watermark passes, plus late firings for 24 hours |
| Watermark | The newest event time minus 5 seconds, and a metric for how much data is late |
| Late Results | Accumulate with retractions for the downstream sums that feed fees |
| Sessions | Session windows with a 30 minute gap, to measure how long a student browses |
| Backfill | Run the same pipeline on a month of logs as a batch |

## Pitfalls

- **Grouping by arrival time**: An outage shifts a whole minute of events into the next one
- **A watermark treated as a promise**: Late data arrives behind it
- **A single result with no late firings**: Events behind the watermark are dropped
- **A very long watermark delay**: Each result waits for the slowest phone
- **Late firings with no retraction**: A downstream sum counts a refined value twice
- **Two codebases for batch and stream**: The answers drift apart
- **Clocks that are not checked at the source**: Event times are wrong before the pipeline sees them

## Key Points

- The Dataflow model separates the data, bounded or unbounded, from the engine, batch or streaming, and asks four questions: what, where in event time, when in processing time, and how results refine
- Event time is when something happened and processing time is when it was seen: in our stream, grouping by arrival time put 6.87 percent of the views in the wrong minute
- Windows cut unbounded data into finite pieces, as fixed, sliding or session windows, and sessions are data driven and per key
- <u>A watermark is a heuristic, not a promise</u>: in our run a delay of 5 seconds missed 2.79 percent of the events with one result, and waiting long enough to miss no event meant a 600 second delay for each window
- Triggers allow early, on time and late results, so a pipeline can be fast and eventually right, at the cost of refinements that downstream steps must handle
