> **Ingestion** moves data from the places it is produced into the platform. The three common patterns are full reload, incremental load by a timestamp, and change data capture. They differ in cost and in what they silently miss: deletes, late updates and the history between loads.

The platform depends on a copy of the source being right. We simulated the textbook app's listings table with 100,000 rows, then ran seven days of changes: 1,000 new listings, 2,000 price edits, 300 deletes and 100 edits stamped with an older time by a lagging writer each day. Three ingestion strategies copied it each night.

## Three Patterns

| Pattern | How It Works | Strength | Weakness |
| --- | --- | --- | --- |
| Full reload | Copy the whole table each time | Simplest, always correct | Cost grows with table size |
| Incremental load | Copy rows with an update time after the last load's high-water mark | Cheap | Misses deletes and rows whose timestamps are wrong |
| Change data capture | Read the database's change log and apply each event | Complete, with deletes and ordering | Needs access to the log and a stream to apply it |

[Change Data Capture](/system-design/cdc) explains how the log is read. Here we compare the outcomes.

## What Each Pattern Cost and Got Right

After seven days:

| Pattern | Rows Moved in 7 Days | Deleted Rows Still Present | Stale Prices | Missing Rows |
| --- | --- | --- | --- | --- |
| Full reload | 719,600 | 0 | 0 | 0 |
| Incremental by update time | 20,787 | 2,084 | 641 | 7 |
| Change data capture | 23,800 | 0 | 0 | 0 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Rows moved over seven days: full reload 719,600, incremental 20,787, change data capture 23,800">
<div class="hbar"><span>Full reload</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">719,600</span></div>
<div class="hbar"><span>Incremental</span><span class="track"><span class="fill" style="--w: 2.9%"></span></span><span class="value">20,787</span></div>
<div class="hbar peak"><span>Change data capture</span><span class="track"><span class="fill" style="--w: 3.3%"></span></span><span class="value">23,800</span></div>
</div>
<figcaption>Rows moved in seven days, in a simulated table of about 100,000 rows</figcaption>
</figure>

Full reload moved about 30 times as many rows as capture and was exactly right. Incremental loading was cheap and wrong in three ways.

- It never saw the 2,100 deletions, so 2,084 deleted listings stayed in the copy
- It missed 641 edits whose timestamp was older than the high-water mark, so the copy kept stale prices
- It missed seven new listings that a lagging writer re-stamped with an old time on the day they were inserted

Change data capture moved about 15 percent more rows than incremental loading, and got everything.

## Choosing a Pattern

- **Small tables, or reference tables**: full reload, since correctness is free and cost is small
- **Large append-only data**, such as click logs: incremental is correct, since rows never change or disappear
- **Large mutable tables with deletes**, such as listings: change data capture, or incremental loading with a periodic full reconciliation
- **Sources you can't read the log of**, such as a vendor API: incremental with an overlap window, re-reading the last day or week and merging by key

An overlap window trades a little extra data for protection against late stamps. A weekly full comparison, row counts and checksums between source and copy, catches what slips through, a use of [Testing and Monitoring Data Quality](/data-ai/data-quality-checks).

## Making Loads Safe to Repeat

Ingestion jobs fail halfway and get rerun. A load that appends rows twice on a rerun corrupts the copy. The remedy is **idempotence**, as in [Idempotency and Safe Retries](/system-design/idempotency): a load replaces its target slice, or merges by primary key, so that running it twice leaves the same table as running it once. In practice:

- Write each batch to a location named after its time window and replace that window entirely
- Merge by key instead of blind inserts
- Record which windows are loaded, and verify the count at the end

## Batch and Streaming

Ingestion can be batch, on a schedule, or streaming, with events arriving continuously. Streaming gives fresher data and costs more to operate, covered by [Stream Processing](/system-design/stream-processing) and [Batch Processing](/system-design/batch-processing). Many platforms do both: a stream for clicks and a nightly merge for tables. The choice follows how fresh the consumer needs the data, and a daily dashboard rarely needs a stream.

## What to Keep at the Landing Zone

Land data **as it arrived**, with the time it arrived, the source and the batch identifier added, and clean it later. That lets us rerun transformations after a bug without asking the source again, the reason for the raw layer in [Raw, Cleaned and Curated Layers](/data-ai/platform-layers).

## Key Points

- Full reload is simple and correct and gets expensive, incremental is cheap and misses deletes and mis-stamped rows, and change data capture is complete
- In our simulated table, incremental loading left 2,084 deleted rows and 641 stale prices behind, while capture moved about 15 percent more rows and left none
- Append-only data suits incremental loading, and mutable data with deletes needs capture or periodic reconciliation
- Make loads idempotent by replacing a window or merging by key, so a rerun is harmless
- <u>Land raw data with arrival metadata, so transformations can be rerun later</u>
