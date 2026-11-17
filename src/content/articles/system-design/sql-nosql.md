> **SQL** databases store data in related tables and are queried with SQL. **NoSQL** is a loose name for the databases that don't, and the choice between them is best made by how your data will be read and written, not by which one is newer.

In the last four topics we met key-value, document, wide-column and graph stores, and the relational model before them. Each answered a different question. This topic puts them side by side, because sooner or later a team asks the same thing: should this data go in a relational database or in a NoSQL one?

## What NoSQL Means

The name is read as "not only SQL" or as "non-relational", and either reading is fine. The two words also don't compare like with like: SQL is a query language, and NoSQL is an approach to databases.

The name took off in the late 2000s, when systems inspired by Google's Bigtable and Amazon's Dynamo, described in papers in 2006 and 2007, spread as open source projects.

They appeared for three reasons: a simple design without a fixed schema, scaling out over clusters of machines, and control over availability. Each one is built for a purpose, designed around one data model. The four families from this group:

| Family | Good At | Example in the App |
| --- | --- | --- |
| Key-Value | Fast lookups by one key | A login session |
| Document | Standalone records with a varied shape | A listing with its photos and extras |
| Wide-Column | A huge volume of writes read by key and time | Messages in conversations |
| Graph | Questions about connections, many hops deep | Books sold by friends of friends |

There are more kinds of data stores around them, such as search indexes, time series and object storage, which come later in this phase.

## The Gap is Smaller Than It Was

Two slogans used to sum up the choice: relational databases can't scale out, and NoSQL databases have no transactions. Neither is a safe rule now.

NoSQL systems have added what they lacked. Several of them, including DynamoDB and MongoDB, now support ACID transactions. The caveats remain: as [Document Stores](/system-design/document-stores) noted, MongoDB's transactions usually cost more than writes to one document.

Relational databases have moved toward flexibility. PostgreSQL stores and indexes JSON, as in [Data Modeling](/system-design/data-modeling), and the JSON and relational styles can coexist in one application. Relational databases also handle many terabytes, and [Sharding Strategies](/system-design/sharding) shows how a relational database can be split across machines when one is not enough.

So the question is no longer which kind of database can do the job. It is which one does it with the least effort and risk for this data.

## Questions That Decide

Microsoft's guidance starts from the same place: list the access patterns first, then match them to a model. Here are the questions that matter most, in the order that tends to decide the answer:

| Question | Leans Relational | Leans NoSQL |
| --- | --- | --- |
| How will the data be read? | Many different questions, joins and reports | A few known lookups by key, or by key and time |
| How firm are the rules between records? | Rules across rows, such as balances and orders | Rules inside one record |
| How regular is the data? | The same columns for each row | A varied or changing shape |
| How much must it write? | Fits one strong server and its replicas | More than one machine can take |
| How stale can a read be? | Not at all | A little, for speed or availability |

The first question carries the most weight. A relational database lets you ask questions you haven't thought of yet, and the models in the last topics ask you to decide them up front, as in [Wide Column Stores](/system-design/wide-column-stores), where each question gets its own table.

The last two questions are about scale and consistency, which later phases cover in depth, from [Replication Lag](/system-design/replication-lag) to [Consistency Models](/system-design/consistency-models).

## Choosing for the Textbook App

The app has several kinds of data, and they don't need to share an answer:

| Data | Choice | Why |
| --- | --- | --- |
| Users, Orders and Balances | PostgreSQL | Rules across rows, and credit moving between users needs a transaction |
| Listings | PostgreSQL, with a `jsonb` column for extras | The varied part is small, and the rest joins with other tables |
| Login Sessions | A key-value store | Found by one id, and they expire |
| Messages, at national scale | A wide-column store, or a sharded PostgreSQL | A huge volume of writes read by conversation and time |
| Friend Recommendations | A `friendships` table first, a graph database later | A graph when deep queries become the main workload |
| Search Over Titles | A search index | Searching inside text, as in [Full Text Search with Inverted Indexes](/system-design/search-engines) |
| Photos | Object storage | Large files, as in [Choosing Between Block, Object and File Storage](/system-design/storage-types) |

Using several stores like this is called **polyglot persistence**, and AWS's advice is that you don't always have to choose one. But each extra store has a price.

It is another system to run, back up and watch, and the same facts may now live in two places that must be kept in step, with the techniques from [Choosing Between Normalization and Denormalization](/system-design/normalization) and [The Transactional Outbox](/system-design/transactional-outbox).

The usual mistakes are adding a data model before the team can monitor and back it up, and making a search index the only copy of the data. When one service meets the requirements, use it.

With 2,000 campus users and a peak of 3,000 requests a second, a single well indexed PostgreSQL server is often enough for most of this table. The other rows are the answers for when a measured problem appears.

## Mistakes to Avoid

- **Choosing for scale you don't have**: Many products never reach the load that justifies a distributed store. Estimate first, as in [Estimating Capacity](/system-design/estimation)
- **Choosing NoSQL to skip the schema**: The schema moves into your code, where it is harder to see and enforce
- **Keeping two sources of truth**: Decide which store owns each fact, and treat the others as copies that can be rebuilt
- **Following the logo**: A database that works well for a famous company's workload may be wrong for yours

## Key Points

- NoSQL means "not only SQL" or non-relational, and covers key-value, document, wide-column and graph stores, each shaped for one kind of question
- The gap has narrowed: many NoSQL systems offer transactions, and relational databases store JSON and can be sharded
- <u>Start from the access patterns</u>: how data is read, how firm the rules are, how regular it is, how much it must write, and how stale a read can be
- One app often uses several stores, but each extra store adds work to run it and to keep copies in step
- Begin with one relational database, and add a specialized store when a measured problem calls for it
