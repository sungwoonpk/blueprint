> Data quality is kept by automated checks that run where data changes hands: constraints on each load, tests on each transformation, and monitors on how metrics move over time. Good checks are few, precise and actionable, because alerts that are noisy or unclear get ignored.

[Dimensions of Data Quality](/data-ai/data-quality) defined what to measure. This article is about doing it in a pipeline: what the checks look like, where they run and how to tell a real incident from normal variation.

## Unit Tests for Data

The Deequ paper from Amazon proposed "unit tests for data": a declarative set of constraints that a dataset must satisfy, written in code and run on each batch. The system turns the constraints into aggregation queries, computes metrics such as completeness and uniqueness in one pass over the data, and can update them incrementally as data grows.

A check might state that the row count is above zero, `price` is complete, `listing_id` is unique and `condition` takes values from a fixed list.

The same pattern appears in other tools:

| Tool | Form of a Check | Where It Runs |
| --- | --- | --- |
| dbt tests | A SQL query that returns the rows breaking an assertion, with built-in `unique`, `not_null`, `accepted_values` and `relationships` | After each model build |
| Great Expectations | Expectations attached to a data asset, then a validation run | In pipelines or interactively |
| Deequ | Constraints compiled to aggregations on Spark | On each batch or growing dataset |
| Open Data Contract Standard | Quality rules inside a contract, covering nulls, missing values, invalid values and duplicates | Wherever the contract is enforced |

Whatever the tool, a check is a stated expectation, an automatic run and a clear outcome. For mixed expectations, Deequ also lets you add custom code.

## Where to Check

<figure class="diagram">
<div class="flow">
<div class="node">Source</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Landing checks</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Cleaned tables</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">Model tests</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Serving</div>
</div>
<figcaption>Checks sit at the boundaries, where one team's output becomes another's input</figcaption>
</figure>

- **At landing**: row count, freshness and schema against the contract. A failure should stop the load into cleaned layers, or divert the batch to quarantine
- **After transformation**: uniqueness of keys, references between tables, ranges and business rules
- **Before serving**: checks on the training table and on feature distributions

The Google paper on data validation argues for catching errors early, since they propagate through pipelines and feedback loops, and for checking the data directly instead of relying on a drop in model quality. A model is resilient to noise and can lose accuracy only slightly, or only on one slice, so a model metric is a late and weak alarm.

## Schema and Distribution Checks for ML

That paper describes the system Google uses for machine learning pipelines. It rests on a **schema** that states what correct data looks like: which features exist, their types, their allowed domains and how often they may be missing. Each new batch is validated against it. It also checks for **skew** between training and serving data, such as a feature whose value differs between the two or whose distribution has shifted.

A point with wide reach is that the authors found that classic statistical tests, such as chi-squared, are too sensitive at ML data volumes, since the test statistic's variance shrinks with the number of examples, so tiny differences become significant.

They sought a distance measure whose meaning teams could understand and tune, and designed alerts to be high precision, because on-call engineers ignore spammy or unactionable ones. The lesson of [Statistical Power and Sample Size](/data-ai/power-sample-size) shows up in operations: with millions of rows, "statistically significant" is almost always true and tells us nothing.

## Monitoring Metrics Over Time

Some faults, like a quiet drop in volume, break no rule on any single batch. They show in the **time series** of a metric: row count, null rate, mean price. Deequ stores the history of metrics and applies anomaly detection, for example flagging a value more than a set number of standard deviations from the running mean.

The simplest detector often fails on seasonality. We simulated 140 days of daily row counts with a weekly cycle, 10,000 on weekdays and 6,000 on weekends, plus 4 percent noise, and injected three incidents: a drop to 55 percent of normal on a Monday, an outage to zero on another day and a doubling from duplicate loading on a third:

| Detector | Incidents Caught of 3 | False Alarms in 102 Normal Days |
| --- | --- | --- |
| Distance of 3 standard deviations from the last 28 days | 2 | 0 |
| Same weekday, last 4 weeks, mean, within 20% | 3 | 5 |
| Same weekday, mean, within 10% | 3 | 10 |
| Same weekday, **median** of last 4, within 20% | 3 | 0 |
| Same weekday, median of last 4, within 15% | 3 | 0 |

The first detector missed the Monday drop. At 55 percent, it looked like an ordinary weekend, so mixing weekdays and weekends in one baseline made the spread large and hid the incident.

Comparing like with like fixed that, and then created false alarms. All of them came from the incidents themselves: an incident stays in the four-week window and ruins the baseline for the same weekday over the next four weeks. Using the median of the window ignores one bad week, and gave all three catches with no false alarms.

The lessons carry beyond this toy: model the seasonality, use a baseline that isn't poisoned by the last incident, and tune on history to balance catches against noise.

## Handling Failures

- **Severity levels**: block a load for a broken key, warn for a small drift
- **Quarantine** bad rows with a reason and count them, as in [Raw, Cleaned and Curated Layers](/data-ai/platform-layers)
- **Route alerts to the owner** with context: which check, which table, which batch, and links to lineage from [Metadata, Catalogs and Lineage](/data-ai/metadata-lineage)
- **Track results over time**, since a table that fails often is telling us about its source
- **Fix at the source** when possible, with a contract, as in [Data Contracts and Schema Changes](/data-ai/data-contracts)

## Key Points

- Checks are declared expectations that run on each batch, as in Deequ, dbt tests and Great Expectations
- Place checks at boundaries: at landing, after transformation and before serving
- Statistical tests are too sensitive at large scale, and alerts must be precise and actionable or they get ignored
- In our simulation, a plain 28-day baseline missed a Monday drop, a same-weekday mean produced false alarms from earlier incidents, and a same-weekday median caught all three incidents with none
- <u>Model seasonality, keep incidents out of the baseline and send each alert to an owner</u>
