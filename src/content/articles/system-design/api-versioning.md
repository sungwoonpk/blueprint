> **API versioning** lets an API make a breaking change without breaking the clients that already exist, by keeping the old behavior alongside the new for a while and retiring it on a schedule.

[What Makes a Good API](/system-design/good-apis) sorted changes into safe ones, such as adding a field, and breaking ones, such as renaming or removing it. The best versioning plan is to need it rarely: add instead of change, and keep old fields working. But sometimes a break can't be avoided.

In [Serialization and Schema Evolution](/system-design/serialization), the textbook app's price moved from dollars to cents, and an old phone app that read the new number would show a $4,500 book. Phones are the hard case, because people don't update, and an app from two years ago still calls the API today.

## Saying Which Version You Mean

The client has to tell the server which behavior it expects. There are three common places to put that:

```text
GET /v2/listings/42                          (in the path)
GET /listings/42  with  API-Version: 2026-11-15   (in a header)
GET /listings/42?version=2                   (in the query string)
```

| Where | Good | Watch Out For |
| --- | --- | --- |
| Path | Visible everywhere, easy to try in a browser, easy for a router to split | The URL of a resource changes between versions |
| Header | URLs stay the same, and the version can be a date | Hidden, so harder to test by hand, and caches must treat the header as part of the key |
| Query String | Quick to add | Easy to forget, and it clutters caching and logs |

Most public APIs use the path. It is the easiest for outsiders to understand and for a CDN to cache, which is the habit of the REST style in [REST APIs](/system-design/rest). A header suits cases where the URL should stay stable, and the choice matters less than picking one and using it everywhere.

## What a Version Covers

A version number can mean different amounts of change. Some APIs bump a single number for the whole API, `v1` to `v2`, and move everything at once. Some version each resource separately. Stripe's API, which is known for keeping old integrations working, uses dates instead.

According to its engineering blog, an account is pinned to the newest version at its first request, and each later request uses that version unless the caller sets a `Stripe-Version` header. Its 2017 post says Stripe had stayed compatible with all its versions since 2011.

How can one codebase serve hundreds of old versions? In the design that post describes, the code builds the newest response, then a chain of small steps, one for each breaking change, rewrites it back to the shape an older version expects:

<figure class="diagram">
<div class="flow">
<div class="node">Newest Response<small>built by current code</small></div>
<div class="arrow" data-label="undo C" aria-hidden="true"></div>
<div class="node">Older Shape</div>
<div class="arrow" data-label="undo B" aria-hidden="true"></div>
<div class="node">Pinned Version<small>what this client expects</small></div>
</div>
<figcaption>Each breaking change is written once, as a small step that can be undone</figcaption>
</figure>

Each change lives in one small place, and the core logic doesn't need to learn about old versions. That is a lot of discipline, and few APIs go this far. For most teams, one or two live versions is a practical limit.

## Running Two Versions

The cheap way to keep two versions alive is to keep one copy of the real logic. A thin layer in front translates each version to and from the same core:

<figure class="diagram">
<div class="flow">
<div class="stack">
<div class="node">Old Phone App<small>v1</small></div>
<div class="node">New Phone App<small>v2</small></div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Version Layer<small>one translator per version</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Core Logic<small>one copy</small></div>
</div>
<figcaption>The versions differ at the edge</figcaption>
</figure>

For the price change, the translators can be as small as this:

```python
def listing_v1(listing):
    return {"id": listing.id, "price": listing.price_cents / 100}

def listing_v2(listing):
    return {"id": listing.id, "price_cents": listing.price_cents}
```

The core stores cents, and v1 clients still get dollars. Without this split, each bug fix would have to be made twice, and the two copies would slowly drift apart.

## Retiring an Old Version

A version that nobody switches off can live forever. Retiring one is a schedule, and the schedule is part of the promise to clients:

1. **Announce**: say which version is going, when, and what replaces it
2. **Measure**: log the version on each request, as in [Logs, Metrics and Traces](/system-design/observability), so you can see who still calls the old one
3. **Warn in responses**: tell callers in the response itself, so even a neglected integration sees it in its logs
4. **Chase the stragglers**: contact the biggest remaining callers directly
5. **Switch it off**: on the announced date, or after short planned outages that flush out whoever hasn't moved

The warning in step 3 can use headers made for this. `Sunset`, defined in RFC 8594, carries the date the version stops working. `Deprecation`, defined in RFC 9745, says when the version was or will be marked deprecated, written as `@` and a Unix timestamp. A `Link` header with the relation `sunset` points to a page that explains the plan:

```http
HTTP/1.1 200 OK
Deprecation: @1796083200
Sunset: Sun, 30 May 2027 23:59:59 GMT
Link: </docs/v1-sunset>; rel="sunset"
```

Clients that log response headers will pick these up without anyone reading an email.

## The Price of Each Version

Every version kept alive is a cost that keeps growing:

- **Tests and docs**: each version needs its own, and each can break on its own
- **Fixes**: a security patch has to reach each version still running
- **Mistakes**: a change that was meant for v2 can leak into v1

So keep the number small, set a support window, such as 12 months after a replacement ships, and write it down. Versions are also less needed between your own services, since you control both sides and can use the expand, migrate and contract steps from [Designing for Maintainability](/system-design/maintainability) to change one without the other noticing. gRPC and Protocol Buffers favor compatible changes over new versions, and when a break can't be avoided, the usual route is a new package such as `listings.v2` next to the old one.

## Key Points

- Add instead of change when you can, and version only when a break is unavoidable
- The version goes in the path, a header or the query string, and the path is the most common choice
- <u>Keep one copy of the logic</u> and translate each version at the edge
- Retire old versions on a schedule: announce, measure, warn in responses, then switch off
- Each live version multiplies tests, docs and fixes, so keep few, and prefer compatible changes between your own services
