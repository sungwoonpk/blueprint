> The **relational model** stores data as tables of rows that all have the same columns, and links tables through keys. **SQL** is the language for asking questions of those tables, and databases such as PostgreSQL, MySQL and SQLite are built on the idea.

So far the textbook app has had "a database", drawn as a box. This phase opens the box.

In [What is System Design?](/system-design/what-is-system-design) a single line, `SELECT title, price FROM listings WHERE subject = ?`, fetched the listings, and in [From One Server to Many](/system-design/one-server-to-many) that database grew a primary and replicas. This topic is about what is inside: how relational databases organize data, and why they are the usual first choice.

The idea comes from Edgar F. Codd at IBM in the late 1960s and early 1970s: describe data as relations and let people ask for what they want, without writing code that walks through storage. IBM's first query language for it was called SEQUEL, later shortened to SQL.

Relational Software, now Oracle, shipped one of the first commercial SQL databases in 1979, and ANSI made SQL a standard in 1986.

## Tables, Rows and Keys

A table is a named collection of rows. Each row has the same named columns, and each column has a type. Here are some columns of the textbook app's `listings` table:

| id | seller_id | title | price_cents |
| --- | --- | --- | --- |
| 17 | 3 | Calculus, Early Transcendentals | 4500 |
| 18 | 3 | Linear Algebra Done Right | 3000 |
| 19 | 8 | Intro to Algorithms | 5500 |

Tables are defined with their columns, types and rules, called **constraints**:

```sql
CREATE TABLE users (
  id      bigint PRIMARY KEY,
  name    text NOT NULL,
  campus  text NOT NULL,
  email   text NOT NULL UNIQUE
);

CREATE TABLE listings (
  id           bigint PRIMARY KEY,
  seller_id    bigint NOT NULL REFERENCES users (id),
  title        text NOT NULL,
  subject      text NOT NULL,
  price_cents  integer NOT NULL CHECK (price_cents >= 0),
  status       text NOT NULL DEFAULT 'available',
  created_at   timestamptz NOT NULL DEFAULT now()
);
```

Each constraint does a job:

- **PRIMARY KEY**: values that are unique and not empty, so each row can be pointed at by its id
- **NOT NULL** and **CHECK**: refuse missing values and impossible ones, such as a negative price
- **UNIQUE**: no two rows may share a value, so two users can't register the same email
- **REFERENCES**: a **foreign key**, which says `seller_id` must match the `id` of a real row in `users`

That last one is called referential integrity. The database itself refuses to create a listing for a seller who doesn't exist, whatever bug is in the application. PostgreSQL also lets you choose what happens when the referenced row is deleted: block it, delete the dependent rows too with `CASCADE`, or set the column to null.

Two details in the definition connect to earlier topics. The price is a whole number of cents, the choice from [Serialization and Schema Evolution](/system-design/serialization), because floating point numbers are inexact, and money needs an exact type.

And `timestamptz` stores a moment in UTC and converts it to each viewer's time zone on display, which avoids a whole class of date bugs.

One more fact: SQL doesn't promise any order for rows. If the order matters, say so with `ORDER BY`.

## Linking Tables With Keys

Why split data into several tables? Because repeating it causes trouble. If every listing row held the seller's name, campus and email, then one student changing their email would need dozens of updates, and one missed row would disagree with the rest. Instead, each fact lives in one place, and rows point to each other by key:

<figure class="diagram">
<div class="flow">
<div class="node">users<small>id, name, email</small></div>
<div class="arrow" data-label="seller_id" aria-hidden="true"></div>
<div class="node">listings<small>id, seller_id, title</small></div>
<div class="arrow" data-label="listing_id" aria-hidden="true"></div>
<div class="node">messages<small>id, listing_id, body</small></div>
</div>
<figcaption>Each arrow is a foreign key: one user has many listings, and one listing has many messages</figcaption>
</figure>

A user can sell many listings, and each listing belongs to one user. This is a **one to many** relationship, the most common kind. How to design such tables well, and when to break the rules, is the subject of [Data Modeling](/system-design/data-modeling) and [Choosing Between Normalization and Denormalization](/system-design/normalization).

