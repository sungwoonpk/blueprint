> **Observability** is the ability to understand what a running system is doing, and why, from the outside, by asking it questions that you didn't plan in advance. Its raw material is telemetry in three forms: **logs**, records of events, **metrics**, numbers aggregated over time, and **traces**, the path of one request through many services.

The textbook app has been designed, sharded and replicated across five phases. Now it has to be run. At 9:00 AM on registration day, the listing page slows down, and the question is which of 6 web servers, 3 caches, a database and a payment provider is responsible.

A system of that size can't be debugged by logging into machines one at a time. As [Why Distributed Systems Are Hard](/system-design/why-distributed-is-hard) said, no one machine has the whole picture, so the system has to report on itself.

## Three Signals, Three Questions

The OpenTelemetry project describes the three signals this way. Each answers a different kind of question, and each has a cost:

| Signal | What It Is | Answers | Weak At |
| --- | --- | --- | --- |
| Metrics | Numbers aggregated over a period, such as an error rate | Is something wrong, and how much | Explaining why |
| Traces | The spans of one request across services | Where in the path the time went | Volume, so they are sampled |
| Logs | Timestamped records of events | Why, in detail | Searching and cost at scale |

A good investigation uses them in that order. A metric raises the alarm, a trace points at the slow step, and logs explain what happened there. Google's SRE book makes the related point that monitoring should answer both what is broken, the symptom, and why, the cause, and that most effort should go to symptoms.

## Metrics

Metrics are cheap, because a counter takes a few nanoseconds to increment, and they are the base for dashboards and alerts. Prometheus, the most widely used open source system, defines four types:

- **Counter**: A value that goes up, such as requests served, and resets when the process restarts
- **Gauge**: A value that goes up and down, such as concurrent requests or queue length
- **Histogram**: Counts of observations in buckets, plus a sum, which lets the server compute quantiles later
- **Summary**: Quantiles computed in the client over a sliding window

Its naming advice is practical: use base units such as seconds and bytes, end counters with `_total`, put the unit in the name, as in `http_request_duration_seconds`, and use labels for what distinguishes a series, such as the route or the status code.

### Cardinality

Each combination of label values is a separate time series. Prometheus says to try to keep the cardinality of a metric below 10, to rethink any that exceeds 100, and not to use labels for values such as user ids.

We counted the series for one counter in the textbook app, with 20 routes, 5 status codes and 6 servers:

| Labels Added | Series |
| --- | --- |
| Route, Status and Server | 600 |
| Plus User ID, 2,000 Users | 1,200,000 |
| Plus Listing ID, 3 Million Listings | 1,800,000,000 |

OpenTelemetry's SDK guards against this with a default limit of 2,000 attribute combinations for each metric stream, and folds the overflow into a single point. High cardinality belongs in logs and traces, which are built to carry it.

### Averages Hide the Tail

A warning: a mean of 100 ms at 1,000 requests a second can hide 1 percent of requests that take about 5 seconds. We built a distribution like that. Of 1 million requests, 99 percent were around 40 ms, and 1 percent took 3 to 8 seconds:

| Measure | Value |
| --- | --- |
| Mean | 98 ms |
| Median | 40 ms |
| 95th Percentile | 80 ms |
| 99th Percentile | 3,010 ms |
| 99.9th Percentile | 7,484 ms |

The mean looks acceptable, and one request in a hundred waits 3 seconds. Fan out makes it worse, as in the tail latency numbers from the distributed systems phase: a page that makes 10 calls hits a slow one 9.6 percent of the time, and a page with 100 calls hits one 63.5 percent of the time.

So record histograms. Bucket boundaries that grow by a factor of about 3 work well, such as 0 to 10 ms, 10 to 30, 30 to 100 and 100 to 300. A quantile estimated from buckets is as precise as the bucket is narrow.

With those buckets, our median came out as 55 ms against a true 40 ms, the 99th percentile as 3,011 against 3,010, and the 99.9th as 9,301 against 7,484. Prometheus adds that averaging precomputed quantiles across instances is statistically meaningless, and quantiles should be computed from summed buckets.

### The Four Golden Signals

If you have room to watch four things, these are the four:

