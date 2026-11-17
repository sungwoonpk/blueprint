> **Geospatial storage** is storing places, as points or shapes on the Earth, in a way that makes "what is near here?" and "what is inside this area?" fast. The difficulty is that a place has two coordinates, and an ordinary index sorts by only one thing.

The textbook app adds a feature: show the pickup spots within 2 km of a student's dorm. Each spot has a latitude and a longitude, and the obvious query filters on both:

```sql
SELECT name FROM pickup_spots
WHERE lat BETWEEN 39.99 AND 40.01
  AND lon BETWEEN -75.02 AND -74.98;
```

## Why Two Number Columns Aren't Enough

An index from [Indexes and Query Optimization](/system-design/indexing) keeps rows sorted by one key, and a multicolumn one sorts by the first column and then the second.

An index on `(lat, lon)` can jump straight to the latitude range, but that range is a stripe around the whole world. Each spot in the stripe has to be checked for longitude:

<figure class="diagram">
<svg viewBox="0 0 300 160" role="img" aria-label="A rectangle representing a map. A wide horizontal band across the full width is what a latitude range reads. A small box inside the band is what the search wants." style="width:100%;max-width:380px;height:auto;display:block;margin:0 auto">
<rect x="10" y="10" width="280" height="140" rx="8" fill="none" style="stroke:var(--border)" stroke-width="2"/>
<rect x="10" y="60" width="280" height="40" style="fill:var(--accent)" opacity="0.18"/>
<rect x="130" y="60" width="40" height="40" rx="4" style="fill:var(--accent)" opacity="0.85"/>
<text x="20" y="54" font-size="12" style="fill:var(--muted)">Read by a latitude range</text>
<text x="150" y="124" font-size="12" text-anchor="middle" style="fill:var(--text)">What we want</text>
</svg>
<figcaption>A latitude range reads a stripe, and the search wants only a small box inside it</figcaption>
</figure>

Two more facts make plain coordinates awkward. A degree of longitude isn't a fixed length: at 40 degrees north, one degree of latitude is about 111 km and one degree of longitude about 85 km, by our own calculation with the haversine formula for distances on a sphere.

And the Earth wraps: points on either side of the 180 degree meridian are close together and have very different longitudes.

So spatial databases use structures that keep nearby places near each other in the index. There are two families.

## Cells: Turn a Place Into a Key

The first family cuts the Earth into cells and gives each cell an id. A place becomes the id of its cell, which is a single value that an ordinary index can handle.

**Geohash**, invented in 2008 by Gustavo Niemeyer, encodes a location as a short string of letters and digits. Each extra character divides the cell into 32 smaller ones. We encoded four invented spots near 40 degrees north, using the standard algorithm:

| Spot | Geohash | Distance From Library |
| --- | --- | --- |
| Library | `dr4et3f8v` | 0 |
| Student Union | `dr4et6hhe` | 0.28 km |
| Dorm East | `dr4ete9gn` | 1.4 km |
| Far Campus | `dr4ezseqr` | 10.8 km |

The first three share the prefix `dr4et`, and the far one shares only `dr4e`. That is the useful property: the longer the shared prefix, the closer the places.

Counting bits gives the size of a cell. Each character adds 5 bits, so 5 characters cut the equator into cells 4.9 km wide, 6 characters 1.2 km, and 7 characters 150 m.

A point is within half of that of its cell's center: about 2.4 km, 610 m and 76 m. Finding spots near the library becomes an ordinary query on a B-tree:

```sql
SELECT name FROM pickup_spots WHERE geohash LIKE 'dr4et%';
```

The reverse isn't guaranteed. Two points can be very close and share a short prefix. We found a pair 8.5 meters apart, at the edge of a cell, whose 7 character geohashes were `dr4etcz` and `dr4ew1b`, sharing only `dr4e`.

The fix is to search the cell holding the center and its 8 neighbors, then check the exact distance of each candidate:

<figure class="diagram">
<svg viewBox="0 0 260 220" role="img" aria-label="A three by three grid of cells. A circle centered in the middle cell crosses into the surrounding cells, so all nine cells are searched." style="width:100%;max-width:300px;height:auto;display:block;margin:0 auto">
<rect x="68" y="78" width="64" height="64" style="fill:var(--accent)" opacity="0.16"/>
<g fill="none" style="stroke:var(--border)" stroke-width="1.5">
<rect x="4" y="14" width="64" height="64"/><rect x="68" y="14" width="64" height="64"/><rect x="132" y="14" width="64" height="64"/>
<rect x="4" y="78" width="64" height="64"/><rect x="68" y="78" width="64" height="64"/><rect x="132" y="78" width="64" height="64"/>
<rect x="4" y="142" width="64" height="64"/><rect x="68" y="142" width="64" height="64"/><rect x="132" y="142" width="64" height="64"/>
</g>
<circle cx="100" cy="110" r="42" fill="none" style="stroke:var(--accent)" stroke-width="2"/>
<circle cx="100" cy="110" r="3.5" style="fill:var(--accent)"/>
<text x="205" y="114" font-size="12" style="fill:var(--muted)">search</text>
<text x="205" y="130" font-size="12" style="fill:var(--muted)">circle</text>
</svg>
<figcaption>A search circle can cross into the neighboring cells, so all nine are read, then filtered by exact distance</figcaption>
</figure>

