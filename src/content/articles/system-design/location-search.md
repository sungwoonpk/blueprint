> **Location search** answers questions such as which listings are within 2 kilometers of this point, or which five are nearest. Ordinary indexes order data along one line, and a place has two coordinates. The solutions either turn the plane into a one dimensional key, as grids, geohashes and cell ids do, or use a tree built for rectangles, as spatial indexes do.

A student opens the textbook app on campus and asks for books nearby. The query is simple to say and awkward to run. Each of 3 million listings has a latitude and a longitude, and the database has to find the ones inside a circle without examining the whole set.

A B tree index on the two columns doesn't solve it. An index on latitude and longitude, in that order, narrows by latitude first, then scans a whole band of the planet at that latitude to find the longitudes that match.

The index is sorted along one dimension, and the question has two. The fixes come from changing the shape of the key.

## Turn Two Numbers Into One Key

The simplest idea is a grid. Cut the map into cells, give each cell a name, and store the name with each listing. A query computes the cell of the user, fetches the listings in that cell and its neighbors, and discards those outside the circle.

The cost depends on how the cells are named, since nearby cells should have nearby names, so that one range scan on an ordinary index gets them.

**Geohash** is the best known naming. Gustavo Niemeyer invented it in 2008, building on earlier work on interleaving coordinate bits.

It halves the longitude range and the latitude range alternately, writing a 0 or a 1 for each half chosen, and groups the interleaved bits into characters of a 32 letter alphabet. A longer hash is a smaller cell inside the cell of its prefix.

<figure class="diagram">
<div class="flow">
<div class="node">Coordinates</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Halve Ranges</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Geohash<small>longer, smaller</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Range Scan</div>
</div>
<figcaption>How two coordinates become one key that an ordinary index can scan</figcaption>
</figure>

That gives the useful property: the longer the shared prefix of two geohashes, the closer the places are. The reverse isn't guaranteed.

Two points can be very close and share a short prefix or no prefix, because the cell boundary falls between them. Across the equator or the Greenwich meridian most bits flip, the 180th meridian splits neighbors, and cells get distorted near the poles.

Two other systems fix some of the shape problems:

- **S2**: Google's library puts the sphere on six faces and numbers cells along a Hilbert curve, so that cells with close identifiers are close in space. It has 30 levels of cells, the smallest about 1 cm across, and identifies each by a 64 bit number. A region is covered by a collection of cells of different sizes, with a default of at most 8, and one example approximates Hawaii with 22 cells
- **H3**: Uber's library uses hexagons, with 16 resolutions from 0 to 15, and the number of cells at resolution r is 2 plus 120 times 7 to the power r. Each hexagon has seven children, called aperture 7, and there are exactly 12 pentagons at each resolution, needed to close the sphere. Resolution 7 averages 5.16 square kilometers with an edge of 1.41 km, and resolution 8 averages 0.74 square kilometers with an edge of 0.53 km

Hexagons have one useful geometric property: each neighbor of a cell is at about the same distance, unlike a square grid where the diagonal neighbors are farther. Take that as the reasoning behind the design, not a measured figure.

## What a Grid Query Costs

A grid lookup has two knobs: the cell size, and how many cells to read. We indexed 200,000 listings, clustered around 40 districts of a city like Seoul, by geohash at three lengths. At that latitude a degree of longitude is about 88 km and of latitude 111 km, which gives these cell sizes:

| Geohash Length | North to South | East to West |
| --- | --- | --- |
| 5 | 4.89 km | 3.88 km |
| 6 | 0.61 km | 0.97 km |
| 7 | 0.15 km | 0.12 km |

We ran 60 random queries for each radius and compared the listings found with the true answer from a full scan. Reading just the user's own cell, or the cell and its 8 neighbors, and then filtering by exact distance:

| Radius and Length | One Cell | Nine Cells | Examined |
| --- | --- | --- | --- |
| 1 km, Length 5 | 88.6% | 100% | 33,599 |
| 1 km, Length 6 | 19.4% | 93.6% | 3,484 |
| 1 km, Length 7 | 0.7% | 5.7% | 131 |
| 3 km, Length 5 | 55.0% | 100% | 33,599 |
| 3 km, Length 6 | 3.6% | 28.2% | 3,484 |

<figure class="chart">
<div class="hbars" role="img" aria-label="Share of results found for four setups at a 1 km radius">
<div class="hbar"><span>Length 5, 9 Cells</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">100%</span></div>
<div class="hbar"><span>Length 6, 9 Cells</span><span class="track"><span class="fill" style="--w: 93.6%"></span></span><span class="value">93.6%</span></div>
<div class="hbar peak"><span>Length 6, 1 Cell</span><span class="track"><span class="fill" style="--w: 19.4%"></span></span><span class="value">19.4%</span></div>
<div class="hbar"><span>Length 7, 9 Cells</span><span class="track"><span class="fill" style="--w: 5.7%"></span></span><span class="value">5.7%</span></div>
</div>
<figcaption>Share of the true results found for a 1 km radius, by geohash length and cells read, from our experiment</figcaption>
</figure>

The first two number columns are the share of the true results found, and the last is the listings examined for each query with nine cells. The true answer had 2,287 listings for 1 km and 12,377 for 3 km.

The table carries three lessons:

- **One cell isn't enough**: A user near the edge of a cell has neighbors in the next cell, so the lookup found 19.4 percent of the results at length 6 and a 1 km radius
- **The cells must be at least as big as the radius**: At length 6 the cells are 0.61 by 0.97 km, so the 9 cell block covers about 0.6 km around the user at best, and a 1 km search missed 6.4 percent. At length 5 the block covers more than the circle, and it was complete
- **A coarse cell examines a lot**: Length 5 found each true result and looked at 33,599 listings to return 2,287, about 15 times more than needed. Each candidate is then checked by exact distance

