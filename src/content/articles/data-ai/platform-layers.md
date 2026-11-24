> Many platforms organize data into layers: **raw** data exactly as it arrived, **cleaned** data that is validated and deduplicated, and **curated** data shaped for use. The widely used names are bronze, silver and gold, from the medallion architecture. Each layer has one job and one set of users, and raw data is kept so that every later layer can be rebuilt.

[Ingestion Patterns](/data-ai/ingestion) said to land data as it arrived. This article follows the data one step further, through the layers it passes on the way to a dashboard or a model.

## The Three Layers

The Databricks documentation describes the medallion architecture as layers that denote the quality of data, and calls it a recommended practice and not a requirement. The idea is older than the name, and many teams use staging, core and marts, or raw, clean and curated.

| | Bronze: Raw | Silver: Cleaned | Gold: Curated |
| --- | --- | --- | --- |
| Job | Keep what arrived | Validate, deduplicate, conform | Model for a use and aggregate |
| Shape | Source format, mostly strings, plus load metadata | Typed, deduplicated, one clean row per entity or event | Business facts and dimensions, aggregates, feature tables |
| Users | Pipelines, audits | Analysts, data scientists | Business users, dashboards, ML |
| Changes | Appended, never edited | Rebuilt from bronze | Rebuilt from silver |

The guidance for bronze is to do almost nothing: keep the source's state, append incrementally, and store most fields as strings or binary to guard against unexpected schema changes, adding columns such as the source file name and the load time. Silver is where the cleaning happens: schema enforcement, handling of nulls, deduplication, late and out-of-order data, and quality checks. The documentation also recommends that bad records go to quarantine and not vanish.

## A Run Through the Layers

We built the layers in SQLite for the textbook app's sales feed. The raw feed had 50,000 events, with three kinds of trouble: 3 percent delivered twice because the feed delivers at least once, 1.5 percent with an empty price, and 0.8 percent with a negative price.

| Layer | Rows | What Happened |
| --- | --- | --- |
| Bronze | 51,500 | Every delivery, duplicates included, stored as received |
| Silver | 48,842 | 1,500 duplicates dropped, 1,158 events with an empty, negative or absurd price quarantined, prices typed as integers |
| Gold | 30 daily rows | Sales count and revenue per day: 48,842 sales and $3,525,211 |

Bronze kept 1,500 more rows than there were real events and, correctly, didn't try to fix them. The silver step removed the duplicates and set the invalid ones aside. The gold table is small and fast to read, since it was built for one question.

## Why Keep Raw Data

Our first silver rule contained a mistake. We assumed no price above $200 was real, so it dropped 2,378 further events as invalid. About 5 percent of textbooks are expensive, and those sales are real. The gold revenue came out at $2,093,015, 41 percent too low.

Because bronze held every event, the fix was to change the rule and rebuild:

| Silver Rule | Silver Rows | Quarantined | Gold Revenue |
| --- | --- | --- | --- |
| Price cap of $200, the mistake | 46,464 | 3,536 | $2,093,015 |
| Price cap of $1,000, corrected | 48,842 | 1,158 | $3,525,211 |

Had we cleaned data on the way in and discarded the raw rows, the 2,378 sales would be gone for good. This is the main argument for the raw layer: **transformations have bugs, and raw data lets us rerun them**. It also supports audit, and it gives us a replay path when a new question needs a field we hadn't used.

The costs are storage, which is cheap, and the discipline of treating bronze as read only for everyone but the ingestion job. And because raw data may contain personal information, it needs the same access controls as the rest, as [Data Governance and Ownership](/data-ai/data-governance) explains.

## Rules for the Layers

- **One direction**: bronze feeds silver feeds gold, with no loops back
- **Each layer reproducible from the one before**, which is what [Transformations as Code](/data-ai/transformations-as-code) provides
- **Quality checks at each boundary**, as in [Testing and Monitoring Data Quality](/data-ai/data-quality-checks), with failures quarantined and counted
- **Consumers read silver or gold**, not bronze, so cleaning rules apply in one place
- **ML features** are built from silver, and the same code should produce training and serving values, as [Feature Stores and Training-Serving Skew](/data-ai/feature-stores) discusses

## Don't Overbuild

Three layers are a convention, not a law. A small dataset needs two. A large organization may add layers, for example a conformed layer shared across domains, or data products owned by teams. More layers add latency, cost and places for logic to hide. Add one only when a clear job calls for it.

## Key Points

- Raw (bronze) keeps what arrived, cleaned (silver) validates and deduplicates, and curated (gold) shapes data for a purpose
- In our simulated feed, 51,500 delivered rows became 48,842 clean events and a 30-row daily table
- A wrong cleaning rule cut revenue by 41 percent, and because raw data was kept, a rule change and a rebuild repaired it
- Quarantine invalid records instead of dropping them, and check quality at each boundary
- <u>Keep raw data read only, and make every later layer reproducible from it</u>
