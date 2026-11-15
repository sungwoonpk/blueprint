> **Data modeling** decides what the tables hold, how they relate, and which rules the database enforces. It starts from the real world and from the questions the application must answer, and the result is hard to change later.

[The Relational Model](/system-design/relational-model) showed what tables, keys and joins are. This topic is about the step before writing them: deciding which tables to have in the first place. It matters because a data model is one of the decisions that hurts to undo. Each query, service and report is written against it, as the one way doors in [Thinking in Tradeoffs](/system-design/trade-offs) described.

## Start With the Nouns

The requirements from [Functional and Nonfunctional Requirements](/system-design/requirements) already describe the data, in sentences. Underline the nouns for the **entities**, the things the system keeps track of, and the verbs for the **relationships** between them:

| From the Requirements | What It Tells Us |
| --- | --- |
| Students post books with a photo | Users create Listings, and a Listing has Photos |
| Search listings by subject | A Listing has a subject, which a Course also has |
| Message the seller | A Message is about a Listing, from one User to another |
| Mark a book as sold | A Listing has a status |
| A listing is sold to one student at most | A Listing has at most one Order |

Each entity then gets **attributes**, its properties, such as a user's name and campus or a listing's price. The result is a rough map of the data before any SQL is written.

Keep it small at first. A model with five tables you understand is a better start than twenty you drew from imagination.

## Model the Thing, Not the Page

Our first sketch has a `listings` table with a title, an author and an edition on each row. Look at what happens when twenty students sell the same calculus textbook.

Twenty rows repeat the same title and author, and a typo in one of them makes a book that search can't find. The fix is to notice there are two different things: a book as a title that exists in the world, and a listing, one particular copy someone wants to sell.

```sql
CREATE TABLE books (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  isbn      text NOT NULL UNIQUE,
  title     text NOT NULL,
  authors   text NOT NULL,
  edition   integer
);

CREATE TABLE listings (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  book_id      bigint NOT NULL REFERENCES books (id),
  seller_id    bigint NOT NULL REFERENCES users (id),
  condition    text NOT NULL CHECK (condition IN ('new', 'good', 'worn')),
  price_cents  integer NOT NULL CHECK (price_cents >= 0)
);
```

Now the book's facts live in one row, searching by ISBN finds all the copies, and a listing holds only what is specific to that copy: who sells it, in what condition, for how much.

The cost is a join whenever the title is needed, which [Indexes and Query Optimization](/system-design/indexing) will show is cheap. This question, which thing is this row about, is the most useful one in modeling.

## Relationships and Cardinality

How many of one thing can relate to how many of another is the **cardinality**, and it decides where the key goes:

| Kind | Example | How It is Stored |
| --- | --- | --- |
| One to Many | A user has many listings | A foreign key on the many side: `listings.seller_id` |
| Many to Many | A course uses many books, and a book is used by many courses | A separate join table holding both keys |
| One to One | A listing has at most one order | A foreign key marked `UNIQUE` |

A many to many link can't be stored in either table, since each row would need a list of keys, so it gets a table of its own, a **join table**. PostgreSQL's documentation shows exactly this with orders, products and order items. For courses and books:

```sql
CREATE TABLE course_books (
  course_id  bigint REFERENCES courses (id) ON DELETE CASCADE,
  book_id    bigint REFERENCES books (id)   ON DELETE CASCADE,
  PRIMARY KEY (course_id, book_id)
);
```

The two keys together form the primary key, so the same pair can't appear twice.

The `ON DELETE` choices from PostgreSQL's documentation matter: here, deleting a course should remove its reading list, so it cascades, but deleting a book that listings still point to should be blocked, which is what `RESTRICT` does. The one to one case is a single line, and the database enforces it:

```sql
listing_id  bigint NOT NULL UNIQUE REFERENCES listings (id)
```

One detail the documentation points out: a foreign key doesn't create an index on the column that holds it. Joins and deletes on `seller_id` or `book_id` will be slow without one, so you add it yourself.

## Choosing Keys

A **natural key** is a value that already identifies the thing, like an ISBN or an email address. A **surrogate key** is one the database invents, usually a number. Natural keys are tempting, and they let you down: emails change, an ISBN names an edition and not a title, and what looked unique turns out not to be.

The usual answer is a surrogate id as the primary key, with `UNIQUE` on the natural one, as `books` does above.

For the surrogate, there are two common choices:

