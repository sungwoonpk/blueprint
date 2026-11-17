> **CQRS**, Command Query Responsibility Segregation, uses one model to change data and a different model to read it. Commands go to the write side, queries go to a read side shaped for the screens, and events keep the read side up to date.

The textbook app has two jobs on its listings. A seller posts one: the form is checked, the price must be positive, the seller must be verified, and the photos must be saved.

A buyer searches: a page of 20 results, each with a title, an author, a price, the seller's name and rating, and the first photo.

At first both use the same tables, and the search page joins five of them. Writes want a tidy structure with rules. Reads want a flat row for each card, and there are far more reads than writes, as in [Choosing Between Normalization and Denormalization](/system-design/normalization). CQRS gives each side its own model.

## Commands and Queries

The idea comes from a rule for single methods. Bertrand Meyer's command query separation says a method either returns a result with no side effects, a **query**, or changes state and returns no value, a **command**. A query can be called anywhere, in any order, with confidence.

CQRS applies the same split to whole models: it means using a different model to update information than the one used to read it, an idea that comes from Greg Young. Queries return plain data objects with no domain logic.

| Side | Job | Shaped By |
| --- | --- | --- |
| Command (Write) | Check the rules, change the data | Business rules and transactions |
| Query (Read) | Return exactly what a screen needs | The screens and their speed |

Commands should describe a business task, such as `PostListing`, and not a low level update such as `SetListingStatusOpen`. The task keeps the rules in one place, and it gives the write side something that can fail with a reason.

## Two Models, Two Stores

The separation has two levels.

The simplest form is two models in one database. The write model has the rules and the transactions, and the read model is a set of queries that return flat objects. It is a good starting point.

The fuller form is two models in two stores. Each side can use the technology and the scaling that suits it. A typical pair is a relational database for writes and a document database for reads, and other combinations of relational and NoSQL stores work on either side.

With two stores, something must carry changes from one to the other.

<figure class="diagram">
<div class="flow">
<div class="node">Command<small>PostListing</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Write Side<small>rules, tables</small></div>
<div class="arrow" data-label="events" aria-hidden="true"></div>
<div class="node">Projector<small>updates cards</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Read Side<small>flat cards</small></div>
</div>
<figcaption>Commands change the write side, and events build the read side that queries use</figcaption>
</figure>

The read side is a **projection**, a table built from the events of the write side. Microsoft's pattern for it is called the materialized view, a prepopulated read model that can be thrown away and rebuilt from its sources.

It is called a view database: a copy built for reading and designed for one query or a group of them, kept current by subscribing to the events of the services that own the data.

## What the Read Side Buys

In the textbook app the read side is one table with a row for each listing card:

```sql
CREATE TABLE listing_cards (
  listing_id   bigint PRIMARY KEY,
  book_id      int NOT NULL,
  posted_at    timestamptz NOT NULL,
  title        text, author text,
  price_cents  int,
  seller_name  text, seller_rating real,
  photo_url    text,
  version      int NOT NULL
);
CREATE INDEX ON listing_cards (book_id, posted_at DESC);
```

We measured this in our own toy test on one laptop, with SQLite in memory, 100,000 listings and 2,000 books. The search page as a join over listings, books, sellers, photos and ratings took 0.089 ms on average for 20 results. The same page read from `listing_cards` took 0.017 ms, about 5 times faster.

Both are small because everything was in memory and the tables had indexes, and the gap grows with bigger tables and a slower disk. At the 3,000 requests a second of registration day, a 5 times cheaper read is a large share of the load.

The read model also changes without touching the write side. A new screen means a new projection, built by replaying the events, and a read store can be a search engine or a cache if that is the better fit.

The gains: independent scaling of reads and writes, schemas tuned to each, a simpler query side and better security, since just the write side needs permission to change data.

## Keeping the Read Side Current

Writes and the events that describe them must not disagree, which is the dual write problem from [The Transactional Outbox](/system-design/transactional-outbox). The fix is that outbox, together with an idempotent consumer, because duplicates arrive.

Reading the changes from the log with [Change Data Capture](/system-design/cdc) is another route, and with [Event Sourcing](/system-design/event-sourcing) the events are the write model, so the projection reads them directly.

The projector's handler should be safe to repeat and to receive out of order, as in [Idempotency and Safe Retries](/system-design/idempotency). A version column does both:

```sql
INSERT INTO listing_cards (listing_id, book_id, posted_at, title, price_cents, version)
VALUES (17, 4, now(), 'Linear Algebra', 4500, 1)
ON CONFLICT (listing_id) DO UPDATE
  SET price_cents = EXCLUDED.price_cents, version = EXCLUDED.version
  WHERE listing_cards.version < EXCLUDED.version;
-- an old or repeated event matches no row and changes no data
```

If a projection has a bug or a new column, rebuild it: views can be regenerated from the history, and for long histories periodic snapshots mean the whole history need not be read again.

## The Price: Stale Reads

Two stores mean the read side trails the write side, a delay called eventual consistency. The delay is short, and it still shows. We simulated a read side that takes 200 ms on average to apply an event, with random delays that average that.

A seller who posts a listing and sees the next page 100 ms later would miss it in 60.8 percent of the posts. After 1 second, 0.65 percent still missed it, and after 2 seconds, 0.01 percent.

The numbers depend on our assumed delay, and the shape holds: most readers see the change soon and a few see the old page. The usual remedies follow.

The response to `PostListing` can carry the new listing, so the page shows it without asking the read side. A user interface can show pending work, listing the commands still being processed, so the user sees that the change was accepted. A command that fails after it was accepted is reported by a notification, since it can't answer at once. And one more remedy is to read from the write side for a moment: after a user's own write, serve that user's next read from the write store.

A similar point for commands: validate in the client where possible, so most commands succeed, and queue the rest. The design has to expect that a user may act on stale data and decide what happens then.

## When Not to Use It

For most systems CQRS adds risky complexity, and most systems fit a plain create, read, update and delete model.

He says most of the cases he has met went badly, and advises using it in a part of a system, within one bounded context, and not across the whole. Two models, a projector, a queue and a lag to manage are a lot to run.

He also names a lighter option: if just some queries are heavy, copy data to a reporting database and keep everything else as it was.

The cost is worth it in a few cases.

It pays when many people change the same data, as in collaborative environments and task based screens. It pays when reads and writes have different needs, such as workloads that read much more than they write and need to scale separately. And it pays for queries across services, where one query needs data from several services that each own theirs. A view database is one answer, and API composition, which calls the services and joins the results, is the alternative.

Skip it when the domain and the rules are simple. In the textbook app, the listing search is a fit: many more reads than writes, and a shape that differs from the tables. The seller's profile page is a plain table that one model handles.

## Key Points

- CQRS gives writes and reads separate models, where commands check rules and change data and queries return what a screen needs
- The two can share one database, or use two stores with events carrying changes across, preferably through an outbox or a log reader
- <u>The read side is a projection</u> that can be rebuilt from events, and a version check makes its handler safe to repeat
- Two stores mean stale reads, so answer from the command, show pending work, and expect users to act on old data
- Most systems don't need it, so use it for one part with many readers or collaborating writers, and keep plain tables elsewhere

