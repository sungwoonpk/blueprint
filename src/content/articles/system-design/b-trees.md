> A **B-tree** is a balanced tree whose nodes are as wide as a disk page, so that finding one key takes only a few page reads. It is the structure behind most database indexes, including the ones in [Indexes and Query Optimization](/system-design/indexing).

You met B-trees in a data structures course. This topic is about the version databases run: nodes sized to a page, a tree only a few levels tall, and a set of habits that follow from that, from the order of inserts to the cost of a single changed row.

It is also the reason that, back in [Data Modeling](/system-design/data-modeling), the choice of an id type was more than a style question.

## Why Nodes Are Wide

A database keeps its data on disk, and a disk is read in blocks. The cost of a lookup is the number of blocks it touches, so the structure's job is to touch as few as possible.

A binary search over 1,000,000 records needs up to 20 comparisons. If each one is a separate 10 ms disk read, that is 0.2 seconds. If a block holds 100 entries instead, the search takes 3 block reads.

So a B-tree packs hundreds of keys into each node, one node to a page, 8 kB in PostgreSQL and 16 KB by default in MySQL's InnoDB. Each level then divides the search space by hundreds. We counted the levels needed for one billion keys:

<figure class="chart">
<div class="hbars" role="img" aria-label="Levels needed for one billion keys: 30 in a binary tree, 5 with 100 keys per node, 4 with 500 keys per node">
<div class="hbar peak"><span>Binary Tree</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">30</span></div>
<div class="hbar"><span>100 Keys per Page</span><span class="track"><span class="fill" style="--w: 16.7%"></span></span><span class="value">5</span></div>
<div class="hbar"><span>500 Keys per Page</span><span class="track"><span class="fill" style="--w: 13.3%"></span></span><span class="value">4</span></div>
</div>
<figcaption>Levels to reach any of one billion keys (our own calculation)</figcaption>
</figure>

The author of Use The Index, Luke says real indexes with millions of records are usually four or five levels deep.

And the tree's depth is the same everywhere: all the leaves are the same distance from the root, which is what balanced means, and splits keep it so, as the next sections show. In PostgreSQL you can ask an index how tall it is, with the `pageinspect` extension:

```sql
CREATE EXTENSION pageinspect;
SELECT level FROM bt_metap('listings_book_price_idx');
```

The level counts up from 0 at the leaves, so a result of 2 means three levels of pages.

## Lookups and Range Scans

Databases mostly use the variant called a B+ tree, in which the internal pages hold only keys and child pointers, and all the entries are in the leaves, which are linked side by side.

The benefit: with no data in the internal pages, more keys fit on each, and the tree is shorter. In PostgreSQL the leaves are linked as a list of pages, and over 99 percent of the pages are leaves.

A lookup starts at the root, finds the right child with a search inside the page, and repeats until it reaches a leaf. A range scan finds the first leaf and then follows the links:

<figure class="diagram">
<svg viewBox="0 0 360 190" role="img" aria-label="A B plus tree with a root holding 30 and 60, and three linked leaves holding prices 12 18 25, then 30 41 55, then 60 72 90. A search for prices from 40 to 70 descends once to the middle leaf and follows the link to the right leaf." style="width:100%;max-width:420px;height:auto;display:block;margin:0 auto;color:var(--accent)">
<defs><marker id="bt-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>
<g fill="none" stroke-width="1.5">
<line x1="150" y1="44" x2="60" y2="110" style="stroke:var(--border)"/>
<line x1="180" y1="44" x2="180" y2="110" stroke="currentColor"/>
<line x1="210" y1="44" x2="300" y2="110" style="stroke:var(--border)"/>
<line x1="110" y1="127" x2="128" y2="127" style="stroke:var(--muted)"/>
<line x1="230" y1="127" x2="248" y2="127" stroke="currentColor" marker-end="url(#bt-arrow)"/>
</g>
<rect x="120" y="10" width="120" height="34" rx="8" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.5"/>
<rect x="10" y="110" width="100" height="34" rx="8" style="fill:var(--bg);stroke:var(--border)" stroke-width="1.5"/>
<rect x="130" y="110" width="100" height="34" rx="8" style="fill:var(--accent)" opacity="0.18"/>
<rect x="130" y="110" width="100" height="34" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="250" y="110" width="100" height="34" rx="8" style="fill:var(--accent)" opacity="0.18"/>
<rect x="250" y="110" width="100" height="34" rx="8" fill="none" stroke="currentColor" stroke-width="1.5"/>
<g font-size="14" font-weight="600" text-anchor="middle" style="fill:var(--text)">
<text x="180" y="32">30 | 60</text>
<text x="60" y="132">12 18 25</text>
<text x="180" y="132">30 41 55</text>
<text x="300" y="132">60 72 90</text>
</g>
<text x="180" y="172" font-size="12" text-anchor="middle" style="fill:var(--muted)">Prices from 40 to 70: descend once, then follow the link</text>
</svg>
<figcaption>A range scan reads one path down the tree and then walks along the leaves</figcaption>
</figure>