The cost of the check is small compared with the scan. A 1 km query on a full scan took 68 ms in Python on one core, and the index with 9 cells at length 6 took 1.2 ms, though at that length it missed some results.

The tuning rule is to pick the cell size from the typical radius, read the ring of neighbors, and filter.

Density breaks the tuning. A cell in the city center holds thousands of listings, and a cell in the countryside holds zero. Adaptive structures help: quadtrees split a cell when it fills up, and the S2 region coverer picks cells of different sizes to cover a shape, so the number of candidates stays bounded.

## Redis and Databases

Redis builds this into one data type. Its geospatial commands store points in a sorted set, with the score a 52 bit integer made by interleaving the bits of latitude and longitude, the geohash idea in a numeric form.

`GEOADD` adds members with a longitude first and a latitude second, and `GEOSEARCH` finds those within a radius or inside a box, optionally sorted by distance and limited in count.

Latitudes beyond about 85.05 degrees can't be indexed, that distances use a spherical formula with an error of up to 0.5 percent in the worst case, and that a search checks the 1 plus 8 areas needed to cover the shape, the nine cells of our experiment.

Relational databases use a tree. PostGIS builds spatial indexes on PostgreSQL's GiST framework, as an R tree: each node holds the bounding box of its children, a query descends into the boxes that overlap, and the leaves hold the geometries. Points to know:

- **Index creation**: `CREATE INDEX ... USING GIST (location)` on a geometry or geography column
- **Bounding boxes**: The index stores boxes, so it finds candidates quickly, and an exact test follows. Huge polygons are a problem, since their boxes cover so much that the index returns them for most queries
- **Nearest neighbors**: The distance operator, `<->`, used in `ORDER BY ... LIMIT` lets the index return the closest items in order, with no cutoff radius needed. The reference says it kicks in when one of the geometries is a constant, and shows a hybrid pattern: take the nearest 100 by the index, then sort those exactly and keep 10
- **Approximate then exact**: The distance given by a PostgreSQL GiST index may be approximate, such as the distance to a bounding box, and the executor recomputes the exact distance and reorders

For the textbook app, a query for listings within 2 km of a point, sorted by distance, is a spatial index lookup in PostGIS or a few ring cells with the exact filter, and either returns in milliseconds at this size.

## At Larger Scale

The same ideas carry up to a service with many machines:

- **Partition by cell**: Use a cell prefix as the shard key, so a nearby search touches one or a few shards. Dense cells become hot spots, the problem of [Handling Hot Spots and Celebrity Users](/system-design/hot-spots), and a dense city may need finer cells or several shards
- **Moving objects**: Static points, like listings, rarely change their cell. Moving ones, like couriers, update their cell constantly, and the index is usually held in memory with a time to live for stale positions
- **Combine with text**: A search for a book title near me needs a text match and a distance. A search engine, as in [Full Text Search with Inverted Indexes](/system-design/search-engines), combines a geographic filter with a text score, and ranking decides how to weigh closeness against relevance
- **Cache by cell**: The result of a nearby query for a cell and a filter is the same for many users, so the cell is a natural cache key, as in [Scaling Reads](/system-design/scaling-reads)
- **Protect the location**: Exact coordinates are personal data. Rounding to a cell, with a size chosen for the purpose, shows nearness without revealing an address, and [Data Privacy and Compliance](/system-design/privacy) applies
- **Pick a cell size by zoom**: A map showing counts of listings for each cell at several zoom levels uses the hierarchy of the cell system, with the parent of a cell by truncating the id

## A Plan for the Textbook App

| Need | Decision |
| --- | --- |
| Listings Near Me | PostGIS geography column with a GiST index, `ST_DWithin` for the radius, ordered by `<->` |
| Map of Counts | Geohash length 5 or 6 cells, with counts kept in a table updated by the change log |
| Search With Location | The search index gets a point field for each listing, combined with the text query |
| Cache | Results for each geohash of length 6 and filter, for 30 seconds |
| Privacy | Show a distance band, not coordinates, and round stored seller locations to a cell |
| Scale Trigger | Shard by geohash prefix when one database can't hold the index in memory |

## Pitfalls

- **A B tree on latitude and longitude**: It narrows one dimension and scans the other
- **Reading one cell**: A user at the edge misses the neighbors
- **Cells smaller than the radius**: The ring doesn't cover the circle
- **Skipping the exact distance check**: The cell is a filter, not the answer
- **Forgetting the dateline and the poles**: Prefixes mislead at the edges
- **A uniform grid over a skewed city**: Some cells hold thousands, others hold zero
- **Exact coordinates shown to any viewer**: A privacy risk for sellers

## Key Points

- A place has two coordinates and ordinary indexes order along one, so location search maps the plane to a one dimensional key, as geohash, S2 and H3 do, or uses an R tree
- Grids need the ring of neighbors and an exact distance check: in our test, reading one cell at length 6 found 19.4 percent of the results at 1 km, and 9 cells at length 5 found the whole set
- <u>Choose the cell size from the query radius</u>: cells smaller than the radius miss results, and cells much larger examine many listings, in our test about 15 times more than the results
- PostGIS indexes bounding boxes with GiST and answers nearest neighbor queries with an ordered scan using the distance operator, and Redis stores geohash scores in a sorted set
- At scale, partition by cell prefix, watch for dense cells, cache by cell, and protect the exact location
