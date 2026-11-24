> **Serving** is delivering prepared data to its users, and each kind of user needs something different: analysts want governed tables and consistent definitions, models want training sets that are correct as of each example's time plus fast feature lookups, and applications want low-latency reads of a single record. Serving to a model is the easiest to get subtly wrong.

At the end of the path in [The Data Engineering Lifecycle](/data-ai/data-engineering-lifecycle), the same cleaned data is used in three ways. They differ in how fresh the data must be, how fast it must arrive and what a mistake looks like.

## Three Kinds of Consumers

| Consumer | Needs | Typical Interface | A Mistake Looks Like |
| --- | --- | --- | --- |
| Analysts and BI | Trusted tables, one definition of each metric, minutes to hours of freshness | SQL on curated tables, dashboards, a semantic layer | Two dashboards disagree about revenue |
| Machine learning training | Large historical sets, each row's features as they were at that row's time | Training tables, data frames, files | A model that looks great offline and fails online |
| Applications and online models | A single record in milliseconds, current values | Key-value lookups, APIs, caches | Stale or missing values at request time |

Every consumer is served best from curated data, not raw. [Raw, Cleaned and Curated Layers](/data-ai/platform-layers) keeps the cleaning in one place so that the three don't each reinvent it.

## Serving Analysts

The danger is **metric drift**: each team writes its own SQL for "weekly active sellers", with different filters, and the numbers disagree.

A **semantic layer** or a set of governed metric definitions puts each definition in one place that dashboards and notebooks share. Where one doesn't exist, a curated table with a clear name and documentation serves the same purpose. Freshness and ownership should be stated: a table that says it is updated daily by 07:00, with an owner, can be trusted or challenged, as in [Data Contracts and Schema Changes](/data-ai/data-contracts).

## Serving Models: Point-in-Time Correctness

A training set pairs each example with its features. The rule is that every feature must be computed from information available **at the time of the example**, never later.

The Google paper on data validation by Breck and colleagues calls the violation "time travel": a feature, such as a click count, is obtained by querying a database that keeps changing, so the training data, generated later, includes events that happened after the moment being modeled and the model learns from the future.

We simulated it in the textbook app. 3,000 sellers, 10 listings each, in time order. Each listing sells with a probability depending on the seller. The feature is the seller's number of sales:

| Version of the Feature | What It Counts | AUC for Predicting a Listing's Sale |
| --- | --- | --- |
| Point in time | Sales from the seller's earlier listings only | 0.595 |
| Latest value | All the seller's sales to date, including this listing | 0.786 |

The leaky version looks 0.19 better, since it includes the label itself in the feature. A team that built the training table with a plain join to the latest seller statistics would see 0.786 offline and about 0.595 after deployment, where the future isn't available. This is the story of [Data Leakage](/data-ai/data-leakage), and the cause is almost always serving: a join that took the current row.

The fix is a **point-in-time join**: for each example at time t, take the feature value that was valid at t. That needs history, which is why [Slowly Changing Dimensions](/data-ai/slowly-changing-dimensions) kept validity dates, and why feature tables are stored with timestamps. [Feature Stores and Training-Serving Skew](/data-ai/feature-stores) automates this and also guards the second risk: computing features one way for training and another way at serving.

## Serving Applications and Online Models

An application asks for one seller's or one listing's data and needs the answer in milliseconds. The warehouse is too slow for that, so the data is copied, or **reverse ETL**'d, into a store built for point lookups, such as a key-value store ([Key-Value Stores](/system-design/key-value-stores)), often with a cache in front. Questions to settle:

- **Freshness**: how stale a value can the application accept, an hour or a second?
- **Consistency with training**: the online value must be computed by the same logic as the offline one
- **Fallbacks**: what happens when a value is missing or the store is slow
- **Cost**: the online store is the expensive copy, so serve only the features the model uses

## Interfaces to Offer

- Tables with documented columns for analysts
- Versioned training snapshots, so a result can be reproduced, which the table formats of [Table Formats and Transactions on Object Storage](/data-ai/table-formats) support through time travel
- A lookup API or store for online reads
- Extracts for outside parties, governed by [Data Governance and Ownership](/data-ai/data-governance)

## Key Points

- Analysts need one governed definition per metric, models need features as of each example's time, and applications need fast single-record reads
- Metric drift comes from each team defining the same metric differently, so keep definitions in one place
- Joining the latest feature value to historical examples leaks the future: AUC was 0.786 with a leaky join and 0.595 with a point-in-time join
- Online and offline feature logic must match, which is the job of a feature store
- <u>Build training sets with point-in-time joins, from tables that keep history</u>
