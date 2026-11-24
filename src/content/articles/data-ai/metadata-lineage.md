> **Metadata** is data about data: what a table is, where it comes from, who owns it and how fresh it is. A **catalog** makes metadata searchable. **Lineage** records which datasets and jobs produce which others, so we can ask what a change will break downstream and where a wrong number came from upstream.

Platforms grow until nobody holds them in their head. The textbook app's team has tables from the app database, click streams, cleaned layers, features and dashboards. Metadata answers the questions that come up every week: which table has seller revenue, who do I ask about it, and what does it feed?

## Three Kinds of Metadata

| Kind | Examples | Who Uses It |
| --- | --- | --- |
| Technical | Schema, types, partitions, file sizes, row counts, table format version | Engineers, query engines |
| Business | Description, definitions of columns and metrics, owner, tags, sensitivity | Analysts, stewards |
| Operational | Last successful run, freshness, quality results, usage and query history | On-call engineers, consumers deciding to trust a table |

Technical metadata can be collected automatically. Business metadata needs people to write it, and is the part that goes missing. Operational metadata turns a catalog from a library into a status page.

## The Catalog

A **data catalog** is the searchable index: it lists datasets, their metadata, their owners and their lineage. Useful catalogs share a few properties:

- **Automatic collection**, since hand-maintained lists go stale in weeks
- **Search** by name, column, tag and owner
- **Ownership on every dataset**, because a table without an owner has no one to ask
- **Trust signals** beside each table: freshness, test results, certified or deprecated status
- **Access links**, so finding a table leads to a request for access

In a table-format platform, the same word means the catalog that maps table names to current metadata files, as in [Table Formats and Transactions on Object Storage](/data-ai/table-formats). A governance catalog sits above it and adds the business context.

## Lineage

Lineage is a graph of datasets and the jobs that read and write them. OpenLineage, an open standard, models this with three objects: a **Dataset**, a **Job** that consumes and produces datasets, and a **Run**, one execution of a job.

Tools emit events when a run starts and completes, naming the inputs and outputs, and a backend weaves them together into the graph. Extra information such as the schema or source code location travels in optional **facets**. The graph is learned from jobs, because it is jobs that move data.

We built a toy lineage graph for the textbook app, with 24 datasets, jobs and consumers, covering the app tables, bronze, silver, gold, features, one model and its serving, and dashboards. Two questions it answers:

**Impact analysis, downstream.** If we change a source table, what could break?

| If This Changes | Datasets Downstream | Includes |
| --- | --- | --- |
| The app's listings table | 8 | Bronze and silver listings, 2 gold tables, the listing features, the price model, the pricing dashboard and the app's suggestion service |
| The cleaned sales table | 9 | 3 gold tables, seller history features, the model, 3 dashboards and the suggestion service |
| The price by course table | 1 | Only the pricing dashboard |

A one-column change to the listings table reaches the live suggestion service in five hops. Without lineage, the application team would find out from an incident.

**Root cause, upstream.** The pricing dashboard looks wrong. Lineage lists its 7 upstream datasets: the gold table, silver listings and sales, bronze listings and sales, and the two app tables. That turns "something is off" into a short, ordered list to check, from the dashboard back toward the source.

## Column-Level Lineage

Table-level lineage says that a table depends on another. Column-level lineage says that `price_by_course.avg_price` comes from `silver.listings.price`. It is more precise, so a change to a column that nothing downstream uses becomes a non-event, and a privacy review can trace where an email address ends up. It also is harder to capture, since it requires parsing the SQL of each job.

## Where Lineage Comes From

1. **Parsing queries and transformation code**, which works well for SQL
2. **Instrumenting orchestrators and engines** to emit events, the OpenLineage approach
3. **Declared dependencies**, such as the references between models in [Transformations as Code](/data-ai/transformations-as-code)
4. **Query logs**, for what was actually read, including ad hoc queries

Declared lineage shows intent and logs show reality, and a mismatch between them is itself a finding.

## Uses

- **Change management**: warn consumers before a breaking change, the working side of [Data Contracts and Schema Changes](/data-ai/data-contracts)
- **Debugging**: trace a bad value to the job that produced it
- **Trust**: show a consumer where a number comes from and when it was last refreshed
- **Governance and privacy**: find every copy of personal data for a deletion request, as in [Data Governance and Ownership](/data-ai/data-governance)
- **Cleanup**: tables with no downstream and no queries are candidates for removal
- **ML**: record which dataset version trained a model, a use of [Model Cards and Datasheets](/data-ai/documentation)

## Key Points

- Technical metadata is collected automatically, business metadata needs people and operational metadata shows whether a table can be trusted
- A catalog is a searchable index with owners, trust signals and access links
- Lineage is a graph built from jobs, runs and datasets, as in the OpenLineage model
- In our toy graph of 24 nodes, changing the listings table touched 8 downstream datasets, up to the live suggestion service
- <u>Give every dataset an owner and capture lineage automatically, since both go stale when kept by hand</u>