| | Sequential Number | UUID |
| --- | --- | --- |
| Size | 8 bytes for a `bigint` | 16 bytes, a 128-bit value |
| Made By | The database, from a sequence | Any server, with no coordination |
| Guessable | Yes, `/listings/18` leads to `/listings/19` | No |
| Order | Increasing | Random for version 4, time ordered for version 7 |

PostgreSQL's documentation says an identity column comes from a sequence, which is unique only within one database, and that UUIDs are useful across distributed systems. That matters once data is split across machines, covered in [Unique ID Generation](/system-design/unique-ids).

The order matters too: random version 4 UUIDs scatter new rows across the index, while version 7 starts with a timestamp, which keeps new rows together, the property that [B-Trees](/system-design/b-trees) reward. PostgreSQL 18 can generate both.

A guessable id isn't a security problem by itself, as long as the server checks who may see each listing, as in [Authentication and Authorization](/system-design/authn-authz).

## Choosing Types

Types are part of the model, since they are rules the database enforces for free:

- **Money**: whole cents in an integer, or `numeric`, not floating point, which PostgreSQL's documentation says is inexact
- **Text**: `text` is fine for names and titles. The documentation says it performs the same as `varchar(n)`, and recommends it over an arbitrary length limit
- **Time**: `timestamptz`, which stores UTC and converts for display
- **Fixed choices**: a `CHECK` list, as for `condition` above, an `enum` type, or a small lookup table. An enum is ordered and type safe, and you can add values with `ALTER TYPE ... ADD VALUE` but not remove them. A `CHECK` is easier to change
- **Flexible extras**: `jsonb`

The last one needs care. Some data really varies: a calculus book has an edition, a lab manual might have a course code, a used laptop has specs. A `jsonb` column holds that without a new column for each case, and a GIN index makes searching inside it fast:

```sql
ALTER TABLE listings ADD COLUMN extras jsonb NOT NULL DEFAULT '{}';
CREATE INDEX listings_extras_idx ON listings USING GIN (extras);

SELECT id FROM listings WHERE extras @> '{"highlighted": false}';
```

PostgreSQL's documentation prefers `jsonb` over `json` for most uses, and describes JSON as something that complements relational tables, not replaces them. It also warns that updating a JSON document locks the whole row, so documents should stay small. The rule of thumb: anything you filter, sort or join on belongs in a real column, and `jsonb` is for the leftovers.

## Model for the Questions You Will Ask

A model is good if the questions are easy to answer. Write the main ones down, and check each against the tables:

| Question | Touches | Needs |
| --- | --- | --- |
| Show calculus books on my campus, cheapest first | listings, books, users | An index on subject and price |
| Show my conversations | messages, listings | An index on listing and time |
| Has this book been sold? | listings | A fast lookup by id |
| Which books does CS 101 use? | course_books, books | Indexes on both keys |

A question that needs many joins and scans is a sign to rethink the model, or to copy a little data on purpose, which is the subject of [Choosing Between Normalization and Denormalization](/system-design/normalization). The same habit, designing from the queries, matters even more with the databases in [Key-Value Stores](/system-design/key-value-stores) and [Document Stores](/system-design/document-stores).

## A Model That Changes

The first model will be wrong in places. Martin Fowler and Pramod Sadalage describe the practice that makes that survivable: each schema change is a small, numbered script kept in version control, applied the same way in each environment.

```text
0007_create_books_table.sql
0008_add_book_id_to_listings.sql
0009_fill_book_id_from_titles.sql
0010_make_book_id_required.sql
```

Adding a nullable column is safe to ship before the code that uses it. Removing or renaming something needs a period when old and new exist together, the expand, migrate and contract path from [Serialization and Schema Evolution](/system-design/serialization), and [Schema Migrations Without Downtime](/system-design/schema-migrations) covers it in full.

One more habit helps: if you add a `deleted_at` column instead of deleting rows, history is kept, and each query has to remember to filter on it, so decide on it early.

## Key Points

- Start from the requirements: nouns become entities, verbs become relationships, and the model should answer the real questions
- Ask which thing each row is about, as with a book and a listing, so each fact lives in one place
- Put foreign keys on the many side, give many to many links a join table, and index the columns that hold keys
- Use a surrogate key with a unique natural one, and choose between sequences and UUIDs by size, guessability and order
- <u>Use real columns for what you query</u>, and keep `jsonb` for flexible extras
- Expect the model to change, and change it through small, numbered, version controlled migrations
