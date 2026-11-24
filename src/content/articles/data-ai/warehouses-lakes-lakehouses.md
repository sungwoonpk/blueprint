> A **data warehouse** stores structured data under a schema for fast SQL. A **data lake** stores any data, in open files, cheaply, and leaves the schema to the reader. A **lakehouse** puts warehouse features such as transactions and indexing on top of lake storage, so one copy of the data serves both analysts and machine learning.

The stores differ in what they promise and what they cost to run. [OLTP, OLAP and Data Warehouses](/system-design/oltp-olap) explained why analytical queries need a different engine from the app database. This article takes the next step: where the data should live once there is more of it, and in more shapes, than a warehouse handles well.

## Three Generations

The CIDR 2021 paper by Armbrust, Ghodsi, Xin and Zaharia, the paper that named the lakehouse, tells the history in three steps:

| Generation | Design | Strength | Weakness |
| --- | --- | --- | --- |
| First | Operational data is loaded into a warehouse, with compute and storage together | Clean, fast SQL for business intelligence | Costly to scale, and no room for video, text or raw logs |
| Second | Raw data goes into a lake of open files, and a part is loaded into a warehouse | Cheap storage of everything, open formats, and ML can read the files | Quality is left to the reader, and keeping lake and warehouse in step is hard |
| Third | A lake with a transactional layer on top: the lakehouse | One copy, with transactions, versions and fast queries | Newer, and it needs a table format and a catalog |

## What Each Store Is Good At

| Property | Warehouse | Lake | Lakehouse |
| --- | --- | --- | --- |
| Data types | Structured tables | Anything: tables, logs, images, text | Anything, with tables governed |
| Schema | On write, enforced | On read, by whoever reads | Enforced at the table, flexible beyond it |
| Storage | Often proprietary and coupled to compute | Cheap object storage, open formats | Cheap object storage, open formats |
| Transactions | Yes | No: a table is a set of files | Yes, through a metadata layer |
| ML access | Export the data first | Read files directly | Read files directly |
| Typical failure | Cost, lock-in, stale copies | A swamp of unknown, untrusted files | Maintenance of table metadata |

A lake without management turns into the **data swamp**: nobody knows what the files are, which are current, or whether they are right. Cheap storage invites hoarding and not curating.

## The Problems of Two Tiers

Most companies in the paper's account ran a lake and a warehouse side by side, with a copy job between them. The authors list four problems:

- **Reliability**: keeping lake and warehouse consistent takes continuous engineering, and every copy step can break or introduce bugs
- **Staleness**: the warehouse lags the lake, with new data often taking days to arrive. The paper cites a survey in which 86 percent of analysts reported using out-of-date data
- **Limited advanced analytics**: ML tools like TensorFlow, PyTorch and XGBoost don't run well against a warehouse, and exporting data adds another copy
- **Total cost**: paying for continuous copying, and for storing the data twice

For the textbook app, the two-tier version would look like this: raw click logs and sales land in the lake, a nightly job copies the clean tables into the warehouse, and the data scientist exports the training set to files for the price model. Each arrow is a job that can fail, lag, or disagree with the others.

## What Makes a Lakehouse

The paper describes three ideas, and the first is the central one:

1. **A transactional metadata layer over object storage**: tables stay as files in open formats such as Parquet, and a log or set of manifest files says which files make up each version of a table. That gives atomic updates, versions and time travel, the subject of [Table Formats and Transactions on Object Storage](/data-ai/table-formats)
2. **Direct access for machine learning**: tools read the same open files, usually through data frame interfaces, with no export
3. **Fast SQL on open files**, by caching, by auxiliary data such as statistics and indexes, and by arranging data layout

The paper reports a SQL engine over Parquet that was competitive with cloud warehouses on the TPC-DS benchmark. That is the authors' own result, and the lakehouse is also their product direction, so read it as evidence and not as a verdict.

The cost is **direct access**: clients read files directly, so the system gives up some of the data independence of a relational database, where nothing outside the database sees the storage format.

## Choosing

- A small team with mostly structured data and SQL users: a **warehouse** is simpler, and works well
- Lots of raw, semi-structured or unstructured data, or heavy ML: a **lake** plus a table format, which is a lakehouse in practice
- Both: many companies run a lakehouse for the data platform and a warehouse engine over it for BI

The choice is less final than it looks. Open formats make data portable, and warehouses now read lake tables and lakes write warehouse tables. A cleaner question is where the **governed copy of record** lives, which [Raw, Cleaned and Curated Layers](/data-ai/platform-layers) takes up, and how its metadata is managed, as in [Metadata, Catalogs and Lineage](/data-ai/metadata-lineage).

## Key Points

- Warehouses give clean SQL on structured data, lakes give cheap open storage of anything, and lakehouses add transactions and indexing to the lake
- The two-tier lake plus warehouse design suffers from reliability, staleness, limited ML access and double cost
- A lakehouse is files in open formats plus a transactional metadata layer, direct access for ML and fast SQL through caching, statistics and layout
- An unmanaged lake becomes a swamp, so curation matters more than capacity
- <u>Pick by workload and data shape, and keep data in open formats so that the choice stays reversible</u>