That is why a B-tree answers `ORDER BY` and range conditions cheaply: the leaves are already sorted, which is the property that [Indexes and Query Optimization](/system-design/indexing) used for its `LIMIT 20` query.

## Inserts and Splits

An insert descends to the leaf where the key belongs and adds it. Pages have a fixed size, so sooner or later a leaf is full. The database then splits it into two pages, each about half full, and adds a pointer to the new page in the parent.

If the parent is full, it splits as well. Splits cascade upward in this way, and when the root itself splits, a new root is created above it. That is the only way the tree gets taller, and it is why all the leaves stay at the same depth.

Where the inserts land changes how full the pages are. We simulated 200,000 keys going into leaf pages of 100 entries, in two orders:

| Insert Order | Leaf Pages | Average Fill |
| --- | --- | --- |
| Increasing, at the right end | 2,000 | 100% |
| Random | 2,875 | 69.6% |

Appending at the right end fills each page before starting the next. Random inserts split pages that are full in the middle, leaving halves, and the average settles near 70 percent: 44 percent more pages for the same keys, more to read and more to cache.

InnoDB shows the same effect from the other side: sequential inserts leave pages about 15/16 full, while random ones leave them anywhere from half to 15/16 full.

Random inserts are also expensive in another way. Each key lands on a different leaf, so the page needed is likely to be out of memory and must be read first.

This is the reason for the advice in [Data Modeling](/system-design/data-modeling) about random UUIDs: version 4 values scatter inserts over the whole tree, while sequential numbers and version 7 UUIDs, which are ordered by time, keep them at the right edge, where the busy pages stay in memory.

Deletes work in reverse. A page that becomes too empty is merged with a neighbor or borrows from one. InnoDB has a merge threshold of 50 percent by default, below which it tries to contract the tree.

PostgreSQL adds its own cleanup, such as removing dead entries from a page that is about to split, but still depends on its vacuum process for the rest.

## Where the Rows Live

A B-tree index can sit beside the table or hold the table. Systems differ, and it changes the cost of a lookup:

| System | Full Rows Live In | An Index Entry Points To |
| --- | --- | --- |
| InnoDB | The primary key's B-tree, the clustered index | The primary key value |
| PostgreSQL | A separate table file, the heap | The row's location in the heap |
| SQLite | The table's own B-tree, keyed by row id | The row id, as part of the index key |

In InnoDB, a secondary index record holds the primary key columns of its row, and a lookup through it then searches the clustered index with that value: two tree descents. A long primary key also makes every secondary index bigger.

In PostgreSQL, an index entry points straight into the heap, which is the extra trip that an index-only scan from [Indexes and Query Optimization](/system-design/indexing) can avoid. SQLite's table trees store the data in the leaves, while its index trees store no data at all.

## Crash Safety and the Cost of a Write

A split changes several pages: the old leaf, the new leaf and the parent. A crash between those writes would leave the tree broken, so changes to the tree are logged first, as in [Write-Ahead Logs](/system-design/write-ahead-logs), and replayed on recovery.

The deeper cost is in the unit of writing. Changing one 100 byte row means rewriting a whole 8 kB page, about 80 times more than the change, and the page is somewhere else on the disk each time.

B-trees make reads cheap and updates in place simple, but they pay for random page writes. The next topic, [LSM Trees](/system-design/lsm-trees), makes the opposite bargain.

## Key Points

- A B-tree has page sized nodes with hundreds of keys, so a billion keys need only four or five page reads
- Databases mostly use B+ trees, with data in sorted, linked leaves, which makes range scans and `ORDER BY` cheap
- A full page splits in two and the split can cascade up to the root, which keeps every leaf at the same depth
- <u>Insert order matters</u>: in our simulation, sequential keys left pages full and random keys left them 70 percent full
- Rows live in the clustered index in InnoDB and in a separate heap in PostgreSQL, and writing one row rewrites a whole page
