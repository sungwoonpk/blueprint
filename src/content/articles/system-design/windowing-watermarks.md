> A **window** groups events into finite buckets of time so that a stream can be counted or averaged. A **watermark** is the engine's running estimate of how far event time has progressed, and it decides when a window is complete and its result can be emitted.

A [Stream Processing](/system-design/stream-processing) job does not see the end of its input, so a question such as "how many views did each book get?" has no answer until the question is bounded. The textbook app's trending list asks a bounded version: views in each course during the last minute. Two things have to be decided.

Which clock says that a view belongs to this minute? And how long should the job wait for the stragglers of a minute before it reports?

## Two Clocks

Each event has two times. The **event time** is when it happened, such as when the student tapped the book on the phone. The **processing time** is when the job sees it. Kafka's documentation notes that the gap can be milliseconds in a real time pipeline and hours or days in a batch one.

The gap is not constant. Tyler Akidau, in his explanation of streaming systems, lists causes such as network congestion and a plane full of phones coming back online after airplane mode.

We simulated an hour of 1,000,000 views, with 93 percent arriving within 2 seconds, 6.5 percent delayed by about a minute on average, and 0.5 percent delayed by 2 to 10 minutes.

These delays are assumptions of ours, in the spirit of phones on weak connections. If the job puts each view in the 1 minute window in which it arrived, 6.2 percent of the views land in the wrong window.

For a trending list that is a nuisance. For billing it would be an error. Event time windows put each view where it happened, and they pay for it by waiting.

## Window Types

A window has a size, and sometimes a slide or a gap:

| Window | Defined By | An Event Falls In | Textbook App Example |
| --- | --- | --- | --- |
| Tumbling | A size | One window | Views for each minute |
| Sliding | A size and a slide | Size divided by slide windows | Views in the last 10 minutes, updated each minute |
| Session | A gap of silence | One window, which can grow and merge | One browsing visit of a student |

<figure class="chart">
<svg viewBox="0 0 420 262" role="img" aria-label="Three window types on a timeline from 0 to 8 minutes. Tumbling windows are four back to back blocks of 2 minutes. Sliding windows are 4 minutes long, start at 2 minute steps and overlap. Session windows wrap bursts of events and end after a 1 minute gap." style="width:100%;max-width:380px;height:auto;display:block;margin:0 auto">
<g font-size="12" style="fill:var(--text)" font-weight="600"><text x="20" y="16">Tumbling: 2 Minutes</text><text x="20" y="84">Sliding: 4 Minutes, Slide 2</text><text x="20" y="170">Session: Gap of 1 Minute</text></g>
<rect x="22.0" y="24" width="91" height="30" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<rect x="117.0" y="24" width="91" height="30" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<rect x="212.0" y="24" width="91" height="30" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<rect x="307.0" y="24" width="91" height="30" rx="4" style="fill:var(--surface);stroke:var(--border)" stroke-width="1.5"/>
<g font-size="11" style="fill:var(--muted)" text-anchor="middle"><text x="67.5" y="43">0 to 2</text><text x="162.5" y="43">2 to 4</text><text x="257.5" y="43">4 to 6</text><text x="352.5" y="43">6 to 8</text></g>
<rect x="20.0" y="92" width="190.0" height="16" rx="3" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)" stroke-width="1.5"/>
<rect x="115.0" y="114" width="190.0" height="16" rx="3" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)" stroke-width="1.5"/>
<rect x="210.0" y="136" width="190.0" height="16" rx="3" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)" stroke-width="1.5"/>
<g font-size="11" style="fill:var(--muted)"><text x="26.0" y="104">0 to 4</text><text x="121.0" y="126">2 to 6</text><text x="216.0" y="148">4 to 8</text></g>
<rect x="34.2" y="180" width="90.3" height="34" rx="4" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)" stroke-width="1.5"/>
<rect x="210.0" y="180" width="66.5" height="34" rx="4" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)" stroke-width="1.5"/>
<rect x="362.0" y="180" width="47.5" height="34" rx="4" style="fill:var(--accent);fill-opacity:.16;stroke:var(--accent)" stroke-width="1.5"/>
<circle cx="34.2" cy="197" r="4" style="fill:var(--accent)"/>
<circle cx="58.0" cy="197" r="4" style="fill:var(--accent)"/>
<circle cx="77.0" cy="197" r="4" style="fill:var(--accent)"/>
<circle cx="210.0" cy="197" r="4" style="fill:var(--accent)"/>
<circle cx="229.0" cy="197" r="4" style="fill:var(--accent)"/>
<circle cx="362.0" cy="197" r="4" style="fill:var(--accent)"/>
<line x1="20" y1="232" x2="410" y2="232" style="stroke:var(--border)" stroke-width="1.5"/>
<g font-size="11" style="fill:var(--muted)" text-anchor="middle"><text x="20.0" y="250">0</text><text x="115.0" y="250">2</text><text x="210.0" y="250">4</text><text x="305.0" y="250">6</text><text x="396.0" y="250">8 min</text></g>
</svg>
<figcaption>Tumbling windows sit back to back, sliding windows overlap, and session windows wrap bursts of events</figcaption>
</figure>

The sources show the same shapes with their own numbers. Flink's documentation uses 5 minute tumbling windows, and Spark's guide uses 10 minute windows with a 5 minute slide, so each event falls into two.

Azure Stream Analytics aligns windows to the zero hour, so a 5 minute tumbling window covers 12:00 to 12:05, and it caps window size at 7 days. Its session windows take a timeout and a maximum duration, so a burst that keeps going is still cut.