- **Latency**: The time to serve a request, with successful and failed requests measured apart, since a fast error can hide a slow problem
- **Traffic**: The demand on the system, such as requests a second
- **Errors**: Explicit ones such as HTTP 500, implicit ones such as a wrong answer with a 200, and policy ones such as a response slower than the budget
- **Saturation**: How full the most constrained resource is, where a rising 99th percentile latency is an early sign

## Logs

A log is the detailed record that a metric can't hold. The AWS Builders' Library gives the pattern that works at scale: write one structured entry for each unit of work, an HTTP request or a queue message, and not several loose lines.

The entry carries the input parameters, who called, counters, timers, and the latency and result of each dependency call:

```json
{
  "time": "2026-11-16T09:00:04.212Z",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "route": "POST /buy",
  "status": 200,
  "buyer_id": 8,
  "listing_id": 17,
  "total_ms": 420,
  "calls": { "listings_ms": 80, "wallet_ms": 300, "queue_ms": 16 }
}
```

Several habits in the article are worth copying. Record the request early, before validation or throttling can reject it, and sanitize the input, since a 1 MB string in a field can break a log pipeline.

Time successful responses separately, because fast rejections skew a general latency number. Keep debug output in separate files from request entries, and keep logs on their own disk partition so a full disk doesn't take down the service.

Cost is the catch. The article judges logging each request worth the expense, noting that DynamoDB logs each request at over 20 million requests a second of internal traffic, and for services with more traffic than that budget it suggests sampling, such as writing one entry in N and recording how many were skipped, or keeping errors and slow requests first.

The SRE book's advice on logs agrees: several verbosity levels that can be raised at runtime, sampling such as 1 operation in 1,000 for high volume, and a unique request id passed across calls so that entries from different components can be joined.

The backend matters too. Grafana Loki turns each combination of labels into a stream, with a default limit of 15 index labels, and warns against putting timestamps, trace ids or order ids in labels. Those go in the log body or in structured metadata.

## Traces

A trace follows one request. Google's Dapper paper, from 2010, introduced the model now used everywhere: a trace is a tree of **spans**, each a unit of work with a name, a span id, a parent id, start and end times, and optional annotations.

A span without a parent is the root, and the spans of a trace share one trace id. OpenTelemetry's spans add attributes, events, links to causally related spans, a kind such as client or server, and a status.

<figure class="chart">
<svg viewBox="0 0 420 190" role="img" aria-label="A trace waterfall for one purchase request. The web span lasts 420 ms. Inside it the listings reserve call takes 80 ms, the wallet charge takes 300 ms with a database update of 260 ms inside it, and the queue send takes 16 ms." style="width:100%;max-width:380px;height:auto;display:block;margin:0 auto">
<text x="4" y="22" font-size="11" style="fill:var(--text)">web: POST /buy</text>
<rect x="128.0" y="10" width="285.6" height="16" rx="3" style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="1.5"/>
<text x="134.0" y="22" font-size="10" style="fill:var(--text)">420 ms</text>
<text x="4" y="52" font-size="11" style="fill:var(--text)">listings: reserve</text>
<rect x="134.8" y="40" width="54.4" height="16" rx="3" style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="1.5"/>
<text x="193.2" y="52" font-size="10" text-anchor="start" style="fill:var(--muted)">80 ms</text>
<text x="4" y="82" font-size="11" style="fill:var(--text)">wallet: charge</text>
<rect x="196.0" y="70" width="204.0" height="16" rx="3" style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="1.5"/>
<text x="202.0" y="82" font-size="10" style="fill:var(--text)">300 ms</text>
<text x="4" y="112" font-size="11" style="fill:var(--text)">wallet: db update</text>
<rect x="209.6" y="100" width="176.8" height="16" rx="3" style="fill:var(--accent);fill-opacity:.55;stroke:var(--accent)" stroke-width="1.5"/>
<text x="215.6" y="112" font-size="10" style="fill:var(--text)">260 ms</text>
<text x="4" y="142" font-size="11" style="fill:var(--text)">queue: send receipt</text>
<rect x="401.4" y="130" width="10.9" height="16" rx="3" style="fill:var(--accent);fill-opacity:.2;stroke:var(--accent)" stroke-width="1.5"/>
<text x="398" y="142" font-size="10" text-anchor="end" style="fill:var(--muted)">16 ms</text>
<line x1="128" y1="170" x2="413.6" y2="170" style="stroke:var(--border)" stroke-width="1.5"/>
<text x="128.0" y="184" font-size="10" text-anchor="middle" style="fill:var(--muted)">0</text>
<text x="196.0" y="184" font-size="10" text-anchor="middle" style="fill:var(--muted)">100</text>
<text x="264.0" y="184" font-size="10" text-anchor="middle" style="fill:var(--muted)">200</text>
<text x="332.0" y="184" font-size="10" text-anchor="middle" style="fill:var(--muted)">300</text>
<text x="400.0" y="184" font-size="10" text-anchor="middle" style="fill:var(--muted)">400</text>
</svg>
<figcaption>One purchase request as a waterfall: the 260 ms database update sits inside the 300 ms wallet charge</figcaption>
</figure>