Two newer systems solve the same problem with better shaped cells. **H3**, from Uber, divides the world into hexagons, with exactly 12 pentagons at each resolution to close the globe, and each cell has 7 children. A cell covers about 0.74 square kilometers at resolution 8, and about 0.1 at resolution 9.

**S2**, from Google, projects the six faces of a cube onto the sphere and splits each into four, in order along a Hilbert curve, so nearby cells have nearby 64 bit ids. At level 12 its cells average about 5 square kilometers, and at level 14 about 0.3.

| System | Cell Shape | Cell Id |
| --- | --- | --- |
| Geohash | Rectangle | A string, longer for finer cells |
| H3 | Hexagon | A 64 bit number |
| S2 | Quadrilateral | A 64 bit number |

Because a cell is just a key, these ids fit in any store from [Key-Value Stores](/system-design/key-value-stores) or in a column of a plain table. To search a circle, you cover it with a handful of cells, read each cell's rows, and filter by exact distance.

## Trees: Boxes Inside Boxes

The second family indexes the shapes themselves. An **R-tree**, proposed by Antonin Guttman in 1984, groups nearby objects and stores the minimum bounding rectangle of each group, then groups the groups, in a balanced tree like the one in [B-Trees](/system-design/b-trees).

A window query starts at the root and follows only the boxes that overlap the query, so most of the tree isn't read. It is typically the preferred method for spatial data in databases.

The boxes can overlap, which makes some searches visit more branches, and there is no good worst case guarantee, though it performs well on real data.

A **quadtree** splits a square into four quadrants, and splits again only where there are many points, so crowded areas get deeper subdivision and empty ones stay coarse.

## In PostgreSQL: PostGIS

PostGIS adds spatial types and functions to PostgreSQL. Its `geography` type stores longitude and latitude and measures on a sphere, in meters, and its `geometry` type works on a flat plane. A spatial index uses GiST over the bounding boxes of the shapes:

```sql
CREATE TABLE pickup_spots (
  id        SERIAL PRIMARY KEY,
  name      text NOT NULL,
  location  geography(Point, 4326)
);
CREATE INDEX pickup_spots_gix ON pickup_spots USING GIST (location);

-- within 2 km (longitude comes first)
SELECT name FROM pickup_spots
WHERE ST_DWithin(location, 'SRID=4326;POINT(-75.0 40.0)'::geography, 2000);

-- the 20 nearest
SELECT name FROM pickup_spots
ORDER BY location <-> 'SRID=4326;POINT(-75.0 40.0)'::geography
LIMIT 20;
```

The number 4326 names the coordinate system used by GPS, and the order of the coordinates is longitude first.

That is why `ST_DWithin` is the right call: a filter like `ST_Distance(...) < 2000` computes a distance for every row, while `ST_DWithin` first compares bounding boxes, which an index can answer, and then computes exact distances for the candidates.

The `<->` operator in `ORDER BY` gives index assisted nearest neighbor results, as long as the reference point is a constant.

## In Redis and Elasticsearch

Redis offers geospatial commands on top of its sorted sets, storing each member with a 52 bit geohash as its score:

```text
GEOADD spots -75.0 40.0 library
GEOADD spots -74.998 40.002 union
GEOSEARCH spots FROMLONLAT -75.001 40.001 BYRADIUS 500 m ASC WITHDIST
1) 1) "library"
   2) "140.1"
2) 1) "union"
   2) "278.7"
```

The command finds members within 500 meters of a point and sorts them by distance. The distances here are our own calculation. Redis searches a grid aligned box around the circle and then filters to the exact shape, much like the cell approach above.

Elasticsearch has a `geo_point` field and a `geo_distance` query, which accepts a distance such as `"2km"` and a point, and uses great circle arc distance by default. It suits searches that combine location with text, as in [Full Text Search with Inverted Indexes](/system-design/search-engines).

## Choosing

| Need | Good Fit |
| --- | --- |
| Nearby points and areas, in an app already on PostgreSQL | PostGIS |
| A fast "what is near me" lookup held in memory | Redis geo commands |
| Nearby results mixed with text search and filters | Elasticsearch |
| Sharding or grouping data by area, in any store | Cell ids from geohash, H3 or S2 |

Three habits apply to all of them. The index returns candidates, and the exact distance check is part of the query. Remember the edges: cell borders, the poles and the 180 degree meridian. And treat location as sensitive.

A coarse cell, such as a 5 character geohash of about 2.4 km, is often enough to match students who are nearby, and it reveals far less than exact coordinates, so it is worth storing only that.

## Key Points

- Two coordinate columns can't be indexed well, because an index sorts by one key and a latitude range reads a stripe around the world
- Cell systems such as geohash, H3 and S2 turn a place into an id, and a search reads a cell and its neighbors, then checks exact distances
- <u>Tree indexes such as R-trees</u> group nearby objects in bounding boxes, so a query reads only the boxes that overlap it
- PostGIS uses a GiST index with `ST_DWithin` for radius searches and `<->` for the nearest neighbors, and Redis and Elasticsearch offer their own geo queries
- The index finds candidates, the exact distance decides, and a coarse cell is often enough for privacy
