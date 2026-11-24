> **Location search** answers questions such as which listings are within 2 kilometers of this point, or which five are nearest. Ordinary indexes order data along one line, and a place has two coordinates. The solutions either turn the plane into a one dimensional key, as grids, geohashes and cell ids do, or use a tree built for rectangles, as spatial indexes do.

A student opens the textbook app on campus and asks for books nearby. The question is simple to say and awkward to run. Each of 3 million listings has a latitude and a longitude, and the database has to find the ones inside a circle without looking at the whole set.

The obvious tool is an index on the two columns. It helps less than you would hope. An index on latitude and then longitude narrows by latitude first, and then it scans a whole band of the planet at that latitude to find the longitudes that match.

The index is sorted along one dimension, and the question has two. So the fix has to change the shape of the key.

## Turn Two Numbers Into One Key

The simplest idea is a grid. Cut the map into cells, give each cell a name, and store the name with each listing. A query works out the user's cell, fetches the listings in that cell and its neighbors, and throws away the ones outside the circle.

The whole idea depends on how the cells are named. If nearby cells get nearby names, one range scan on an ordinary index fetches the set. **Geohash** does exactly that.

It halves the longitude range and the latitude range in turn, writing a 0 or a 1 for each half it picks, and it groups the interleaved bits into characters of a 32 letter alphabet. A longer hash is a smaller cell inside the cell of its prefix.

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

That gives a useful property: the longer the prefix two geohashes share, the closer the places are. The reverse isn't true. Two points can be very close and share a short prefix, or no prefix, because a cell boundary falls between them.

Across the equator or the Greenwich meridian most of the bits flip, the 180th meridian splits neighbors, and the cells get distorted near the poles. A grid on its own is a filter, not an answer, and the rest of this topic works around that.

Two newer systems fix some of the shape problems. Google's S2 puts the sphere on six faces and numbers the cells along a Hilbert curve, so cells with close identifiers are close in space.

It has 30 levels, the smallest about 1 cm across, each cell has a 64 bit identifier, and a region is covered by a collection of cells of different sizes, at most 8 by default. One example approximates Hawaii with 22 cells.

Uber's H3 uses hexagons instead, with 16 resolutions from 0 to 15. The number of cells at resolution r is 2 plus 120 times 7 to the power r, each hexagon has seven children, and exactly 12 pentagons at each resolution close the sphere.

Resolution 7 averages 5.16 square kilometers with an edge of 1.41 km, and resolution 8 averages 0.74 square kilometers with an edge of 0.53 km.

Hexagons have one useful property: each neighbor of a cell is at about the same distance, unlike a square grid where the diagonal neighbors are farther. Take that as the reasoning behind the design, not a measured figure.

## What a Grid Query Costs

A grid lookup has two knobs: the size of the cell, and how many cells to read. To see how they interact, we indexed 200,000 listings, clustered around 40 districts of a city like Seoul, by geohash at three lengths.

At that latitude a degree of longitude is about 88 km and a degree of latitude 111 km, which gives these cell sizes:

| Geohash Length | North to South | East to West |
| --- | --- | --- |
| 5 | 4.89 km | 3.88 km |
| 6 | 0.61 km | 0.97 km |
| 7 | 0.15 km | 0.12 km |

We then ran 60 random queries for each radius and compared what the index found with the true answer from a full scan. The index read either the user's own cell, or the cell and its 8 neighbors, and then filtered by exact distance:

| Radius and Length | One Cell | Nine Cells | Examined |
| --- | --- | --- | --- |
| 1 km, Length 5 | 88.6% | 100% | 33,599 |
| 1 km, Length 6 | 19.4% | 93.6% | 3,484 |
| 1 km, Length 7 | 0.7% | 5.7% | 131 |
| 3 km, Length 5 | 55.0% | 100% | 33,599 |
| 3 km, Length 6 | 3.6% | 28.2% | 3,484 |

The two middle columns are the share of the true results that came back, and the last is the number of listings examined for each query when nine cells are read. The true answer held 2,287 listings for 1 km and 12,377 for 3 km.

Three lessons come out of the table:

- **One cell isn't enough**: a user near the edge of a cell has neighbors in the next one, so at length 6 and a 1 km radius the lookup found 19.4 percent of the results
- **Cells must be at least as big as the radius**: at length 6 a cell is 0.61 by 0.97 km, so the block of nine covers about 0.6 km around the user at best, and the 1 km search missed 6.4 percent. At length 5 the block covers more than the circle, and the answer was complete
- **A cell that is too coarse examines a lot**: length 5 found each true result, and it looked at 33,599 listings to return 2,287, about 15 times more than needed

