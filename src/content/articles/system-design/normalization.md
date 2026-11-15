> **Normalization** is organizing tables so that each fact is stored in one place. **Denormalization** is storing a fact in more than one place on purpose, so reads get cheaper and writes get more work.

In [Data Modeling](/system-design/data-modeling) we split books from listings so a title lives in one row. That was normalization, done by instinct. This topic gives the idea its rules, shows what it costs, and explains when a team should undo it on purpose.

## One Fact in One Place

Suppose the textbook app began with one wide table, a row per listing that carries everything about the book and the seller:

| listing | book | author | seller | campus |
| --- | --- | --- | --- | --- |
| 17 | Calculus | Stewart | Mina | North |
| 18 | Calculus | Stewart | Jun | South |
| 19 | Linear Algebra | Axler | Mina | North |

It works until the data changes. The database tells you it is time to split the table through three kinds of trouble, called **anomalies**:

- **Update anomaly**: Mina moves to the South campus. Her campus is repeated on each of her listings, so a change that reaches row 17 but not row 19 leaves two answers
- **Insertion anomaly**: A librarian wants to add a new textbook to the catalog before anyone sells it. There is no listing yet, so the table has no place to put it
- **Deletion anomaly**: Mina sells listing 19 and deletes the row. The one row that said the book exists, and who wrote it, goes with it

All three come from the same cause: one row holds facts about several different things. Edgar Codd, who invented the relational model, defined the cure in the early 1970s. He called it normalization, and it is a set of rules for where each fact belongs.

## The Normal Forms in Plain Words

Each rule is a **normal form**, and each builds on the one before. They rest on one idea: some columns determine others. A listing's `id` determines its price. A seller's id determines their campus. Trouble appears when a column is placed in a table whose key does not determine it.

| Form | Rule | Broken By | Fix |
| --- | --- | --- | --- |
| First (1NF) | One value in each cell | A `photos` column holding `a.jpg, b.jpg` | A `photos` table with a row per photo |
| Second (2NF) | Each column depends on the whole key | `book_title` in `course_books`, whose key is course and book | Keep the title in `books` |
| Third (3NF) | Each column depends on the key and on nothing else | `seller_campus` in `listings`, since the seller decides it | Keep the campus in `users` |
| Boyce-Codd (BCNF) | Whatever determines another column is itself a key | A table of student, course and professor, where each professor teaches one course | One table for professor and course, one for student and professor |

A common saying sums up the first three: each column depends on the key, the whole key, and nothing but the key.

Wikipedia's article on database normalization says the forms beyond the fourth are mainly of academic interest, since the problems they solve rarely appear in practice. It also says that fixing a problem at one level often fixes the next, so a design is often normalized by thinking it through, not by checking each form in turn.

For most applications, third normal form is the place to stop. Now we can name what `listings`, `books` and `users` already were in the last topic: three tables, each about one thing, in 3NF.

## What Normalization Costs

The price is paid when you read. A listing page needs the title from `books` and the seller's name and campus from `users`, so the query joins three tables:

```sql
SELECT l.id, b.title, b.authors, u.name, u.campus, l.price_cents
FROM listings l
JOIN books b ON b.id = l.book_id
JOIN users u ON u.id = l.seller_id
WHERE l.book_id = 52
ORDER BY l.price_cents
LIMIT 20;
```

With an index on `listings (book_id, price_cents)`, as in [Indexes and Query Optimization](/system-design/indexing), a single database server can answer this quickly, and for many apps that is the end of the story. A join is not slow by nature.

The cost becomes real in a few places:

- **Rows on different machines**: Once data is split across servers, as in [Sharding Strategies](/system-design/sharding), a join may have to cross the network
- **Stores without joins**: Many databases in [Key-Value Stores](/system-design/key-value-stores) and [Document Stores](/system-design/document-stores) don't offer the join, so the data has to arrive already combined
- **Big scans**: A report over millions of rows pays for the join on each of them, which is why [OLTP, OLAP and Data Warehouses](/system-design/oltp-olap) systems are often shaped differently

## Copying on Purpose

When a hot read pays for a join that the data barely needs, you can copy the fact next to where it is read. Here are the common ways, each with its own price:

| Technique | Example | Kept in Sync By |
| --- | --- | --- |
| Copied Column | `seller_campus` stored on `listings` | Updating both places together |
| Stored Count | `copies_open` stored on `books` | Updating it with each listing change |
| Summary Table | Sales per campus per day | A job that rebuilds it |
| Materialized View | Cheapest copy of each book per campus | Refreshing the view |
| Embedded Document | A listing document that holds the seller's name | The application, or events |

The comparison is easiest to see on the campus example. A seller with 40 listings moves campuses, and the two designs spend their work in opposite places:

<figure class="diagram">
<p class="rowname">Normalized Read</p>
<div class="flow">
<div class="node">Listing<small>1 row</small></div>
<div class="arrow" data-label="join" aria-hidden="true"></div>
<div class="node">Book<small>1 row</small></div>
<div class="arrow" data-label="join" aria-hidden="true"></div>
<div class="node">Seller<small>1 row</small></div>
</div>
<p class="rowname">Copied Read</p>
<div class="flow">
<div class="node">Listing<small>holds title and campus</small></div>
</div>
<p class="rowname">Normalized Write</p>
<div class="flow">
<div class="node">Seller<small>1 update</small></div>
</div>
<p class="rowname">Copied Write</p>
<div class="flow">
<div class="node">Seller<small>1 update</small></div>
<div class="arrow" data-label="and" aria-hidden="true"></div>
<div class="node hot">Listings<small>40 updates</small></div>
</div>
<figcaption>The copy moves work from the read to the write</figcaption>
</figure>

If a page is read thousands of times for each time a seller moves, the trade is a bargain. The write has to be done carefully, though. In PostgreSQL, the two updates go in one transaction, so a reader does not see half of the change:

```sql
BEGIN;
UPDATE users    SET campus = 'South'        WHERE id = 3;
UPDATE listings SET seller_campus = 'South' WHERE seller_id = 3;
COMMIT;
```

A materialized view moves the same bargain into the database. PostgreSQL's documentation describes it as a stored result of a query, like a table you can't edit directly. It is only as current as the last refresh, and the database does not refresh it for you. Here is the cheapest copy of each book per campus:

```sql
CREATE MATERIALIZED VIEW cheapest_copy AS
SELECT l.book_id, u.campus,
       min(l.price_cents) AS cheapest,
       count(*)           AS copies
FROM listings l
JOIN users u ON u.id = l.seller_id
GROUP BY l.book_id, u.campus;

CREATE UNIQUE INDEX ON cheapest_copy (book_id, campus);
REFRESH MATERIALIZED VIEW CONCURRENTLY cheapest_copy;
```

The unique index is what lets `CONCURRENTLY` refresh the view without blocking the readers who are using it. A scheduled job, perhaps every few minutes, repeats the last line.

## Keeping Copies Honest

A foreign key, as in [Data Modeling](/system-design/data-modeling), keeps a reference true: it makes sure that a seller exists. It does not check that two copies of the same fact agree. That job moves to you, and there are three common ways to do it:

- **Same transaction**: Write the source and the copies together, as above. The copies do not disagree, at the price of a bigger write. See [Transactions and ACID](/system-design/transactions-acid)
- **Refresh later**: Rebuild the copy on a schedule, as with the materialized view. Readers may see old data until the next refresh
- **Follow events**: Publish a change when the source changes, and let other parts of the system update their own copies, as in [Event-Driven Architecture](/system-design/event-driven) and [The Transactional Outbox](/system-design/transactional-outbox). Copies in other databases, caches and search indexes often work this way, and they are a little behind

The right choice depends on what the copied data is like. MongoDB's documentation sorts duplicated data by how it behaves, and the same sorting helps in any database:

| Kind | Example | Verdict |
| --- | --- | --- |
| Never Changes | A book's ISBN on an order line | Copy freely |
| Snapshot of a Moment | The price paid and the seller's name on an order | Copy, and leave it as it was, since the history is the point |
| Changes Rarely | A seller's campus | Copy, and update it with the source |
| Changes Often | How many copies of a book are open now | Read it from the source, or accept that it is a little stale |
| Grows Without Limit | All messages about a listing | Keep them in their own table |

The second row is the surprise. Some copies are not a shortcut at all but the correct design: a receipt must show the price the buyer paid, even after the listing changes.

Microsoft's documentation for Azure Cosmos DB adds two tests that agree with this table. Embed data that is queried together, changes rarely and stays small. Keep it separate when it changes often or can grow without a bound. For databases without joins it goes further, and says to denormalize by default and make the exceptions deliberate.

## Deciding in Practice

A habit that works for most teams has four steps:

1. **Start normalized**: It is correct and cheap to change, and the schema stays easy to explain
2. **Measure**: Find the slow query with real numbers, as in [Logs, Metrics and Traces](/system-design/observability)
3. **Try the cheap fixes first**: A missing index or a smaller result often solves the problem without any copy
4. **Copy where it pays**: Pick a hot read, copy data that changes rarely, and write down how the copy is kept in sync

Data that is read much more often than it is written, such as a catalog or a profile, tends to deserve a copy. Data that changes with each action rarely does. Warehouse systems for analytics go further and often store wide, flat tables, since they are mostly read, as [Columnar Storage](/system-design/column-storage) explains.

## Key Points

- Normalization stores each fact once, which avoids update, insertion and deletion anomalies
- Third normal form, where each column depends on the key and on nothing else, is the usual stopping point
- Normalized reads need joins, which is cheap on one server and costly across machines, in stores without joins, or over big scans
- Denormalization moves work from reads to writes and adds a duty: keeping the copies in sync
- <u>Start normalized, measure, then copy data that changes rarely</u> where a hot read pays for it
