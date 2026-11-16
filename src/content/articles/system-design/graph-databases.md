> A **graph database** stores data as **nodes**, the things, and **relationships**, the connections between them, and is built to follow those connections quickly, even many steps deep.

Suppose the textbook app wants a new feature: show Mina the books sold by her friends, and then by her friends' friends. Nothing about a single listing is hard. The hard part is the question itself, since it follows a chain of connections of unknown length. That shape of question is what graph databases are for.

## Things and Connections

The most common model is the **property graph**, which Neo4j's documentation describes in three parts. A node is an entity, and it can carry labels such as `Student` or `Book`.

A relationship connects two nodes, has one type such as `FRIEND`, and always has a direction. Both nodes and relationships can hold properties, which are key and value pairs. Here is a small piece of the app's world:

<figure class="diagram">
<svg viewBox="0 0 400 250" role="img" aria-label="Mina and Jun are friends. Both took CS 101, which uses a Calculus book. Jun sold the Calculus book." style="width:100%;max-width:440px;height:auto;display:block;margin:0 auto;color:var(--muted)">
<defs><marker id="gd-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<g stroke="currentColor" stroke-width="1.5" fill="none" marker-end="url(#gd-arrow)">
<line x1="60" y1="58" x2="60" y2="186"/>
<line x1="108" y1="40" x2="172" y2="106"/>
<line x1="108" y1="212" x2="172" y2="146"/>
<line x1="250" y1="146" x2="320" y2="192"/>
<line x1="108" y1="222" x2="316" y2="222"/>
</g>
<g font-size="12" letter-spacing="0.5" fill="currentColor" text-anchor="middle">
<text x="82" y="125" text-anchor="start">FRIEND</text>
<text x="146" y="62" text-anchor="start">TOOK</text>
<text x="146" y="198" text-anchor="start">TOOK</text>
<text x="300" y="150" text-anchor="start">USES</text>
<text x="212" y="238">SOLD</text>
</g>
<g style="fill:var(--bg);stroke:var(--border)" stroke-width="1.5">
<rect x="15" y="22" width="90" height="36" rx="10"/>
<rect x="15" y="192" width="90" height="36" rx="10"/>
<rect x="165" y="107" width="90" height="36" rx="10"/>
<rect x="315" y="192" width="80" height="36" rx="10"/>
</g>
<g font-size="14" font-weight="600" text-anchor="middle" style="fill:var(--text)">
<text x="60" y="45">Mina</text>
<text x="60" y="215">Jun</text>
<text x="210" y="130">CS 101</text>
<text x="355" y="215">Calculus</text>
</g>
</svg>
<figcaption>Four nodes and five relationships, each with a type and a direction</figcaption>
</figure>

Neo4j's documentation stresses one difference from a relational database. In a relational database, a relationship exists only as a foreign key or a join table, and you rebuild it with a `JOIN` each time.

In a graph database, relationships are stored with the nodes as first class data and can carry their own properties, such as the price on `SOLD`.

## Following Connections

Cypher, Neo4j's query language, draws the pattern it wants. Nodes go in parentheses, relationships in square brackets with an arrow. Books sold by Mina's friends:

```cypher
MATCH (me:Student {name: 'Mina'})-[:FRIEND]->(f:Student)
      -[:SOLD]->(b:Book)
RETURN b.title, f.name
```

Reading it left to right says the same as the question. The depth can change with one edit. In Neo4j's current syntax, a quantifier after a relationship says how many times to repeat it:

```cypher
MATCH (me:Student {name: 'Mina'})-[:FRIEND]->{1,3}(other:Student)
RETURN DISTINCT other.name
```

Relational databases can do this too. PostgreSQL's documentation describes `WITH RECURSIVE`, which repeats a query step until nothing new comes back. Here is the same walk over a `friendships` table, with a depth limit because friendships form loops (Mina is Jun's friend and Jun is Mina's):

```sql
WITH RECURSIVE reach(student_id, depth) AS (
    SELECT friend_id, 1 FROM friendships
    WHERE student_id = 1
  UNION
    SELECT f.friend_id, r.depth + 1
    FROM reach r
    JOIN friendships f ON f.student_id = r.student_id
    WHERE r.depth < 3
)
SELECT DISTINCT student_id FROM reach;
```

The documentation also describes a `CYCLE` clause that detects loops for you. So the question is not whether SQL can walk a graph, since it can. It is how natural the query is and how it behaves as the graph grows.

Each hop multiplies the work. If each student has 150 friends, the people reached grow like this, at most, since real friend groups overlap:

| Hops | People Reached, at Most |
| --- | --- |
| 1 | 150 |
| 2 | 22,500 |
| 3 | 3,375,000 |

That growth is why Neo4j's documentation advises giving every variable length pattern an upper bound, a label or a direction to keep the search small. It is also where graph databases claim their advantage.

Wikipedia describes **index-free adjacency**: each node keeps direct references to its neighbors, so following an edge doesn't need a lookup in a global index, and a query's cost follows the part of the graph it touches, not the size of the whole.

A relational engine does an index lookup for each hop, as in [Indexes and Query Optimization](/system-design/indexing).

The same Wikipedia article adds a caution: a graph model alone is not a reason to replace a relational database, unless measurements show large gains.

## Where Graphs Fit

Neo4j's documentation says a graph suits questions that are about the relationships between things, and not the things themselves, such as "how do I get from A to B?".

Amazon's Neptune documentation lists recommendation engines, fraud detection, knowledge graphs and network security. The thread is the same: the answer is a path or a neighborhood, and its length isn't known in advance.

For the textbook app, that could be:

- **Recommendations**: Books bought by students who took the same courses as you
- **Trust**: Is this seller connected to anyone I know?
- **Fraud checks**: Do these ten accounts share a phone number, a device and a campus address?

Facebook's engineering team shows a middle path. In its 2013 article on TAO, it describes storing social data as a graph of typed objects and associations (the edges, such as "likes" or "commented on").

Yet TAO is not a graph database in the sense above. It keeps the data in MySQL, with a large cache in front, and supports a few simple questions: is A connected to B, which 50 associations are newest, and how many are there.

The post says there is no traversal on the server, by design, and that clients combine simple queries themselves. The lesson is that a graph shaped dataset doesn't force a graph database. When the questions are shallow and the volume is huge, tables and a cache can do the job.

## Two Models, Several Languages

Not all graph databases agree on the model. Wikipedia and Neptune describe two:

- **Property graph**: The model above, with labels and properties on nodes and relationships. It is queried with Cypher, Gremlin and, now, GQL, an ISO standard query language
- **RDF**: A set of facts written as subject, predicate and object, such as "Jun, sold, Calculus". It is queried with SPARQL and is common in knowledge graphs and linked data

Wikipedia notes that no single graph language has become as universal as SQL, so moving between products costs more than it does between relational ones. Some graph databases also sit on a relational, key-value or document engine underneath.

## What You Give Up

Graphs are harder to spread over machines. The TAO article lists this among the reasons the problem is hard: when a query follows connections, the connected data is unlikely to sit on the same machine, and each hop that crosses machines pays for a network trip.

[Sharding Strategies](/system-design/sharding) covers how data is split, and a graph is a hard case for it. Neptune, for one, has a single primary instance for writes and up to 15 read replicas that share storage, so reads scale out more easily than writes.

Wikipedia also says relational databases are better at bulk operations on flat data. Counting sales per campus is a scan and a sum, which a graph store gains nothing from.

A sensible path for the textbook app is to begin with a `friendships` table in PostgreSQL. When the deep, path shaped questions become the main workload, and measurements show the joins are the problem, a graph database is worth a try, often beside the main database and not in place of it.

## Key Points

- A graph database stores nodes and typed, directed relationships, both with properties, and follows connections without rebuilding them with joins
- Queries describe a pattern, and a variable length pattern like `{1,3}` follows a chain of unknown depth
- Each hop multiplies the work, so bound the depth, and remember that SQL can walk a graph too with `WITH RECURSIVE`
- <u>Choose a graph when the answer is a path or a neighborhood</u>, as in recommendations, trust and fraud checks, and not for ordinary lookups or bulk sums
- Graphs are hard to shard, languages differ between products, and a graph shaped dataset can still live in tables, as Facebook's TAO shows