Even so, the exact check is cheap next to the scan. A 1 km query on a full scan took 68 ms in Python on one core, and the index with 9 cells at length 6 took 1.2 ms, though at that length it missed some results.

So the tuning rule is to pick the cell size from the typical radius, read the ring of neighbors, and filter by exact distance.

Density spoils even that. A cell in the city center holds thousands of listings, and a cell in the countryside holds zero. Adaptive structures help: a quadtree splits a cell when it fills up, and S2 covers a shape with cells of different sizes, so the number of candidates stays bounded.

## Redis and Databases

You rarely build this by hand. Redis has it as one data type: its geospatial commands store points in a sorted set, with a 52 bit integer score made by interleaving the bits of latitude and longitude, which is the geohash idea in a numeric form.

`GEOADD` adds a member with the longitude first and the latitude second, and `GEOSEARCH` finds the members within a radius or inside a box, optionally sorted by distance and limited in count.

Latitudes beyond about 85.05 degrees can't be indexed, distances use a spherical formula that is off by up to 0.5 percent in the worst case, and a search checks the 1 plus 8 areas needed to cover the shape, the nine cells of our experiment.

Relational databases use a tree instead. PostGIS builds spatial indexes on PostgreSQL's GiST framework, as an R tree: each node holds the bounding box of its children, a query descends into the boxes that overlap, and the leaves hold the geometries. A few points matter in practice:

- **Index creation**: `CREATE INDEX ... USING GIST (location)` on a geometry or geography column
- **Bounding boxes**: the index stores boxes, so it finds candidates quickly and an exact test follows. Huge polygons are a problem, since their boxes cover so much that the index returns them for most queries
- **Nearest neighbors**: the distance operator, `<->`, used in `ORDER BY ... LIMIT`, lets the index return the closest items in order with no cutoff radius. It kicks in when one of the geometries is a constant, and a hybrid pattern works well: take the nearest 100 by the index, then sort those exactly and keep 10
- **Approximate then exact**: the distance from a GiST index may be approximate, such as the distance to a bounding box, so the executor recomputes the exact distance and reorders

For the textbook app, a query for listings within 2 km of a point, sorted by distance, is a spatial index lookup in PostGIS, or a few ring cells with the exact filter. At this size either returns in milliseconds.

## When the Map Gets Bigger

The same ideas carry up to a service with many machines, and each one brings a decision. A cell prefix makes a good shard key, because a search for nearby listings then touches one shard or a few.

Dense cells turn into the hot spots of [Handling Hot Spots and Celebrity Users](/system-design/hot-spots), so a dense city may need finer cells or several shards.

Listings rarely move. Couriers do, and a moving object changes its cell constantly, so the index for them is usually held in memory, with a time to live that drops stale positions.

A search for a book title near me needs both a text match and a distance. A search engine, as in [Full Text Search with Inverted Indexes](/system-design/search-engines), combines a geographic filter with a text score, and the ranking decides how to weigh closeness against relevance.

Two more habits follow from the cell. The result of a nearby query for one cell and one filter is the same for many users, so the cell is a natural cache key, as in [Scaling Reads](/system-design/scaling-reads).

And exact coordinates are personal data, so rounding a seller's location to a cell, with a size chosen for the purpose, shows nearness without revealing an address, which is where [Data Privacy and Compliance](/system-design/privacy) applies.

A map that shows counts of listings for each cell at several zoom levels uses the hierarchy of the cell system: the parent of a cell comes from truncating its identifier.

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

- **A B tree on latitude and longitude**: it narrows one dimension and scans the other
- **Reading one cell**: a user at the edge misses the neighbors
- **Cells smaller than the radius**: the ring doesn't cover the circle
- **Skipping the exact distance check**: the cell is a filter, not the answer
- **Forgetting the dateline and the poles**: prefixes mislead at the edges
- **A uniform grid over a skewed city**: some cells hold thousands, others hold zero
- **Exact coordinates shown to any viewer**: a privacy risk for sellers

## Key Points

- A place has two coordinates and ordinary indexes order along one, so location search maps the plane to a one dimensional key, as geohash, S2 and H3 do, or uses an R tree
- Grids need the ring of neighbors and an exact distance check: in our test, reading one cell at length 6 found 19.4 percent of the results at 1 km, and 9 cells at length 5 found the whole set
- <u>Choose the cell size from the query radius</u>: cells smaller than the radius miss results, and cells much larger examine many listings, in our test about 15 times more than the results
- PostGIS indexes bounding boxes with GiST and answers nearest neighbor queries with an ordered scan using the distance operator, and Redis stores geohash scores in a sorted set
- At scale, partition by cell prefix, watch for dense cells, cache by cell, and protect the exact location
