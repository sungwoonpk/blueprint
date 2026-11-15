> **Pagination** returns a long list one page at a time, along with a way to ask for the next page. It keeps each response small, and the design choice that matters is how the next page is found.

[What Makes a Good API](/system-design/good-apis) warned that an API that works with 20 listings can fall over with 2 million, because one request asks for everything. The reply would be enormous, slow to build and slow to send, and the phone would only show a screenful anyway. So lists come back in pages, the way `GET /listings?subject=calculus&limit=20` did in [REST APIs](/system-design/rest). The open question is how the client asks for page two.

## Page Numbers: Offset and Limit

The obvious answer is to say how many rows to skip and how many to return:

```text
GET /listings?limit=20&offset=40
```

```sql
SELECT id, title, price FROM listings
WHERE subject = 'calculus'
ORDER BY created_at DESC
LIMIT 20 OFFSET 40;
```

It is simple, and it maps onto page numbers: page 3 is offset 40 with 20 per page. A client can jump straight to any page, and the total count gives "page 3 of 12". Small, steady lists, such as an admin screen of a few hundred rows, are fine with this. It has two weaknesses that show up once the list is big and busy.

### Deep Pages Get Slow

To skip 100,000 rows, the database still has to find them, count them and throw them away. The cost grows with how deep the page is:

<figure class="chart">
<div class="hbars">
<div class="hbar"><span>Page 1</span><span class="track"><span class="fill" style="--w: 0.5%"></span></span><span class="value">20</span></div>
<div class="hbar"><span>Page 100</span><span class="track"><span class="fill" style="--w: 2%"></span></span><span class="value">2,000</span></div>
<div class="hbar peak"><span>Page 5,000</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">100,000</span></div>
</div>
<figcaption>Rows the database reads to return one page of 20, with offset paging</figcaption>
</figure>

Reading rows isn't free, and the time follows. Few people scroll to page 5,000, but a script copying the whole list will, and it makes each request slower than the last.

### The List Moves While You Read It

The second problem needs no scale at all. New listings arrive at the top, so everything shifts down by one while a student reads page 1. Then offset 5 means something different:

<figure class="diagram">
<p class="rowname">Page 1, Offset 0</p>
<div class="flow packets">
<div class="node">A</div>
<div class="node">B</div>
<div class="node">C</div>
<div class="node">D</div>
<div class="node">E</div>
</div>
<p class="rowname">A New Listing X Arrives at the Top</p>
<div class="flow packets">
<div class="node wait">X</div>
<div class="node wait">A</div>
<div class="node wait">B</div>
<div class="node wait">C</div>
<div class="node wait">D</div>
</div>
<p class="rowname">Page 2, Offset 5</p>
<div class="flow packets">
<div class="node lost">E<small>seen twice</small></div>
<div class="node">F</div>
<div class="node">G</div>
<div class="node">H</div>
<div class="node">I</div>
</div>
<figcaption>An insert pushes E onto page 2, so the reader sees it again. A delete would make a row vanish instead</figcaption>
</figure>

Listing E shows up twice. If a listing had been deleted, one would be skipped and not shown at all. For a feed or an export, that is a real bug.

## Cursors: Continue From Here

The fix is to stop counting rows and point at a place in the list. The client says "give me 20 after this one", and the server finds that spot directly. This is **cursor** or **keyset** pagination:

```sql
SELECT id, title, price, created_at FROM listings
WHERE subject = 'calculus'
  AND (created_at, id) < ('2026-11-15 09:00:00', 42)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

The condition asks for rows strictly older than the last one the client saw. (Some databases need that comparison written out as two conditions.) With an index on `(created_at, id)`, the database jumps to that spot without reading what comes before it, so page 5,000 costs about the same as page 2.

New listings at the top don't shift the next page, since the cursor points at a specific row and not a position. The `id` in the sort is a tiebreaker: two listings can share a timestamp, and without a unique second column, one of them could be skipped at a page boundary.

The client never builds that condition. The server packs the last row's values into a **cursor**, usually an encoded string the client treats as opaque and hands back unchanged:

```json
{"items": [ ...20 listings... ],
 "next_cursor": "eyJ0IjoiMjAyNi0xMS0xNVQwOTowMDowMFoiLCJpZCI6NDJ9",
 "has_more": true}
```

That string is just `{"t":"2026-11-15T09:00:00Z","id":42}` encoded, but the client shouldn't rely on that. Keeping it opaque means the server can later change what it holds, such as adding a filter or switching the sort, without breaking anyone. Calling code is a short loop:

```python
cursor = None
while True:
    page = api.get("/listings", limit=20, cursor=cursor)
    handle(page["items"])
    if not page["has_more"]:
        break
    cursor = page["next_cursor"]
```

Apps that scroll endlessly, like a feed, work naturally this way, since "load more" is exactly "give me what comes after the last one". GraphQL's usual convention is the same: the `first: 20` in the query from [GraphQL](/system-design/graphql) pairs with an `after` cursor.

## What Cursors Give Up

Nothing is free, and cursors trade away some of what offsets did well:

| | Offset and Limit | Cursor |
| --- | --- | --- |
| Jump to Page N | Yes | No, you must walk there |
| Cost of a Deep Page | Grows with depth | About the same as page 1 |
| Stable While Data Changes | No, rows repeat or vanish | Yes |
| Total Count and "Page 3 of 12" | Easy | Harder, and often left out |
| Needs a Unique Sort Key | No | Yes |
| Fits Best | Small, steady lists with page numbers | Big or busy lists, feeds, exports |

Total counts deserve a second look. Counting all the matching rows on a large table can cost as much as reading it, so many APIs return no total, or an approximate one, and offer "next" without "page 3 of 12". Cursors also tie each query to one sort order. Letting users sort by price or by date means an index and a cursor format for each choice you support.

## Designing the Paging Contract

Pagination is part of the API, so it follows the habits in [What Makes a Good API](/system-design/good-apis):

- **One style everywhere**: each list pages the same way, with the same parameter names and the same response shape
- **A default and a maximum**: say the page size is 20 unless asked, and refuse a request for 100,000, so no single call can be made expensive
- **A documented order**: write down the default sort, since someone will come to depend on it, the Hyrum's Law point from earlier
- **Say when to stop**: return `has_more` or a missing cursor, so clients don't need to guess from an empty page
- **Safe to retry**: asking for the same page again is harmless, so a timed out request can simply be repeated, as in [Idempotency and Safe Retries](/system-design/idempotency)

Search results are a special case. Ranking them for each query is costly, so search engines usually cap how deep you can go, and few users look past the first pages anyway. Syncing data to a phone is another, where "everything changed since this time" works better than pages. Both are the same idea of continuing from a known place, in a different form.

## Key Points

- Pagination keeps responses small by returning a list one page at a time
- Offset and limit is simple and allows page numbers, but deep pages get slow and a changing list repeats or skips rows
- <u>A cursor points at a row, not a position</u>, so the cost stays flat and inserts don't shift pages
- A cursor needs a unique sort key, such as a timestamp plus an id, and the client should treat it as opaque
- Cursors give up page jumps and cheap totals, so choose by how big and busy the list is
- Set a default and a maximum page size, document the sort order, and use one style across the API
