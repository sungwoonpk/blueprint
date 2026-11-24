> A **vector database** stores embeddings together with their ids and attributes, and answers one question quickly: which stored vectors are nearest to this one? It does so with an **approximate** index that checks a small share of the data and gives up a little accuracy for a large saving, and it adds what a database needs around that: filters, updates, persistence and operations.

[Semantic Search with Embeddings](/system-design/embeddings) ended with a number that rules out the obvious design. Three million listings of 1,024 numbers take 12.3 GB, and reading the whole set to answer one search takes about a quarter of a second at the memory speed we assumed.

The textbook app expects thousands of searches a second on registration day, so each search has to touch a few hundred vectors and not millions.

The way to do that is to organize the vectors so that a query can skip most of them. The price is that the answer may miss a true neighbor. Most of this topic is about how much that costs, and what else goes wrong around it, such as filters, memory and updates.

## Start With an Exact Scan

The simplest index is no index. A scan compares the query with each vector and is exact.

With a few searches, say 1,000 to 10,000, the time to build an index isn't repaid, so direct computation is best, and the flat index is the one choice that guarantees exact results.

The pgvector extension for PostgreSQL does the same by default: the search is exact, with perfect recall, until you add an approximate index.

Memory speed sets the cost. With the pgvector storage of 4 bytes for each number plus 8 bytes for the vector, a 1,024 dimension vector takes 4,104 bytes. We assumed 50 GB a second of memory bandwidth, as in the last topic:

| Vectors | Read for One Query | Time for One Query |
| --- | --- | --- |
| 100,000 | 0.41 GB | 8 ms |
| 1 Million | 4.1 GB | 82 ms |
| 3 Million | 12.3 GB | 246 ms |
| 100 Million | 410 GB | 8.2 s |

A scan is fine for a hundred thousand vectors and a modest query rate, and the simplicity is worth keeping while it works. It stops being fine when the product of the vectors and the query rate exceeds the memory bandwidth, which for 3 million vectors happens at about 4 queries a second on one machine.

## Trade Recall for Speed

An approximate index returns most of the true nearest neighbors and not the full set. **Recall** at 10 is the share of the true top 10 that comes back. A recall of 0.95 means about one result in twenty is a near miss. Two families of index dominate, and we built a simple version of each.

The test data is invented: 10,000 vectors of 16 numbers in 50 clusters, and 150 queries from the same distribution. A scan compares each query with 10,000 vectors, and we count comparisons.

### Inverted Lists

An **inverted file** index, called IVF, groups the vectors by a clustering step. Training finds centroids with k-means, each vector goes into the list of its nearest centroid, and a query visits the lists of the few nearest centroids and scans just those.

<figure class="diagram">
<div class="flow">
<div class="node">Query</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Nearest Centroids<small>nprobe of 64</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Scan Those Lists</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Top 10</div>
</div>
<figcaption>An inverted file search: find the nearest centroids, then scan just those lists</figcaption>
</figure>

We used 64 lists. The knob is the number of lists probed:

| Lists Probed | Recall at 10 | Comparisons, Share of a Scan |
| --- | --- | --- |
| 1 | 0.903 | 2.8% |
| 2 | 0.987 | 4.5% |
| 4 | 0.998 | 8.2% |
| 8 | 1.000 | 15.5% |
| 16 | 1.000 | 29.6% |

Probing 2 lists found 98.7 percent of the true neighbors with 4.5 percent of the work. Probing more bought little, and probing each list is a scan.

A sizing rule for pgvector: a number of lists equal to the rows divided by 1,000 up to a million rows, and the square root of the rows beyond that, with the probes near the square root of the lists.

pgvector's default is 1 probe, which our table shows is the least accurate setting. Two operational facts: the index is trained, so it should be built after the table holds data, and the FAISS guidance asks for training sets of 30 to 256 times the number of lists.

### Neighbor Graphs

A graph index links each vector to some near neighbors. A search starts at an entry point and repeatedly moves to the neighbor nearest the query, keeping a list of the best candidates, until it stops improving.

**HNSW**, the Hierarchical Navigable Small World graph, adds layers: a few vectors form a sparse top layer that makes long jumps, and lower layers refine. Its authors report that this gives logarithmic complexity scaling.

We built a simpler graph with a single layer, 12 links for each new vector, and a random entry point. The knob is the size of the candidate list, called `ef` in HNSW and in pgvector's `ef_search`:

