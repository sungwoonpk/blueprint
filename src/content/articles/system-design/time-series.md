> A **time series** is a list of measurements of the same thing taken over time, like the CPU use of one server every 10 seconds. A **time series database** is built for that data: it takes a steady stream of new points, answers questions about ranges of time, and ages out old data cheaply.

The textbook app now has 6 web servers, and each reports about 100 numbers every 10 seconds: requests, errors, response times, memory. A plain table of time, server, metric and value would work on day one.

By the end of the year it holds billions of rows, almost all of which few people will ever read. This topic is about the shape of that data, and why storing it well needs different tools than the ones in [The Relational Model](/system-design/relational-model).

## The Shape of the Data

Time series data behaves in ways a database can exploit:

- **Appended, not edited**: Points arrive in time order and are rarely updated afterwards
- **Recent data matters most**: Facebook's paper on its monitoring database, Gorilla, found that at least 85 percent of the queries to its older system were for data from the past 26 hours
- **Questions are about aggregates**: The same paper says users care little about individual points and much about trends, such as an average over five minutes
- **Old data loses value**: Last year's reading every 10 seconds is rarely needed, though a daily summary of it might be

Prometheus, the most widely used metrics system, describes a time series as a stream of timestamped values for one metric name plus a set of labels. Each sample is a number and a millisecond timestamp:

```text
http_requests_total{method="GET", route="/search", status="200"}
```

That line names one series. Change any label, or add one, and it becomes a different series.

## Cardinality: Counting Series

The cost of a time series database depends on the number of series as much as on the number of points. Prometheus's documentation warns that each unique combination of labels is a new series, and advises against labels with unbounded values such as user ids or email addresses. The reason is multiplication:

| Labels on the Request Counter | Series |
| --- | --- |
| Method (4), route (30), status (8), server (6) | 5,760 |
| The same, plus the user id (2,000 users) | 11,520,000 |

One extra label with many values turns thousands of series into millions, and each series carries its own index entry and in-memory state. The InfluxDB documentation draws the same line between tags, which are indexed and meant to be few and stable, and fields, which hold the measured values.

It adds that newer InfluxDB 3 handles very high cardinality much better than earlier versions, so check the version of the system you use. The safe habit is to keep unbounded values out of labels and in the logs or traces from [Logs, Metrics and Traces](/system-design/observability).

## Compression: Why Points Are Cheap

A point stored naively is 16 bytes: 8 for the timestamp and 8 for the value. Gorilla got an average of 1.37 bytes, a 12 times reduction, with two ideas that fit the shape of the data:

- **Timestamps**: Points usually arrive at a fixed interval, so storing the difference between timestamps, and then the difference of those differences, gives numbers that are almost always zero. Take timestamps 1000, 1060, 1120, 1181 and 1240. The gaps are 60, 60, 61 and 59, and the changes in the gaps are 0, +1 and -2. Gorilla stores a zero as a single bit, and a small number as a 2 bit prefix followed by 7 bits. The paper reports that about 96 percent of its timestamps compress to one bit
- **Values**: Neighboring values are often close or identical, so Gorilla takes the XOR of each value with the previous one. Equal values give zero, stored as a single bit, and close values leave long runs of zero bits that are cheap to store

We tried the timestamp scheme on a day of 60 second points, with a few points dropped and a share of them arriving a second early or late:

<figure class="chart">
<div class="hbars" role="img" aria-label="Average bits per timestamp: 64 raw, and about 1, 1.9 and 4.9 with delta of delta encoding at 0, 5 and 20 percent jitter">
<div class="hbar peak"><span>Raw</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">64</span></div>
<div class="hbar"><span>20% Jitter</span><span class="track"><span class="fill" style="--w: 7.6%"></span></span><span class="value">4.9</span></div>
<div class="hbar"><span>5% Jitter</span><span class="track"><span class="fill" style="--w: 3%"></span></span><span class="value">1.9</span></div>
<div class="hbar"><span>No Jitter</span><span class="track"><span class="fill" style="--w: 1.6%"></span></span><span class="value">1.0</span></div>
</div>
<figcaption>Average bits for one timestamp, raw and with delta of delta encoding (our own simulation)</figcaption>
</figure>

Prometheus reports a similar result for its own storage: an average of 1 to 2 bytes per sample. Its documentation gives a formula for planning the disk:

```text
disk = retention seconds * samples per second * bytes per sample
```

For the textbook app, 600 series scraped every 10 seconds make 60 samples a second.

Kept for Prometheus's default retention of 15 days, at 2 bytes each, that is about 155 MB. Stored as raw 16 byte points it would be about 1.2 GB. The documentation adds that reducing the number of series usually saves more than scraping less often.

## Storing by Time Blocks

Time series databases split data by time, which makes the common jobs cheap. Prometheus keeps the newest samples in memory, protected by a write-ahead log as in [Write-Ahead Logs](/system-design/write-ahead-logs), and writes them out in two hour blocks that are later merged into larger ones.

TimescaleDB, a PostgreSQL extension, partitions a table into chunks by time range, 7 days by default.

<figure class="diagram">
<p class="rowname">One Chunk per Time Range</p>
<div class="flow">
<div class="node lost">Oldest<small>dropped by retention</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Older</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Recent</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Current<small>being written</small></div>
</div>
<figcaption>Old data leaves by dropping a whole chunk, and new data goes to the current one</figcaption>
</figure>

Removing old data is the case that benefits most. TimescaleDB's documentation explains that retention works on whole chunks, so dropping one deletes a file instead of running a row by row `DELETE` that leaves work for the cleanup.

Queries for a time range touch only the chunks that overlap it. The same documentation gives a sizing rule: choose the chunk interval so that the indexes of the chunks being written fit in memory, within about 25 percent of it, since too many tiny chunks slow planning down.

This is a close cousin of the log structured storage in [LSM Trees](/system-design/lsm-trees): append to the newest part, and merge or delete older parts in the background.

## Rollups: Keep the Shape, Lose the Detail

Keeping each point forever is rarely worth it. **Downsampling**, as InfluxDB's glossary puts it, aggregates high resolution data into lower resolution data to save space. A typical plan for the textbook app:

| Age of Data | Resolution Kept |
| --- | --- |
| Up to 15 days | Every 10 seconds |
| 15 days to a year | One point per hour |
| Older than a year | One point per day |

A rollup is a query that is saved and kept up to date, which is the materialized view from [Choosing Between Normalization and Denormalization](/system-design/normalization).

TimescaleDB's docs describe its continuous aggregates as incrementally updated materialized views, and a retention policy as a rule that deletes old raw data on a schedule, so that summaries remain after the details are gone. In plain PostgreSQL, a rollup looks like this:

```sql
CREATE MATERIALIZED VIEW requests_hourly AS
SELECT date_trunc('hour', time) AS hour, route,
       sum(requests) AS requests, max(latency_ms) AS worst_ms
FROM request_metrics
GROUP BY hour, route;
```

One trap: some summaries can't be added up. An average of averages is wrong when the groups differ in size, and a 99th percentile can't be rebuilt from hourly 99th percentiles. Prometheus's histogram type avoids this by counting observations in buckets, and buckets can be added across servers and hours before a quantile is computed.

## Choosing

Use a dedicated store when the write volume is steady and high, when old data should disappear cheaply, and when most questions are about ranges of time:

- **Metrics for your own servers**: Prometheus. Its documentation says its local storage is a single node and not replicated, and that network file systems aren't supported, so plan for what a lost server means
- **A time series inside the main database**: PostgreSQL tables partitioned by time, or the TimescaleDB extension, which keeps SQL and joins with business data
- **A separate time series database**: InfluxDB, when the data has its own life and tools

Gorilla's own tradeoff is a good reminder of what these systems optimize for. It favors staying available for writes over keeping each point, at the expense of possibly dropping a small amount of data, because a lost point rarely changes an aggregate.

That is a different bargain from the one in [Transactions and ACID](/system-design/transactions-acid), and it suits monitoring and not orders.

## Key Points

- Time series data is appended in time order, read mostly for recent ranges and aggregates, and is cheap to age out
- Cost follows the number of series, so keep unbounded values such as user ids out of labels
- Delta of delta timestamps and XOR values shrink a 16 byte point to about 1 to 2 bytes
- <u>Partition by time</u>, so retention drops whole chunks and queries touch only the chunks they need
- Downsample old data into rollups, and remember that averages and percentiles can't simply be averaged again
