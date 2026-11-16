> **OLTP**, online transaction processing, is the many small reads and writes that run an application. **OLAP**, online analytical processing, is the few large questions asked about all that data afterwards. A **data warehouse** is a database built for the second kind of work.

The textbook app's founders now want a report: sales per campus per month, for the last three terms. Running it on the production database at 9:00 AM would read millions of rows while students are trying to buy books.

The two kinds of work pull a database in opposite directions, and this topic is about why, and what the second kind of system looks like.

## Two Kinds of Work

AWS's comparison describes OLTP as storing and updating transactional data reliably in high volumes, for things like processing orders, updating inventory and managing accounts. OLAP combines and groups business data to answer questions about trends. The two look like this on the textbook app's data:

```sql
-- OLTP: one row, found by its key
UPDATE listings SET status = 'sold' WHERE id = 17;

-- OLAP: millions of rows, grouped and added up
SELECT u.campus, date_trunc('month', o.sold_at) AS month,
       SUM(o.price_cents)
FROM orders o JOIN users u ON u.id = o.buyer_id
GROUP BY u.campus, month;
```

| | OLTP | OLAP |
| --- | --- | --- |
| Typical Question | Mark listing 17 as sold | Sales per campus per month |
| Rows Touched | A few | Millions |
| Mostly | Reads and writes of small records | Reads of many records |
| Response | Milliseconds | Seconds to minutes |
| Data Kept | Current state | History |
| Layout | Normalized tables | Facts and dimensions |

The response times and the data sizes in the AWS table are gigabytes and milliseconds for OLTP, and terabytes to petabytes and seconds or minutes for OLAP. Wikipedia describes OLTP by its central concerns, concurrency and atomicity, which are the subjects of [Transactions and ACID](/system-design/transactions-acid), and OLAP as a way to answer multidimensional analytical questions quickly.

## Why Keep Them Apart

A report can run on the main database, and for a small app that is a fine start. The trouble grows with the data, for reasons the sources point to:

- **Contention**: Wikipedia's article on data warehouses lists reduced lock contention from analysis queries on transaction systems among the reasons to have a warehouse. A scan of three million orders competes with the students' purchases for disk, memory and locks
- **Opposite tuning**: Wikipedia notes that an OLTP designer avoids excessive indexes, to keep writes fast, while analysis wants other structures, and that a database designed for OLTP won't work well as an analytical store without careful design
- **History**: The production tables keep the current state, and a warehouse keeps the past, so a question about last year's sales still has an answer
- **One view**: A warehouse can combine data from several systems, such as the app database, payments and support tickets, into one consistent model

So the data is copied out of the operational systems into a separate place. That copy is the warehouse:

<figure class="diagram">
<div class="flow">
<div class="node">App Database<small>OLTP</small></div>
<div class="arrow" data-label="extract" aria-hidden="true"></div>
<div class="node">Staging<small>raw copy</small></div>
<div class="arrow" data-label="transform" aria-hidden="true"></div>
<div class="node">Warehouse<small>OLAP</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Reports</div>
</div>
<figcaption>Data flows from the app database to a warehouse, and analysts query the warehouse</figcaption>
</figure>

## Facts and Dimensions

Warehouses commonly use a layout called a **star schema**, which Wikipedia describes as the simplest and most widely used style. At the center is a **fact table**, with one row for each event being measured and mostly numeric values, the **measures**. Around it sit **dimension tables**, which describe the context of an event: when, where, what, who.

<figure class="diagram">
<svg viewBox="0 0 320 220" role="img" aria-label="A star schema: the fact_sales table in the middle, with dim_date above, dim_buyer below, dim_campus to the left and dim_book to the right." style="width:100%;max-width:360px;height:auto;display:block;margin:0 auto">
<g stroke-width="1.5" style="stroke:var(--muted)">
<line x1="160" y1="88" x2="160" y2="40"/>
<line x1="160" y1="132" x2="160" y2="180"/>
<line x1="110" y1="110" x2="95" y2="110"/>
<line x1="210" y1="110" x2="225" y2="110"/>
</g>
<g stroke-width="1.5" style="fill:var(--bg);stroke:var(--border)">
<rect x="115" y="8" width="90" height="32" rx="9"/>
<rect x="115" y="180" width="90" height="32" rx="9"/>
<rect x="5" y="94" width="90" height="32" rx="9"/>
<rect x="225" y="94" width="90" height="32" rx="9"/>
</g>
<rect x="110" y="88" width="100" height="44" rx="10" stroke-width="2" style="fill:var(--bg);stroke:var(--accent)"/>
<g font-size="12" font-weight="600" text-anchor="middle" style="fill:var(--text)">
<text x="160" y="28">dim_date</text>
<text x="160" y="200">dim_buyer</text>
<text x="50" y="114">dim_campus</text>
<text x="270" y="114">dim_book</text>
<text x="160" y="107" font-size="13" style="fill:var(--accent)">fact_sales</text>
</g>
<text x="160" y="122" font-size="10" text-anchor="middle" style="fill:var(--muted)">price_cents</text>
</svg>
<figcaption>One fact table in the middle, with a dimension table on each side</figcaption>
</figure>