| Candidate List | Recall at 10 | Comparisons, Share of a Scan |
| --- | --- | --- |
| 10 | 0.465 | 1.9% |
| 20 | 0.621 | 2.8% |
| 40 | 0.792 | 3.6% |
| 80 | 0.843 | 4.2% |
| 160 | 0.938 | 5.2% |

Both families got above 93 percent recall for around 5 percent of a scan. Two cautions come with these tables. The graph is simpler than the real thing, with no layers and no neighbor selection rule, so a production HNSW does better than our rows.

And clustered data favors lists. Don't read the tables as a ranking of the families. They show that each has a knob that trades work for recall, and that you have to pick the setting from measured recall.

The practical differences are these:

- **HNSW**: suits a lot of memory or a small dataset, needs no training, and stores for each vector the vector plus 8 times M bytes for the links. Some libraries don't support removing vectors
- **pgvector's defaults**: 16 links, a build candidate list of 64 and a search list of 40. HNSW has a better speed and recall tradeoff than IVFFlat, with slower builds and more memory

Both can be tuned by the same logic as our tables.

## Memory Is the Vectors

The graph is cheap and the vectors are not. At 1,024 dimensions a vector takes 4,104 bytes in pgvector, and 32 links add 256 bytes in the FAISS formula, about 6 percent. When the memory is too much, the lever is the representation of the vectors, not the graph:

<figure class="chart">
<div class="hbars" role="img" aria-label="Gigabytes for four representations">
<div class="hbar peak"><span>32 Bit Numbers</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">12.3 GB</span></div>
<div class="hbar"><span>Half Precision</span><span class="track"><span class="fill" style="--w: 50.1%"></span></span><span class="value">6.2 GB</span></div>
<div class="hbar"><span>Graph Links, 32 Each</span><span class="track"><span class="fill" style="--w: 6.2%"></span></span><span class="value">0.8 GB</span></div>
<div class="hbar"><span>Bit Vectors</span><span class="track"><span class="fill" style="--w: 3.3%"></span></span><span class="value">0.4 GB</span></div>
</div>
<figcaption>Memory for 3 million listings of 1,024 numbers, by representation, from the pgvector sizes</figcaption>
</figure>

pgvector offers half precision vectors at 2 bytes a number, and bit vectors at one bit a dimension. FAISS lists product quantization, which stores a short code for each vector, and RaBitQ at about one bit a dimension plus 8 bytes.

Scalar quantization to 8 bits, combined with lists, cuts disk and memory by 70 to 75 percent in Milvus.

Compression loses accuracy, so the pattern is to search the compressed index for a larger set of candidates and then re-rank them with the full vectors, which pgvector suggests at scale and FAISS supports with a refine step.

For data beyond memory, DiskANN, a NeurIPS 2019 paper, keeps the graph on a solid state drive.

It indexed a billion points on a single workstation with 64 GB of memory, serving more than 5,000 queries a second with under 3 ms mean latency and 95 percent or better 1-recall@1 on a 16 core machine, where two FAISS methods held in memory at a similar memory footprint plateaued around 50 percent. The figures are for one benchmark, SIFT1B, on the authors' hardware.

## Filters Change the Problem

Real queries carry conditions: a course, a price range, a status. The vector index doesn't know about them. In pgvector a `WHERE` clause is applied after the index scan. For example, if 10 percent of the rows match and the search list holds 40, about 4 rows come back on average.

We tested that. The graph search with a candidate list of 40 returned the nearest 40, then the filter removed the rows that didn't match. We varied the share of rows that match, and compared it with checking the filter while walking the graph and with an exact scan of the matching rows alone:

| Rows Matching | Post Filter Returns | Walk With Filter, Comparisons | Exact Scan, Comparisons |
| --- | --- | --- | --- |
| 50% | 10.0 of 10 | 411 | 5,000 |
| 10% | 3.7 of 10 | 1,108 | 1,000 |
| 1% | 0.3 of 10 | 6,918 | 100 |

Filtering afterward matched the expected figure, 3.7 rows against 4, and collapsed for a selective filter, returning 0.3 rows of 10.

Filtering during the walk returned the full 10 rows in each case, at a cost that grew as the filter tightened, and at 1 percent it cost 69 times as much as scanning the matching rows directly.

That points to a planner: estimate how many rows match, scan the matches when there are few, and walk the graph when there are many. For selective filters, a B-tree index on the filter column gives exact search, partial indexes cover a few values, and partitioning covers many.

Since version 0.8.0 pgvector has iterative scans that keep going until enough rows pass the filter, bounded by a maximum number of scanned tuples, default 20,000.

