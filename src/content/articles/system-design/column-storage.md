> **Column-oriented storage** keeps all the values of one column together on disk, instead of keeping each row together. A query that needs two columns out of ten reads only those two, and values of one column sit side by side, so they compress well.

The report from [OLTP, OLAP and Data Warehouses](/system-design/oltp-olap), sales per campus per month, touches two things in each order: the campus and the price. The orders table has ten columns and a million rows. A database that stores whole rows together has to read every byte of every row to get at those two values.

This topic is the storage layout that doesn't, and it is the last piece of how a warehouse is fast. It is not the same as the wide-column stores from [Wide Column Stores](/system-design/wide-column-stores), which group columns into families but keep rows together.

## Rows Together or Columns Together

Both layouts hold the same table. They differ in what is next to what on disk. For three orders:

<figure class="diagram">
<p class="rowname">Row Layout</p>
<div class="flow packets">
<div class="node">1, North, 4500</div>
<div class="node">2, South, 3000</div>
<div class="node">3, North, 5500</div>
</div>
<p class="rowname">Column Layout</p>
<div class="flow packets">
<div class="node">1, 2, 3</div>
<div class="node">North, South, North</div>
<div class="node">4500, 3000, 5500</div>
</div>
<figcaption>The same three orders, stored by row and stored by column</figcaption>
</figure>

A row store has the advantage that a whole record is in one place.

The C-Store paper, which introduced the design that later systems built on, notes that one disk write is enough to store all the fields of a record, and calls such systems write optimized, good for OLTP. A column store is read optimized, for questions over many rows that use few columns.

As the paper puts it, the database needs to read only the values of the columns the query uses.

We measured what that means for the campus report. We made a table of one million orders with ten columns, which add up to 61 bytes per row, and counted the bytes each layout must read to answer it:

<figure class="chart">
<div class="hbars" role="img" aria-label="Megabytes read for the campus report: 61 in a row store, 12 from two uncompressed columns, 2 from two compressed columns">
<div class="hbar peak"><span>Row Store</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">61.0</span></div>
<div class="hbar"><span>Two Columns</span><span class="track"><span class="fill" style="--w: 19.7%"></span></span><span class="value">12.0</span></div>
<div class="hbar"><span>Compressed</span><span class="track"><span class="fill" style="--w: 3.3%"></span></span><span class="value">2.0</span></div>
</div>
<figcaption>Megabytes a campus sales report reads, for one million orders (our own calculation)</figcaption>
</figure>

Reading two columns instead of ten cuts the bytes five times. Compression, in the next section, cuts them by more than another factor of five.

## Why Columns Compress So Well

Neighbors in a column are alike: the same few campuses, prices in a narrow range, timestamps that only grow. The C-Store paper builds on a trade that suits this. CPUs are getting faster much more quickly than disks, so it is worth spending CPU time to save disk bandwidth.

It names two ways. Code values into a compact form, such as a US state in six bits instead of a 16 bit abbreviation, and pack values tightly, so that N values of K bits take N times K bits, with no padding to whole bytes.

Parquet, a widely used column file format, and Amazon Redshift list the standard encodings. We applied the ideas to our million orders:

| Technique | Fits | Our Result |
| --- | --- | --- |
| Dictionary | Few distinct values | Campus, 6 values: 8 bytes became 3 bits |
| Bit packing | Numbers in a narrow range | Price, 1,000 to 9,000: 32 bits became 13 |
| Delta | Values that grow slowly | Timestamps: 8 MB became 0.75 MB, 6 bits each on average |
| Run length | Long repeats, such as sorted data | Sorted by campus: 6 runs for a million rows |

A dictionary replaces each value with the small number of its entry. Parquet's writer falls back to plain storage if the dictionary grows too large, and Redshift's byte dictionary holds up to 256 values for each 1 MB block.

Delta stores the first value and then the difference from each value to the one before. In Parquet each block also subtracts its smallest difference and packs the rest at the narrowest width that fits. Run length stores a value and how many times it repeats, which Redshift advises against on a sort key column.

Wikipedia's article on data orientation gives an example of the same flavor: 128 booleans take 128 bytes when stored as separate values, and 16 bytes as a bitmap. And generic compressors such as Zstandard, which Redshift offers as an encoding, work on top of these.

## Skipping Data: How Parquet Is Laid Out

A column file is cut into pieces so a reader can skip most of them. Parquet's documentation describes the hierarchy: a file holds **row groups**, each holding one **column chunk** for every column, and each chunk is divided into pages.

The file ends with a footer that has the offsets of each chunk and statistics for each: the minimum value, the maximum value and the number of nulls.

<figure class="diagram">
<div class="flow">
<div class="node">Row Group 1<small>a chunk per column</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Row Group 2<small>a chunk per column</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Footer<small>offsets and statistics</small></div>
</div>
<figcaption>A reader starts at the footer, then reads only the chunks it needs</figcaption>
</figure>

A reader opens the footer first, picks the columns it needs, and compares the statistics with the query. A query for orders sold after November 1 can skip each row group whose maximum sold time is earlier, without reading a byte of it. This is often called **predicate pushdown**.

It works best when similar values are stored together: orders loaded in time order give each group a tight range of times, so many groups can be ruled out. Parquet also has an optional page index with the same minimum and maximum for each page, so a lookup can read about one page for each column.

## The Cost of Writes

Columns make writing harder. Inserting one order into a column store means adding a value to each of ten columns, in ten places, and updating statistics. In a row store it is one append. Wikipedia's article on data orientation says rowstores are better for fast row inserts, and columnstores for analytics.

So column stores write in batches. Parquet fits this, with a footer written last after the data, as a file is written in one pass. C-Store's answer is to keep two stores.

A small writable store takes new rows, and a large read optimized store holds the rest, and a background process called the tuple mover moves batches of rows from the first to the second.

It will look familiar: it is the memtable and flush of [LSM Trees](/system-design/lsm-trees). The paper also stores the same data in several sort orders, so that different queries find their data in order, a copy for each common question.

## Where You Meet It

Wikipedia lists Parquet, ORC and Arrow as column formats, and the storage formats of BigQuery, Redshift and Snowflake belong to the same family. ClickHouse's documentation calls itself a columnar database that reads only the columns a query uses, and notes the cost: operations on whole rows become correspondingly more expensive.

| Workload | Layout |
| --- | --- |
| Many small reads and writes of whole records, such as listings and orders | Rows |
| Scans over many rows using a few columns, such as reports and trends | Columns |
| Both, on the same data | Rows for the live app, columns in the warehouse, copied in batches |

That last row is the usual answer, and it is the pipeline from [OLTP, OLAP and Data Warehouses](/system-design/oltp-olap): the app keeps its records in a row store, and the extract and load jobs turn them into columns.

That completes the tour of how data is stored. The next phase opens with [When to Go Asynchronous](/system-design/when-async), and looks at what to do when work shouldn't happen inside the request at all.

## Key Points

- A column store keeps each column's values together, so a report that needs two of ten columns reads about a fifth of the bytes, before compression
- Similar neighbors compress well with dictionaries, bit packing, delta and run length encoding, and in our example the report read 2 MB instead of 61 MB
- Parquet divides data into row groups and column chunks, and its footer statistics let a reader skip what can't match
- <u>Writes are the weak side</u>, since a row touches every column, so data is loaded in batches, often through a small write store
- Use rows for the live application and columns for analysis