The waterfall shows where the 420 ms went, which no metric or single log line could. For this to work, each service has to pass the trace id along.

The W3C Trace Context standard defines a `traceparent` header with four parts, a version, a 32 character hexadecimal trace id, a 16 character parent span id and flags, whose last bit says whether the trace is sampled:

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
```

Each service reads the header, makes its own span with the given parent, and forwards a header with its own span id. The same trace id belongs in the log entry, which is how a slow span leads to the log lines about it.

### Sampling

Tracing each request costs time and storage, so traces are sampled. Dapper measured it on a web search cluster:

| Sampling | Added Average Latency |
| --- | --- |
| Each request | 16.3% |
| 1 in 2 | 9.40% |
| 1 in 4 | 6.38% |
| 1 in 8 | 4.12% |
| 1 in 16 | 2.12% |
| 1 in 1,024 | within the measurement error, minus 0.20% |

Google's first production setup sampled about 1 trace in 1,024, and the authors argue that for busy services even rates near 0.01 percent don't hinder most analyses, since a notable pattern that appears once will appear thousands of times.

Services with dozens of requests a second can trace each one. They moved to adaptive sampling that targets a number of traces a second, and Jaeger offers the same, along with a probabilistic default of 0.001 and a rate limiting sampler.

OpenTelemetry names the two approaches. **Head sampling** decides when the request starts, which is cheap, and can't know whether the request will fail.

**Tail sampling** decides after most spans have arrived, so it can keep errors and slow requests, at the cost of holding spans in memory and a harder system to run. It suggests combining them, and considering sampling at 1,000 traces a second or more, with a rate of 1 percent or lower common.

We compared them on 1 million requests with 0.2 percent errors and 1 percent slow requests:

| Strategy | Traces Stored | Error Traces Kept | Slow Traces Kept |
| --- | --- | --- | --- |
| Head, 1% | 10,008 | 1.1% | 1.0% |
| Tail, Keep Errors and Slow and 1% of the Rest | 21,835 | 100% | 100% |

Head sampling kept 23 of the 2,011 error traces, a handful of the traces that matter. Tail sampling kept the full set for about twice the storage.

## Using Them Together

For the registration day slowdown, the investigation goes like this:

| Step | Signal | What It Shows |
| --- | --- | --- |
| 1 | Metric | The 99th percentile of `POST /buy` rose from 80 ms to 3 seconds at 9:00 |
| 2 | Trace | In slow traces, the wallet charge span takes 2.8 s, mostly in its database update |
| 3 | Log | The wallet service's entries show lock waits on one hot row |
| 4 | Change History | A deploy at 8:55 changed how the row is updated |

Troubleshooting adds two habits: form a hypothesis and test it, and ask what changed last, which is why dashboards mark deployments. The next topic, [SLIs, SLOs and Error Budgets](/system-design/slo), turns the metrics into targets, and [Alerting and Dashboards](/system-design/alerting) into actions.

## Key Points

- Metrics say that something is wrong and how much, traces say where in a request the time went, and logs say why
- Mind cardinality: a counter with 600 series became 1.2 million with a user id label, so keep ids in logs and traces
- <u>Averages hide the tail</u>: our mean was 98 ms with a 99th percentile of 3,010 ms, so record histograms and watch latency, traffic, errors and saturation
- Write one structured log entry for each request, carry the trace id in it, and pass the trace context between services with the traceparent header
- Sample traces, and use tail sampling to keep errors and slow requests: in our test, head sampling at 1 percent kept 1.1 percent of error traces
