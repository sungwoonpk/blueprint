> A **document store** is a database that keeps each record as a complete document, usually JSON, and can look inside it to search, index and update individual fields. It sits between a [Key-Value Stores](/system-design/key-value-stores), which treats the value as opaque, and a relational database, which splits a record across tables.

In the last topic we ended at a signal: when you start asking questions about what is inside the values, a plain key-value store stops being enough.

A document store is the next step. It keeps the habit of looking things up by key, and adds the ability to ask "which listings from the North campus cost under 20 dollars?"

## A Listing as a Document

In [Data Modeling](/system-design/data-modeling) a listing was spread over several tables: `listings`, `books`, `users`, `photos`. Showing one listing page took joins. In a document store, the same listing is one document:

```json
{
  "_id": 17,
  "title": "Calculus, Early Transcendentals",
  "price_cents": 4500,
  "condition": "good",
  "seller": { "id": 3, "name": "Mina", "campus": "North" },
  "photos": ["17-a.jpg", "17-b.jpg"],
  "extras": { "edition": 8, "highlighted": false }
}
```

A **document** is a set of named fields whose values can be numbers, strings, lists, or other documents nested inside. Documents live in a **collection**, roughly the counterpart of a table, and each one has a unique `_id`.

MongoDB, a widely used store of this kind, saves documents in BSON, a binary form of JSON with more types, and limits a document to 16 MiB.

A document store differs from a key-value store in one way: it reads the structure inside the value, and that is how it can offer queries and indexes. Compared with the relational layout, one read returns the whole listing, with no joins.

Documents in one collection don't have to look alike. A listing for a used laptop can carry `"extras": { "cpu": "8 cores", "ram_gb": 16 }` while a textbook carries an edition, and the database doesn't mind. That is a feature: you can add a field without rewriting old documents or running a migration.

## Asking Questions Inside Documents

The queries use the structure. Dot notation reaches into nested fields, and indexes work on them, with the same ideas as in [Indexes and Query Optimization](/system-design/indexing). Here is the MongoDB shell, `mongosh`:

```javascript
db.listings.createIndex({ "seller.campus": 1, price_cents: 1 })

db.listings.find(
  { "seller.campus": "North", condition: "good" },
  { title: 1, price_cents: 1 }
).sort({ price_cents: 1 }).limit(20)

db.listings.updateOne(
  { _id: 17 },
  { $set: { price_cents: 4000 } }
)
```

The first line builds an index on two fields, one of them inside the nested `seller`. The second is a query with a filter, a projection that names the fields to return, a sort and a limit.

The third changes one field in place. In MongoDB a write to one document is atomic, so a reader never sees half of an update.

This should look familiar. In [Data Modeling](/system-design/data-modeling) we put flexible extras in a PostgreSQL `jsonb` column and searched it with `@>` and a GIN index. JSON and relational approaches can coexist in one application. A document store takes the same idea and builds the whole database around it.

## Embed or Reference

The main design question in a document store is what goes inside a document and what lives in its own. **Embedding** copies related data into the document, as `seller` and `photos` are above. **Referencing** stores only an id, as in the relational case, and the app or the database follows it.

The advice comes down to three questions:

| Question | Embed When | Reference When |
| --- | --- | --- |
| How Does It Grow? | It stays small and bounded | It can grow without a limit |
| How Often Does It Change? | Rarely | Often |
| Is It Used on Its Own? | No, it is read with the parent | Yes, it has its own pages or many parents |

Here is how the textbook app answers them:

<figure class="diagram">
<p class="rowname">Inside the Listing Document</p>
<div class="flow">
<div class="node">Photos<small>a few, bounded</small></div>
<div class="node">Seller Summary<small>name and campus</small></div>
<div class="node">Extras<small>fields by item type</small></div>
</div>
<p class="rowname">In Their Own Collections</p>
<div class="flow">
<div class="node">Messages<small>grow without limit</small></div>
<div class="node">Orders<small>live on their own</small></div>
<div class="node">Users<small>change, have many listings</small></div>
</div>
<figcaption>What to embed and what to keep apart</figcaption>
</figure>

Photos are bounded and shown with the listing, so they are embedded. Messages about a listing can pile up, and each one is read and written alone, so they get their own collection with a `listing_id`.

The same reasoning applies to blog comments: an array that can grow without a limit makes the parent bigger to read and slower to update.

The seller is the middle case, and the common answer is a **hybrid**: embed a small copy, the name and campus, and keep the full profile in `users`. This is the copy on purpose from [Choosing Between Normalization and Denormalization](/system-design/normalization), and it comes with the same bill.

When Mina changes her campus, each of her listings holds an old copy. Duplicated data can be sorted by how it changes, and data that rarely changes, like a campus, is a good fit for copying.

## Flexible, Not Schemaless

A document store has no schema it enforces by default, but your app still has one, in the code that reads the documents. Two things follow.

Old documents keep their old shape until someone rewrites them, so code has to cope with both, and a `schema_version` field in each document helps. This is the gradual change from [Serialization and Schema Evolution](/system-design/serialization), and [Schema Migrations Without Downtime](/system-design/schema-migrations) shows the process.

You can also ask the database to check the shape. MongoDB accepts rules written as JSON Schema on a collection, and by default it rejects writes that break them:

```javascript
db.createCollection("listings", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["title", "price_cents"],
    properties: {
      price_cents: { bsonType: "int", minimum: 0 }
    }
  } }
})
```

The rules can be as loose or as strict as you choose. They play the role of the constraints from [The Relational Model](/system-design/relational-model), without forcing all documents into one shape.

## Transactions and Copies

Because a document holds a whole listing, many updates are a single write, and a single write is atomic. That is the quiet strength of embedding: no transaction is needed to keep the photos and the price together.

Changes that cross documents are harder. Updating Mina's campus in the 40 listings that copy it is 40 writes, the same cost as in the diagram from the normalization topic:

```javascript
db.listings.updateMany(
  { "seller.id": 3 },
  { $set: { "seller.campus": "South" } }
)
```

MongoDB offers transactions that span several documents, in the sense of [Transactions and ACID](/system-design/transactions-acid), but they come with caveats.

They usually cost more than writes to one document, they run under a time limit that is one minute by default, and they should not replace good schema design. A model that needs one for each routine operation may be a sign that the data wants tables.

## When Documents Fit

Document stores fit data that is read and written as a unit and has a shape that varies:

- **Catalogs and profiles**: Items with different attributes, like listings for books, laptops and lab goggles
- **Content**: Posts, articles and settings that are loaded whole
- **Snapshots**: An order that keeps the title and price as they were at purchase, as in [Choosing Between Normalization and Denormalization](/system-design/normalization)

They fit less well when the data is full of many to many relationships that you query from every side, or when rules must hold across several kinds of records at once. A used textbook marketplace has both kinds.

Listings suit documents, and balances and orders might suit tables. Many teams run one of each, or use PostgreSQL with `jsonb` for both. [Choosing Between SQL and NoSQL](/system-design/sql-nosql) puts the comparison together once all the NoSQL families have been seen.

## Key Points

- A document store keeps complete JSON like documents and, unlike a key-value store, can query, index and update fields inside them
- Embed data that is small, bounded, changes rarely and is read with its parent, and reference data that grows without limit, changes often or is used on its own
- A write to one document is atomic, so embedding gives atomicity for free, while changes across documents are separate writes or costly transactions
- <u>The schema is flexible, not absent</u>: your code still depends on a shape, so version it, validate it and migrate it with care
- Documents fit varied, standalone data, and tables fit data with many relationships and cross record rules