Qdrant builds payload indexes to speed up filtering, best created before ingesting data, and its planner falls back to a scan when few points match.

<figure class="diagram">
<div class="flow">
<div class="node">Query and Filter</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Planner<small>estimates matches</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack"><div class="node">Few: Exact Scan</div><div class="node">Many: Graph Walk</div></div>
</div>
<figcaption>A filter planner: scan the matches when they are few, walk the graph when they are many</figcaption>
</figure>

Tenants are the same problem in disguise. A shared approximate index lets one tenant's vectors affect the recall of another's, and list partitioning gives isolation, the choice of [Isolating Tenants in a Shared System](/system-design/multi-tenancy).

Pinecone's filters support operators such as equality, ranges and membership in a list of up to 10,000 values, so the filter language is rarely the limit. The cost of selective filters is.

## Operating the Index

An index is a derived copy of the data, and it has the problems of any other:

- **Updates and deletes**: FAISS says HNSW doesn't support removing vectors, and pgvector warns that vacuuming an HNSW index can be slow, so reindex first. Plan for tombstones and periodic rebuilds
- **Builds**: pgvector says an HNSW build is much faster when the graph fits in `maintenance_work_mem`, and recommends concurrent builds in production
- **Freshness**: a new listing has to be embedded and added, through the change log of [Keeping Caches, Indexes and Copies in Sync](/system-design/keeping-copies-in-sync)
- **A new model**: vectors from two models don't mix, so build the new index beside the old and switch, as in [Migrating Between Datastores Without Downtime](/system-design/migrating-datastores)
- **Recall in production**: compare the index against an exact scan on a sample of queries, which pgvector shows how to do by disabling the index scan for one query, and graph the recall like any other metric
- **Different results after indexing**: results change after an approximate index is added, so tests that expect exact order break

## Choosing

| Situation | A Reasonable Start |
| --- | --- |
| Under 100,000 vectors or few searches | An exact scan |
| Already on PostgreSQL, millions of vectors, filters and transactions | pgvector with HNSW |
| Many millions, high query rate, memory available | HNSW in a dedicated engine |
| Memory limited | Compressed vectors with a re-rank step |
| Billions of vectors | An IVF index with compression, or a disk based graph |
| Strict tenant isolation | Partitions or a collection for each tenant |

The dedicated engines, such as Qdrant, Milvus and Pinecone, add managed scaling, richer filters and several index types. The flat index is the one that guarantees exact results, and graph, list and quantized variants cover the rest.

A separate service also adds a network hop and a second copy to keep in sync, so a database you already run is a fair first step.

## A Plan for the Textbook App

| Piece | Decision |
| --- | --- |
| Store | pgvector in the existing PostgreSQL, 3 million listings of 1,024 numbers |
| Index | HNSW with the defaults, then tuned on a set of 200 labeled searches |
| Compression | Half precision vectors first, which halves memory with a recall check |
| Filters | B-tree indexes on course and status, partial indexes for open listings |
| Tenants | A university filter, with list partitions for the three largest |
| Recall Target | At least 0.95 at 10 on the labeled set, measured weekly against exact search |
| Updates | New listings through the change log, with a nightly rebuild check |
| Growth Trigger | A dedicated engine when the index no longer fits in memory on the primary |

## Pitfalls

- **An approximate index from the start**: a scan is simpler and exact while the data is small
- **The default search setting**: one probe or a small list costs recall, so measure it
- **Filtering after the search**: a selective filter returns few or no rows
- **Ignoring memory for the vectors**: they are most of the index
- **No measurement of recall**: the index can drift from the truth without an error
- **Mixing vectors from two models**: the neighbors become meaningless
- **Deleting rows without a plan**: graphs handle removal poorly

## Key Points

- A vector database finds the nearest vectors with an approximate index, and trades a little recall for a large cut in work
- Both main families have a knob for it: in our tests, probing 2 of 64 lists gave 0.987 recall with 4.5 percent of the comparisons, and a simple graph reached 0.938 with 5.2 percent
- Memory is mostly the vectors: at 1,024 dimensions a graph adds about 6 percent, and half precision, bit vectors or quantization cut the rest, with a re-rank step to recover accuracy
- <u>Filters change the plan</u>: filtering after the search returned 3.7 of 10 rows at a 10 percent match and 0.3 at 1 percent, and a scan of the matches cost 100 comparisons against 6,918 for a filtered walk
- Measure recall against an exact scan, plan for updates and model changes, and start with the database you already run