The window is also tracked for each key. A minute of views for CS101 and a minute for MATH201 are separate windows, as Kafka Streams says, and they close at different times if their events arrive at different times.

## When Is a Window Done?

The window for 09:00 to 09:01 can't close at 09:01, since views from 09:00:58 may still be on their way. The job needs a signal that event time has progressed far enough. That signal is the watermark.

The Dataflow paper from Google describes it as a lower bound on the event times the system has processed, often set by a heuristic, since a system can seldom know what a phone in a tunnel will send later.

The common rule is a bounded delay: the watermark is the largest event time seen so far, minus a delay you choose. Flink, Spark and Azure Stream Analytics each describe it that way. In Flink it looks like this:

```java
WatermarkStrategy
    .<View>forBoundedOutOfOrderness(Duration.ofSeconds(30))
    .withTimestampAssigner((view, ts) -> view.viewedAtMillis());
```

When the watermark passes the end of a window, the window is complete: its result is emitted and its state can be dropped. A view that arrives after that is **late**.

## The Delay Is a Trade

A longer delay catches more stragglers and makes each result later. In the same simulation, with 1 minute windows, we tried five delays:

| Watermark Delay | Late Views Dropped | Result Comes After the Window Ends |
| --- | --- | --- |
| 0 seconds | 5.91% | 0 seconds |
| 5 seconds | 4.23% | 5 seconds |
| 30 seconds | 2.94% | 30 seconds |
| 2 minutes | 0.97% | 2 minutes |
| 10 minutes | 0.00% | 10 minutes |

The first seconds of delay buy little, since most of the lateness is in the long tail. Getting from 4 percent to 1 percent costs minutes, and the last bit costs ten minutes. There is no free setting.

Choose the delay from the question: a trending list can tolerate 3 percent missing and wants an answer in seconds, while a daily revenue report can wait for the stragglers. Measure the real distribution of lateness before choosing, and keep counting the late events afterwards.

## What to Do With Late Events

Engines offer a few answers, which can be combined:

- **Drop them**: The simplest. Kafka Streams calls the wait a grace period, and discards a record whose window ended more than the grace period before the current stream time. Flink's allowed lateness is zero by default, so late events are dropped
- **Update the result**: Flink keeps a window for an allowed lateness after the watermark passes its end, so late events fire it again with a corrected result. Its example is 5 minute windows with 1 minute of lateness, where the 12:00 to 12:05 window is removed once the watermark passes 12:06. Downstream consumers then see two results for one window and must replace the first
- **Divert them**: Flink can send late events to a side output, a separate stream, so they can be counted, logged or fixed by a later batch job
- **Adjust them**: Azure Stream Analytics can drop late events or move their timestamp up to the watermark, which keeps the data and gives up exact timing. Its late arrival tolerance defaults to 5 seconds

## Early, On Time and Late Results

The Dataflow paper adds a warning: a watermark is sometimes too fast, so late data shows up behind it, and sometimes too slow, since a single slow event can hold back the progress of the whole pipeline.

Baseline lateness can be several minutes, so waiting for the watermark alone can give results later than a design that sends quick estimates and corrects them afterwards.

Its answer is triggers, which decide when to emit, separately from the watermark. A window can fire early with a speculative result, again at the watermark, and again for each late event. A refinement mode says how those results relate:

- **Discarding**: Each result covers the events since the last one, which suits a consumer that adds them up
- **Accumulating**: Each result covers everything so far and replaces the previous one, which suits a consumer that overwrites a value
- **Accumulating and retracting**: Each result comes with a retraction of the previous one, which suits a consumer that aggregates further downstream

Engines differ on this. Azure Stream Analytics says its output follows the watermark alone, with no partial or revised results, so the engine's model decides which designs are possible.

## An Idle Input Stalls the Clock

A job with many inputs, such as partitions, uses the smallest watermark among them. If one partition has no events, its clock doesn't move, and no window closes anywhere.

Flink's documentation describes this and offers an idleness setting: an input silent for a set time, 1 minute in its example, stops holding the others back. Kafka Streams has a similar property, since its stream time moves when a record arrives.

Azure's version is that when an input is idle, the watermark follows the estimated arrival time minus the late arrival tolerance. A quiet partition at 3:00 AM is normal, so a job should have a plan for it.

## Choosing and Checking

The decisions pull together as a short list:

- **Window type**: Match the question: fixed periods for reports, sliding windows for moving averages, sessions for visits
- **Clock**: Use event time when the result must describe when things happened, and processing time when a rough answer now is enough
- **Delay**: Pick it from the measured lateness and the cost of a late answer
- **Late events**: Choose between drop, update and divert, and count what falls out
- **State**: Each open window holds state until the watermark passes its end plus any lateness, so long windows and long delays cost memory

This completes the data processing group of the asynchronous processing phase: batch for complete data on a schedule, streams for events as they happen, and windows and watermarks to reconcile the stream with the clock.

## Key Points

- Windows turn a stream into finite buckets, as tumbling, sliding or session windows, tracked for each key
- Event time says when something happened and processing time says when the job saw it, and in our simulation 6.2 percent of views landed in the wrong window by processing time
- A watermark estimates event time progress, usually as the largest time seen minus a chosen delay, and a window closes when it passes the window's end
- <u>The watermark delay trades lost late events for waiting</u>: in our run 5.91 percent were dropped with no delay and none with 10 minutes
- Late events can be dropped, used to update results, diverted to a side output or adjusted, and an idle input can stall the whole job unless it is marked idle
