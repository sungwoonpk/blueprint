> A **caching pattern** is a rule for who fills the cache and who keeps it in step with the database. Reads have two common patterns, **cache-aside** and **read-through**, and writes have three, which differ in whether the cache is updated, emptied or written first.

[Where to Put a Cache](/system-design/where-to-cache) chose the places for copies. Now the copies need a life: how does data get into a cache, and what happens to the copy when the original changes? The textbook app's listing page is the example. It is read thousands of times a second and changed a few times a day.

## Reading With Cache-Aside

In **cache-aside**, also called lazy loading, the application does the work. It looks in the cache first, and on a miss it reads the database and puts the result in the cache for next time. It takes three steps:

```python
def get_listing(listing_id):
    key = f"listing:{listing_id}"
    listing = cache.get(key)
    if listing is not None:
        return listing                      # hit
    listing = db.get_listing(listing_id)    # miss: ask the database
    if listing is not None:
        cache.set(key, listing, ttl=60)     # fill for next time
    return listing
```

This is the most common pattern, for good reasons. Only data that is requested gets cached, so the cache doesn't fill with things nobody reads, and a failed cache node isn't fatal, since its replacement just causes misses until it refills.

It has costs, too. A miss takes three trips: the cache read, the database read and the cache write. The data can also go stale, because nothing updates the cache when the database changes. The `ttl=60` in the code is the first defense: the entry expires after 60 seconds, and the next read refreshes it.

One small detail in the code matters. If the database has no such listing, the function doesn't cache the empty result. Repeated lookups for ids that don't exist would then reach the database on each lookup. A fix is to cache a "not found" answer for a short time of its own, so the database isn't pestered.

## Reading With Read-Through

In **read-through**, the cache does the work. It is set up with a loader, a piece of code that knows how to fetch from the database.

The application asks only the cache, and on a miss the cache calls the loader, stores the value and returns it. A cache built like this is sometimes called an inline cache.

The reads look the same from outside. The difference is who owns the miss logic. With read-through, the application code is shorter, and there is one place where duplicate misses for the same item can be merged into one database call, which Ehcache points out helps with the thundering herd, covered in [Cache Stampedes](/system-design/cache-stampedes).

The price is that the cache must be able to reach the database, and the code path is harder to see. Use cache-aside when the cache doesn't support read-through.

## Writing: Update, Then Invalidate

When a seller lowers a price, the database changes and the cached copy is wrong. The simplest fix is to write to the database and then delete the cache entry, so the next read misses and loads the new value. This is the cache-aside write path, and the order matters.

Deleting first looks tempting and goes wrong. Here is how a reader gets in between:

<figure class="diagram">
<p class="rowname">Writer</p>
<div class="flow">
<div class="node">1. Delete Entry</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">4. Update Database</div>
</div>
<p class="rowname">Reader</p>
<div class="flow">
<div class="node">2. Miss</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">3. Read Old Price</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">5. Cache Old Price</div>
</div>
<figcaption>Deleting first lets a reader put the old value back</figcaption>
</figure>

The old price now sits in the cache until the entry expires. Updating the database first and deleting second narrows this window, though it doesn't close it: a reader that fetched the old value just before the update can still write it after the delete.

That is rare, and the TTL puts a limit on how long the mistake lives. [Cache Invalidation](/system-design/cache-invalidation) goes deeper.

## Writing: Write-Through

In **write-through**, every write goes through the cache. The cache, or the code around it, updates both the database and the cache's copy before it reports success. The main benefit is that the cache stays current after each write, so readers see the new price at once.

The costs are that each write takes two trips, and that much of what gets written is not read, so the cache fills with unused entries.

A TTL or an eviction policy cleans these up, as in [Cache Eviction Policies](/system-design/cache-eviction). A cache node that is new or was replaced is also missing data until it is written again, so write-through is often combined with lazy loading.

Use write-through for data that is read often and needs to show a change right away. For the textbook app, that could be a listing's sold status, where a buyer should not be offered a book that is gone.

## Writing: Write-Behind

In **write-behind**, also called write-back, the application writes only to the cache. The cache saves the change to the database later, usually in batches. The writing thread doesn't wait for the database, which means better write performance with simpler code.

The cost is the delay. For a while the cache holds changes that the database doesn't, so anything reading the database sees old data. And if the cache fails before the queue is saved, those writes can be lost.

That makes it a poor choice for money and a good one for data that is cheap to lose a little of, such as the count of views on a listing:

```text
Page view of listing 17  ->  cache: views:17 = views:17 + 1
Every 5 seconds          ->  database: UPDATE listings SET views = ...
```

Many views become one database write, which is the real gain: a hot counter that would have caused thousands of writes a second causes one every few seconds.

## Choosing a Pattern

| Pattern | Main Strength | Main Cost |
| --- | --- | --- |
| Cache-Aside | Simple, works with any cache, survives cache failures | The app owns the logic, and a miss takes three trips |
| Read-Through | Shorter app code, one place to merge duplicate loads | The cache must reach the database |
| Write-Through | The cache matches the database after each write | Slower writes, and entries nobody reads |
| Write-Behind | Fast writes, batched into fewer database writes | The database lags, and queued writes can be lost |

Real systems mix them. The combination most teams end up with is lazy loading for reads, write-through or invalidation for updates, and a TTL on everything as a backstop. For the textbook app, that means cache-aside with a 60 second TTL for listing pages, delete on update for price changes, and write-behind for view counters.

Cache-aside has limits: don't use it for sensitive data that should come from the source, and don't use it when most requests would miss, since the extra lookup then costs more than it saves.

None of these patterns removes staleness completely. They decide how long it lasts and who is responsible for it, and the next topics cover removing entries and the trouble that arrives when many entries expire at once.

## Key Points

- Cache-aside has the application check the cache, load from the database on a miss and fill the cache, and it is the common default
- Read-through moves the loading into the cache, which shortens application code and can merge duplicate misses
- On a write, update the database first and then delete the cache entry, since deleting first lets a reader cache the old value
- <u>Write-through keeps the cache current</u> at the cost of slower writes, and write-behind speeds writes up at the risk of lag or lost writes
- Most systems combine lazy loading, invalidation on write and a TTL as a backstop