Each row in `fact_sales` is one sold book, which is its **grain**: the level of detail the table promises, here one atomic sale. Its columns are the keys of the dimensions and the measure. A question becomes a join of the fact table with a few small dimensions:

```sql
SELECT c.name AS campus, d.month, SUM(f.price_cents) / 100 AS dollars
FROM fact_sales f
JOIN dim_date   d ON d.id = f.date_id
JOIN dim_campus c ON c.id = f.campus_id
WHERE d.year = 2026
GROUP BY c.name, d.month;
```

Wikipedia points out that the dimensions are deliberately denormalized, so each one repeats its attributes, in exchange for simpler queries and fast aggregation. This is the opposite choice to the one in [Choosing Between Normalization and Denormalization](/system-design/normalization), made for the same reason: a read-heavy system pays for copies once, in the load, and saves on each query.

A **snowflake schema** normalizes the dimensions back into linked tables, and the guidance Wikipedia cites from Kimball is to avoid it unless there is a clear need.

The questions analysts ask have names. A **roll-up** adds up along a dimension, such as campuses into a region. A **drill-down** goes the other way, from a month into its days. A **slice** fixes one value, such as only the North campus, and a **dice** picks a sub-block, such as two campuses in two terms.

## Getting Data In

Copying is done in three steps, which gives the process its name, **ETL**: extract the data from the sources, transform it, and load it into the warehouse.

Transforming means cleaning, mapping codes to one standard, deriving values such as the dollar price, and giving each dimension row its own surrogate key, as in [Data Modeling](/system-design/data-modeling). Wikipedia notes that the dimension rows must be loaded before the facts that point to them.

A variant, **ELT**, loads the raw data first and transforms it inside the warehouse. That suits modern warehouses with plenty of compute, and it can keep the raw copy for later reuse.

Warehouses are usually loaded in batches. AWS says OLAP data is updated periodically, from daily to monthly, and Wikipedia gives a latency of a few hours for OLAP systems. A report that has to be fresh uses a change feed instead, such as the commit log reader from [Cache Invalidation](/system-design/cache-invalidation).

## Why Warehouses Are Fast at Scans

The warehouse isn't only a copy. It is built to read huge amounts quickly. Amazon's Redshift documentation names the ingredients. Columnar storage keeps each column together, which, in its words, drastically reduces disk I/O, and values of one kind compress well together.

Massively parallel processing spreads a query over many compute nodes, each working on its share of the rows. And storage can be separated from compute, so each can grow independently.

The first of these is the subject of [Columnar Storage](/system-design/column-storage). For now the point is the match with the work: a report that adds up one column across millions of rows reads only that column, instead of every field of every row.

## When You Don't Need One

At 2,000 campus users, the first step is smaller than a warehouse: run the reports at night on a read replica, as described in [From One Server to Many](/system-design/one-server-to-many), so production isn't slowed.

A warehouse earns its cost when reports start to strain even the replica, when the history has to outlive the operational tables, or when several systems' data must be joined.

Two neighbors are worth knowing. A **data mart** is a smaller warehouse for one department or subject. A **data lake** is a store of raw data in many formats that is processed when it is read. Both are described by Wikipedia as variations on the same need.

## Key Points

- OLTP serves the application with small, fast reads and writes, and OLAP answers large questions over many rows and a long history
- Keep them apart because analysis competes with transactions for resources, needs other structures and wants history
- A star schema puts measures in a fact table and context in denormalized dimension tables, so questions become a join and a group
- <u>Load the warehouse in batches with ETL or ELT</u>, or from a change feed when it must be fresh
- Warehouses are fast because of columnar storage, parallel processing and separate compute, and a nightly replica is often enough at first