## Joins

To use data from two tables at once, a **join** pairs up rows that share a key. This query lists calculus books with the seller's name:

```sql
SELECT l.title, l.price_cents, u.name AS seller
FROM listings l
JOIN users u ON u.id = l.seller_id
WHERE l.subject = 'calculus';
```

The condition after `ON` says which rows belong together. Joins come in several kinds, and the difference is what happens to rows with no partner. Take three users, where Joon has posted nothing:

| users.id | name |
| --- | --- |
| 3 | Dana |
| 8 | Min |
| 9 | Joon |

| Join | Result for These Tables |
| --- | --- |
| Inner Join | Dana with her listings, and Min with hers. Joon is dropped, since he has none |
| Left Outer Join, From users | The same rows, plus Joon with empty listing columns |
| Right Outer Join, From users | Every listing with its seller, and no users without listings |
| Full Outer Join | Everything from both sides, with empty columns where there is no match |
| Cross Join | Every user paired with every listing, with no condition |

The left outer join answers a useful question: which users have never posted a listing?

```sql
SELECT u.name
FROM users u
LEFT JOIN listings l ON l.seller_id = u.id
WHERE l.id IS NULL;
```

A cross join is rarely wanted. With a million users and a million listings it produces a trillion rows, which is why joins always need a condition.

## Say What, Not How

SQL is **declarative**. The query says what result is wanted, not how to find it, and the database chooses a method. In PostgreSQL, the text is parsed, then a planner considers different ways to produce the same result, estimates the cost of each, and the cheapest plan is executed.

You can see the choice with `EXPLAIN`. The same question about calculus books can run two ways:

```text
Seq Scan on listings
  Filter: (subject = 'calculus')

Index Scan using listings_subject_idx on listings
  Index Cond: (subject = 'calculus')
```

The first reads every row, and the second jumps straight to the matches through an index.

Which one the planner picks depends on how many rows match and which indexes exist, and PostgreSQL switches between a sequential scan, an index scan and a bitmap scan as the filter changes. [Indexes and Query Optimization](/system-design/indexing) comes up soon, and it is where this choice gets decided.

## Where SQL Differs From the Theory

Codd's model works with mathematical sets, with no duplicate rows and no missing values. SQL bends both. A table can hold duplicate rows unless a key prevents it, and **NULL** marks a missing value, with no equivalent in the pure model. NULL causes the classic surprises:

- **NULL is unknown, not a value**: `WHERE campus = NULL` matches nothing, and you write `IS NULL`
- **Two NULLs aren't equal**: a `UNIQUE` column accepts many NULLs by default in PostgreSQL
- **A CHECK passes on NULL**: `CHECK (price_cents >= 0)` doesn't reject a missing price, so add `NOT NULL` as well

## What It Gives You, and What It Costs

A relational database gives you a lot for free:

- **Data that is kept valid**: constraints and foreign keys stop bad rows at the door
- **Flexible questions**: new queries over the same data, joined in ways nobody planned
- **Transactions**: several changes that succeed or fail together, covered in [Transactions and ACID](/system-design/transactions-acid)

The costs show up with scale. A join needs both tables close together, which gets awkward once data is split across machines, and the sharding in [Sharding Strategies](/system-design/sharding) makes it harder. A single primary also limits writes.

For the textbook app, though, [Estimating Capacity](/system-design/estimation) found about 6 writes a second on average and 60 at the peak, which one relational primary handles easily. That is the reason it is the usual default: for most applications, the structure and safety are worth far more than the scale limits they never reach.

## Key Points

- The relational model stores data as tables of rows with the same columns, linked by keys
- Primary keys identify rows, and constraints and foreign keys keep the data valid inside the database
- Splitting data into linked tables keeps each fact in one place, and joins bring it back together
- Join types differ in what they do with rows that have no match, and a join always needs a condition
- <u>SQL says what, and the planner decides how</u>, using indexes and cost estimates
- NULL means unknown, so compare with IS NULL, and remember that UNIQUE and CHECK treat it specially
