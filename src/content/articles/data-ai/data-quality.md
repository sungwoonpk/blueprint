> **Data quality** is fitness for the use the data is put to. It is measured along several dimensions, such as completeness, validity, uniqueness, consistency, timeliness and accuracy, and each one catches a different kind of fault. A table can score well on every dimension on average and still contain many rows that break at least one.

[Missing Data](/data-ai/missing-data), [Duplicates and Entity Resolution](/data-ai/duplicates-entity-resolution) and [Outliers and Noise](/data-ai/outliers) treated faults as things an analyst finds and handles. On a platform, quality is a property we define, measure and watch continuously, because the next batch of data brings new faults.

## The Dimensions

The research literature has long said that quality is more than accuracy. A 1996 study by Wang and Strong, "Beyond Accuracy: What Data Quality Means to Data Consumers", asked consumers what quality meant to them and found a wide set of dimensions. The Deequ paper from Amazon, on large scale quality verification, uses a practical subset. Our working list:

| Dimension | Question | Example Rule for Listings |
| --- | --- | --- |
| Completeness | Are required values present? | `price` is never null |
| Validity | Do values follow the allowed format and range? | `price` is between $1 and $1,000 |
| Uniqueness | Is each real thing recorded once? | `listing_id` has no duplicates |
| Consistency | Do related values agree, within and across tables? | `sold_at` is not before `listed_at` |
| Timeliness | Is the data fresh enough for its use? | The table was updated within 24 hours |
| Accuracy | Does the value match reality? | `price` equals the price in the source of record |

The Deequ authors note that accuracy has a syntactic form, a value inside its domain, and a semantic form, a value that matches the real world. Syntactic accuracy is easy to test and semantic accuracy needs a reference, which is why it is the hardest dimension and the least checked.

## Measuring Them on a Table

We built a table of 10,200 listing rows and injected faults of each kind, so we know the truth. Then we measured:

| Dimension | Measure | Result |
| --- | --- | --- |
| Completeness | Share of rows with a price | 97.1% |
| Validity | Share of prices from $1 to $1,000 | 99.0% |
| Uniqueness | Distinct IDs over rows | 98.0% |
| Consistency | Share of rows with sold not before listed | 98.8% |
| Timeliness | Share of rows refreshed within 24 hours | 95.1% |
| Accuracy | Share of prices equal to the reference | 97.0% |

<figure class="chart">
<div class="hbars" role="img" aria-label="Six quality measures, all between 95 and 99 percent">
<div class="hbar"><span>Completeness</span><span class="track"><span class="fill" style="--w: 97.1%"></span></span><span class="value">97.1%</span></div>
<div class="hbar"><span>Validity</span><span class="track"><span class="fill" style="--w: 99%"></span></span><span class="value">99.0%</span></div>
<div class="hbar"><span>Uniqueness</span><span class="track"><span class="fill" style="--w: 98%"></span></span><span class="value">98.0%</span></div>
<div class="hbar"><span>Consistency</span><span class="track"><span class="fill" style="--w: 98.8%"></span></span><span class="value">98.8%</span></div>
<div class="hbar"><span>Timeliness</span><span class="track"><span class="fill" style="--w: 95.1%"></span></span><span class="value">95.1%</span></div>
<div class="hbar peak"><span>Accuracy</span><span class="track"><span class="fill" style="--w: 97%"></span></span><span class="value">97.0%</span></div>
</div>
<figcaption>Six dimensions on a simulated listings table, each looking healthy</figcaption>
</figure>

Every figure is at least 95 percent, and a dashboard of averages would look green. Yet 1,333 of the 10,200 rows, 13.1 percent, fail at least one rule, since the faults fall on different rows and add up. If our model trains on this table, one row in eight carries a defect.

## Quality Is Relative to a Use

A table is fit or unfit for a purpose. Daily revenue by course can tolerate a 3 percent missing price, if the missing rows are random.

A price model cannot, if prices are missing mostly for rare, expensive books, since then the missingness has a pattern, as [Missing Data](/data-ai/missing-data) explained. A fraud model may need data within seconds and a monthly report within a day. So quality rules should name the consumer and its tolerance, which is what contracts do in [Data Contracts and Schema Changes](/data-ai/data-contracts).

## Where Faults Come From

- **Source bugs and changes**: the app stops logging an event, or changes a unit
- **Pipeline bugs**: a join drops rows, or a retry duplicates them, as the incremental cases in [Transformations as Code](/data-ai/transformations-as-code) showed
- **Late and out-of-order data**, as in [Ingestion Patterns](/data-ai/ingestion)
- **Human entry and ambiguity**: free text, different spellings, missing fields
- **Drift in meaning**: a field keeps its name and type while its meaning changes, which no schema check can see
- **Decay**: addresses and prices go out of date

The Google paper on data validation observes that many data errors come from bugs in code, not from random noise, and so have structure: all examples in a slice take the same wrong value. Structured faults can be caught by checks, and they can slip past model accuracy metrics, because models are robust to noisy input and lose only a little.

## Ownership

Quality has to be somebody's job at the source. The team that produces the data can prevent faults cheaply, and downstream teams can only detect and compensate. [Data Governance and Ownership](/data-ai/data-governance) assigns that responsibility, and [Testing and Monitoring Data Quality](/data-ai/data-quality-checks) shows how to measure it as data arrives.

## Key Points

- Quality is fitness for use, measured by dimensions: completeness, validity, uniqueness, consistency, timeliness and accuracy
- Semantic accuracy, a match with the real world, needs a reference and is the dimension least often checked
- On a simulated table all six measures were 95 percent or better, yet 13.1 percent of rows failed at least one rule
- Tolerance depends on the consumer, and the pattern of a fault matters more than its rate
- <u>Define quality per use, name an owner at the source and measure it on every load</u>
