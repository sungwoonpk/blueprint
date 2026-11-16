> An **index** is an extra, sorted structure that holds one or more columns of a table and points back to its rows, so the database can find matching rows without reading the whole table. **Query optimization** is the work of making the database read fewer rows to answer a question.

On registration day the textbook app has 3,000 searches a second, and nationally it holds 3 million listings. Without help, each search would read the rows of the whole `listings` table to find the few that match. At that size one question decides how the app feels: how does the database find a row without looking at all of them?

A database without a helpful index falls back to a **sequential scan**: it reads each row and keeps the ones that match. It is the right choice for a tiny table, and far too slow for a big one.

## What an Index Is

You met the idea in a data structures course: keep the keys sorted in a tree, and a lookup takes a few steps instead of a pass over everything. Most relational databases use this kind of index, the **B-tree**, and [B-Trees](/system-design/b-trees) shows how it is stored and kept balanced. Here, what matters is how a lookup behaves:

<figure class="diagram">
<div class="flow">
<div class="node">Root<small>1 page</small></div>
<div class="arrow" data-label="narrow" aria-hidden="true"></div>
<div class="node">Branch<small>1 page</small></div>
<div class="arrow" data-label="narrow" aria-hidden="true"></div>
<div class="node">Leaf<small>1 page</small></div>
<div class="arrow" data-label="row id" aria-hidden="true"></div>
<div class="node">Table Row<small>1 page</small></div>
</div>
<figcaption>A lookup walks down the tree, then jumps to the row</figcaption>
</figure>

Each step narrows the search, and for millions of rows an index is often only a few levels deep. The site Use The Index, Luke describes three parts of a lookup that can cost time: walking down the tree, following the chain of leaf pages when many entries match, and fetching each matching row from the table.

The first part is cheap and bounded. The other two grow with the number of matches, which is why a good index is one that matches few rows.

Creating one is a single statement. PostgreSQL's documentation says you can add or remove an index at any time:

```sql
CREATE INDEX listings_seller_idx ON listings (seller_id);
```

A primary key or a `UNIQUE` constraint creates its index automatically. A foreign key does not, as [Data Modeling](/system-design/data-modeling) pointed out, so `seller_id` and `book_id` need theirs.

## Putting Columns in Order

The search the app runs most is "the 20 cheapest copies of this book", the query from [Choosing Between Normalization and Denormalization](/system-design/normalization):

```sql
SELECT id, price_cents
FROM listings
WHERE book_id = 52
ORDER BY price_cents
LIMIT 20;
```

One index on `book_id` finds the copies of that book quickly. Suppose it has 900 of them. The database still has to read all 900 and sort them to find the cheapest 20. An index on both columns does better, because it is sorted by `book_id` first and by `price_cents` within each book:

```sql
CREATE INDEX listings_book_price_idx
  ON listings (book_id, price_cents);
```

Think of a library shelf sorted by subject, then by title within each subject. Finding the first twenty titles in one subject is a walk along the shelf, with no sorting needed. PostgreSQL's documentation says the same of `ORDER BY ... LIMIT`: a B-tree index can hand back entries already in order, so the search stops after twenty.

| Index | How the Search Runs | Rows Read |
| --- | --- | --- |
| None | Read all listings, keep book 52, sort | 3,000,000 |
| `book_id` | Read the 900 copies of book 52, sort them | 900 |
| `book_id, price_cents` | Read the first 20 entries in order | 20 |

The numbers are made up, but the shape is real: each index stops the database from reading rows it throws away.

The order of the columns matters. The rule from both PostgreSQL's and MySQL's documentation is that a multicolumn index helps most when the query constrains its leftmost columns.

An index on `(book_id, price_cents)` serves a search on `book_id`, or on both. A search on `price_cents` alone gets little from it, as a shelf sorted by subject doesn't help someone who knows only a title. PostgreSQL 18 can sometimes skip over the first column when it has few distinct values, but it is not something to plan around.

A good habit is to put the columns you compare with equality first, and the column you sort or compare with a range last. PostgreSQL's documentation suggests using multicolumn indexes sparingly: one well chosen index is usually better than a wide one, and indexes with more than three columns are rarely helpful.

## Indexes That Do More

Three variations are common:

- **Covering index**: If the index holds every column the query needs, the database can answer without visiting the table. In PostgreSQL this is an index-only scan, and `INCLUDE` adds extra columns to carry along. The documentation warns that it only pays when the table's pages are mostly unchanged, since the database has to check that rows are visible
- **Partial index**: An index over some rows only, chosen with a `WHERE` clause. If most of the 3 million listings are sold, an index of the open ones is much smaller. The query has to repeat the condition so the database can see that the index applies
- **Expression index**: An index on a computed value, such as a lowercase email. A query that wraps a column in a function can't use a plain index on that column, but it can use an index built on the same expression

```sql
-- Covering: carry the seller along
CREATE INDEX listings_cover_idx
  ON listings (book_id, price_cents) INCLUDE (seller_id);

-- Partial: only the open listings
CREATE INDEX listings_open_idx
  ON listings (book_id, price_cents) WHERE status = 'open';

-- Expression: for WHERE lower(email) = lower($1)
CREATE INDEX users_email_lower_idx ON users (lower(email));
```

## What an Index Costs

An index is a second copy of some of the data, and it has to stay correct. Each insert, update or delete that touches an indexed column has to change each index that covers it:

<figure class="diagram">
<div class="flow">
<div class="node">New Listing</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Table<small>listings</small></div>
<div class="node">Index<small>book and price</small></div>
<div class="node">Index<small>seller</small></div>
<div class="node">Index<small>open listings</small></div>
</div>
</div>
<figcaption>One new row means a write to the table and to each index</figcaption>
</figure>

PostgreSQL's documentation states the overhead plainly, and adds that an index that is seldom or never used should be removed. MySQL's documentation says the same: extra indexes use space and slow inserts, updates and deletes.

That makes the choice a trade, in the sense of [Thinking in Tradeoffs](/system-design/trade-offs). Reads get faster and writes get slower, so a table that is mostly read, like listings, can afford several indexes, and one that is mostly written, like a log of page views, should have very few.

## When the Database Ignores an Index

Indexes are not applied by command. The database's **query planner** estimates the cost of each way to run a query and picks the cheapest. Sometimes it is right to skip the index, and sometimes the index can't be used at all:

- **A tiny table**: Reading one page is cheaper than reading an index and then the page
- **Too many matches**: If a query needs a large part of the table, a sequential scan beats thousands of random trips to the table. PostgreSQL's documentation shows a query that matches about 70 percent of a table staying a scan
- **A missing leading column**: A search on the second column of a two column index, as above
- **A function on the column**: `WHERE lower(email) = ...` with no matching expression index
- **A conversion**: A comparison that forces the database to convert the column, such as a text column compared with a number. MySQL's documentation lists this as a way to lose an index
- **A leading wildcard**: `LIKE '%calculus'` can't use sorted order, since the start of the value is unknown. Searching inside text is the job of [Full Text Search with Inverted Indexes](/system-design/search-engines)
- **Old statistics**: The planner guesses from sampled numbers about each column. If a table changed a lot since the last `ANALYZE`, the guesses can be far off. Autovacuum normally keeps them current

## Reading a Query Plan

To see what the planner chose, put `EXPLAIN ANALYZE` in front of the query. It prints the plan and runs the query, so the timings are measured, not guessed. Here is the book search without a helpful index, shortened and with invented numbers:

```text
Limit  (actual time=412.1..412.2 rows=20.00)
  ->  Sort  (actual time=412.1..412.1 rows=20.00)
        Sort Key: price_cents
        Sort Method: top-N heapsort
        ->  Seq Scan on listings
              (actual time=0.9..411.0 rows=900.00)
              Filter: (book_id = 52)
              Rows Removed by Filter: 2999100
Execution Time: 412.4 ms
```

And with `listings_book_price_idx` in place:

```text
Limit  (actual time=0.03..0.06 rows=20.00)
  ->  Index Scan using listings_book_price_idx
        (actual time=0.03..0.05 rows=20.00)
        Index Cond: (book_id = 52)
Execution Time: 0.09 ms
```

Three things are worth reading in any plan:

- **The scan type**: `Seq Scan` reads the whole table. `Index Scan` walks an index and fetches the rows. `Index Only Scan` skips the table. `Bitmap Heap Scan` collects the row locations first and then reads the table pages in order, a middle road when a moderate share of rows match
- **Rows removed**: A large `Rows Removed by Filter`, as above, means the database read many rows only to throw them away
- **Estimated and actual rows**: A plan shows both the planner's guess and the real count. A big gap, such as a guess of 10 rows and a count of 100,000, usually means stale statistics, and `ANALYZE` is the first thing to try

Joins have their own nodes. A **nested loop** looks up the inner table once for each outer row, which suits a small outer side and an indexed inner side. A **hash join** builds a hash table from one input and probes it, which suits larger inputs. A **merge join** walks two sorted inputs together.

One caution comes straight from the PostgreSQL documentation: with `ANALYZE`, the statement really runs. For an `UPDATE` or `DELETE`, wrap it in `BEGIN` and `ROLLBACK` so the change is undone.

## A Routine for Slow Queries

The same short loop fixes most slow queries:

1. **Find it**: Use the slow query log or the traces from [Logs, Metrics and Traces](/system-design/observability), and start with the queries that cost the most in total, not only the slowest one
2. **Explain it**: Run `EXPLAIN ANALYZE` on realistic data, since a plan on a ten row table says little about a plan on 3 million
3. **Compare rows read with rows returned**: A query that reads 3,000,000 rows to return 20 is the one to fix
4. **Change one thing**: Add or reorder an index, select fewer columns, or rewrite the query
5. **Measure again**: Check the new plan, and check that the writes did not get slower

Some fixes are about the query, not the index. A page that loops over 20 listings and asks for each seller separately sends 21 queries, the **N+1 problem**, where one join sends one. A page that asks for `OFFSET 10000` makes the database read and drop 10,000 rows, and the cursor approach in [Pagination](/system-design/pagination) walks an index instead.

## Key Points

- An index is a sorted structure that lets the database find rows in a few steps, where a sequential scan reads the whole table
- <u>A good index matches few rows</u>, and a multicolumn index helps most when the query uses its leftmost columns, equality first and the sort column last
- Covering, partial and expression indexes make an index smaller or let it answer more
- Each index costs space and slows writes, so index what is read often and drop what is unused
- Read the plan with `EXPLAIN ANALYZE`: the scan type, the rows removed, and the gap between estimated and actual rows
