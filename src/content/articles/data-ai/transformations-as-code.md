> **Transformations as code** means the steps that turn raw data into usable tables are written as version-controlled, tested, reviewed programs, usually SQL models with declared dependencies, and not as hand edits or one-off scripts. A run can be repeated, a change can be reviewed, and a failure points to a file. Tools such as dbt popularized the approach for SQL.

[Raw, Cleaned and Curated Layers](/data-ai/platform-layers) said that each layer should be reproducible from the one before. This article is about how to achieve that: write each table as a query, let a tool work out the order, and test the result.

## From Scripts to Models

A model in a tool like dbt is one SQL `select` statement saved in a file. The tool turns it into a table or view, and the file name is the table name.

A model refers to other models with a reference instead of a hard-coded table name, and the references form a graph, so the tool knows the order, can run only what changed and can draw the **lineage**, the subject of [Metadata, Catalogs and Lineage](/data-ai/metadata-lineage).

<figure class="diagram">
<div class="flow">
<div class="node">sales_raw</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">stg_sales</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">fct_sales</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hl">daily_revenue</div>
</div>
<figcaption>Each model selects from the one before, and the tool derives the build order</figcaption>
</figure>

Writing transformations as code gives us what software already has: version history, code review, tests, environments, and one place to look when a number is wrong. A naming convention helps: staging models clean and rename one source, and later models join and aggregate.

## Materializations

The dbt documentation lists five ways to persist a model, and the choice is a performance decision:

| Materialization | What It Does | Use When |
| --- | --- | --- |
| View | Stores the query, runs it on every read | Light renaming and recasting, and the default |
| Table | Rebuilds the whole table on each run | Models read by BI tools, or slow models many others use |
| Incremental | Adds or updates only rows new since the last run | Large event data, once full runs get too slow |
| Ephemeral | Inlined into dependents, not stored | Small helper steps used once or twice |
| Materialized view | The database keeps it fresh | Where the database supports it |

The documentation's advice is to start with views and change only when performance requires it, and not to begin with incremental models, which need extra configuration.

## The Price of Incremental

An incremental model is faster and easier to get wrong. We simulated 30 days of sales in the textbook app, 3,000 sales a day, 2 percent of which arrive one to three days after they happened. The daily revenue model ran each day with three strategies:

| Strategy | Rows Read Over 30 Days | Revenue Missing |
| --- | --- | --- |
| Full rebuild every day | 1,391,440 | $0 |
| Incremental: take rows newer than the latest date in the table | 88,196 | $75,070, which is 1.9% |
| Incremental with a 3-day lookback, recomputing the last 3 days | 338,440 | $0 |

The naive incremental model read 16 times fewer rows and silently dropped every late arrival, because by the time it showed up, its date was already behind the latest date in the table. The error is small and permanent, and no run fails. The lookback window fixes it by recomputing recent days each time. It reads four times as many rows as the naive version and a quarter as many as the full rebuild.

Late data is normal, so incremental models need a lookback sized to how late data can be, and a periodic full refresh as a backstop.

## Idempotence

A run should give the same result however many times it runs. In our toy, an append-only job that was run twice for the same day wrote 6,000 rows instead of 3,000. Safer patterns:

- Rebuild the table, as a table materialization does
- Replace the slice: delete the day, then insert it again, in one transaction
- Merge by a unique key

[Idempotency and Safe Retries](/system-design/idempotency) develops the idea for APIs, and the same logic applies when a scheduler retries a failed job, as in [Workflow Engines](/system-design/workflow-engines).

## Tests Belong in the Project

In dbt, a data test is a query that selects the rows that **break** an assertion, and the test passes when it returns nothing.

The built-in generic tests are `unique`, `not_null`, `accepted_values` and `relationships`, which checks that a foreign key exists in another model. A **singular** test is a one-off SQL file for a specific rule. A team that writes a test every time a bug is found accumulates a regression suite. [Testing and Monitoring Data Quality](/data-ai/data-quality-checks) goes further.

## Practices

1. Keep the transformation code in version control, and review changes
2. Run the project in a development schema before production
3. Run tests in continuous integration, and block merges that break them
4. Document models and columns where they are defined
5. Make each model do one thing, with clear inputs
6. Prefer simple, repeatable full builds until size forces otherwise

None of this requires a particular tool. The principle is that data work is software work, which is the DataOps undercurrent from [The Data Engineering Lifecycle](/data-ai/data-engineering-lifecycle).

## Key Points

- Transformations are SQL models in version control, with references between them that give the build order and the lineage
- Views are the default, tables suit slow or widely read models, and incremental models suit large event data once full builds are too slow
- A naive incremental filter missed 1.9 percent of revenue by ignoring late arrivals, and a 3-day lookback fixed it at 4 times the reads
- Reruns must be safe: rebuild, replace the slice or merge by key, because an append twice gave double rows
- <u>Write a test whenever a bug is found, and run the tests before every merge</u>
