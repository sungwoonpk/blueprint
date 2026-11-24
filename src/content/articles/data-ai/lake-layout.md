> How files are arranged in a data lake decides how much a query reads. Large columnar files, partitioned by a column that queries filter on, and sorted so that min and max statistics can skip data, make queries cheap. Many tiny files, or partitions by a high-cardinality column, make the same queries slow and the store expensive to list.

Moving to files in object storage gave us cheap capacity and removed the database's help. The database used to decide what to read. In a lake the layout decides, because the engine can only skip what the layout lets it skip.

## File Formats

Analytical data is stored in **columnar** formats such as Apache Parquet. The Parquet documentation describes the layout: a file is split into **row groups**, each row group holds one chunk per column, and a footer stores metadata including per-chunk statistics.

A query that needs two columns reads only those chunks, and a statistic such as the minimum and maximum lets it skip a chunk altogether. [OLTP, OLAP and Data Warehouses](/system-design/oltp-olap) gave the case for columns, and the same idea carries into files.



The Parquet documentation recommends large row groups, in the range of 512 MB to 1 GB, so reads are long and sequential, at the cost of more buffering when writing. In practice, aim for files of tens to hundreds of megabytes.

## Partitioning

A **partitioned** table puts files into directories named by column values, such as `events/date=2026-10-14/`. A query that filters on the date reads only matching directories, called **partition pruning**.

We modeled the textbook app's click events: 500,000 rows a day at 100 bytes each, 50 MB a day and 18 GB a year. These layouts change the file count enormously:

| Layout | Files per Year | Average File Size | Files for a 7-Day Query |
| --- | --- | --- | --- |
| Partition by day, one file a day | 365 | 50,000 KB | 7 |
| By day, a file every hour | 8,760 | 2,083 KB | 168 |
| By day, a file every minute from streaming | 525,600 | 35 KB | 10,080 |
| By seller then day, 10,000 sellers | 3,650,000 | 5 KB | 70,000 |

The same data, in the same bytes, takes 365 files or 3.65 million. The last two layouts hit the **small files problem**: each file carries open and metadata cost, listing millions of objects is slow, and the engine spends its time on overhead. The Delta Lake paper by Armbrust and colleagues gives the guidance: keep frequently accessed data close together sequentially, make objects large but not too large, and avoid listing operations.

## Choosing the Partition Column

A good partition column:

- Appears in most queries' filters, so pruning is possible
- Has **moderate cardinality**: tens to thousands of values, not millions
- Splits data into reasonably even and large pieces

Date fits all three, which is why it is the common choice. A seller ID has 10,000 values, so the directories were tiny. Partitioning by a column nobody filters on gives no benefit. And over-partitioning, by day and hour and course, multiplies the count of small files.

## Sorting Within Files

Partitioning is coarse. Inside a file, min and max statistics per row group allow skipping, but only if the data is arranged to make them narrow. We looked for one seller's rows inside a single day's file of 500,000 rows split into 10 row groups of 50,000 rows, a scaled-down version of real row groups:

| Order of Rows in the File | Row Groups Read for One Seller |
| --- | --- |
| Arrival order | 10 of 10 |
| Sorted by seller | 1 of 10 |

With random arrival order, every row group contained sellers from the whole range, so its minimum and maximum could rule out nothing. After sorting by seller, each group covered a narrow range, and nine of ten were skipped. Techniques such as sorting, and multi-column clustering such as Z-ordering, which the Delta Lake paper mentions, extend this to several columns.

## Small Files and Compaction

Streaming and frequent small batches write many small files. The remedy is **compaction**: a periodic job rewrites many small files into fewer large ones, ideally sorted. That used to be dangerous on plain directories, since readers could see the files disappearing mid-rewrite. With a transactional table format, as in [Table Formats and Transactions on Object Storage](/data-ai/table-formats), the swap is atomic and readers see either the old files or the new.

## A Checklist

1. Store analytical data in a columnar format
2. Aim for files from tens to hundreds of megabytes
3. Partition by a low or moderate cardinality column that queries filter on, usually date
4. Sort within files by the next most filtered column
5. Compact small files on a schedule
6. Check the file count and size distribution as part of table health

Layout is invisible until a query becomes slow or the storage bill rises, and then it is often the whole explanation.

## Key Points

- Columnar files with row group statistics let engines read only the needed columns and skip chunks by min and max
- Partition by a column that queries filter on and that has moderate cardinality, usually the date
- The same 18 GB a year became 365 files with a daily partition and 3.65 million with a per-seller partition
- Sorting inside files mattered: one seller's rows touched 1 of 10 row groups when sorted by seller and 10 of 10 in arrival order
- <u>Compact small files regularly, and let a table format make the rewrite atomic</u>
