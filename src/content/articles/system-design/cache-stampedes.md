> A **cache stampede**, also called a dogpile or a thundering herd, is what happens when a popular cache entry expires or goes missing and many requests rebuild it at the same moment. The cache that was protecting the database now sends it a crowd.

Registration day, 9:00 AM. The search results for "calculus" are the page most students open, so it is cached for 60 seconds, and about 600 requests a second ask for it. Building it is a heavy query that takes 0.8 seconds. For 59 seconds the cache does its job, and then the entry expires.

## One Expiry, Hundreds of Queries

At the instant of expiry the next request misses and starts the query. The one after it also misses, because the first has not finished, and so do all the rest, for the 0.8 seconds the query takes:

<figure class="diagram">
<div class="flow">
<div class="node">Entry Expires</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">480 Requests Miss<small>600 a second for 0.8 s</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">480 Identical Queries<small>instead of 1</small></div>
</div>
<figcaption>Each request that misses starts its own rebuild</figcaption>
</figure>

Take a page that needs 3 seconds to render and 10 requests a second. While the entry is missing, about 30 processes start recomputing it, and the result is a kind of cascading failure.

The extra load slows the database, so the rebuild takes longer, which lets more requests miss, which adds more load. The hit rate stays near zero while the load stays high, until something gives. See [Cascading Failures](/system-design/cascading-failures).

Expiry is only one trigger. The same crowd appears when:

- **A cache starts empty**: A new server, a restart or a flush has no entries, and the first wave of requests misses on everything
- **An invalidation deletes a hot key**: Delete on write, from [Cache Invalidation](/system-design/cache-invalidation), turns a hot entry into a miss
- **Many keys expire together**: Entries filled in one batch, or all at once after a flush, share an expiry time

This is the danger of **modal behavior**: the database is sized for the misses at a healthy hit ratio, and a stampede sends it all the requests at once, as described in [Where to Put a Cache](/system-design/where-to-cache).

## One Request Rebuilds

The most direct fix is to let one request rebuild the entry while the others wait or use something else. This is called **request coalescing**, and the lock version is the common one.

A common form uses a lock in the shared cache. The building block is `SET key value NX PX 5000`, which sets a key only if it doesn't exist, and expires it after 5000 milliseconds, so a crashed holder can't keep the lock forever:

```python
def get_search(subject, tries=20):
    key = f"search:{subject}"
    value = cache.get(key)
    if value is not None:
        return value
    if cache.set(f"lock:{key}", my_id, nx=True, px=5000):
        try:
            value = db.run_search(subject)       # only this request
            cache.set(key, value, ex=60)
            return value
        finally:
            release_if_mine(f"lock:{key}", my_id)
    if tries == 0:
        return db.run_search(subject)            # give up waiting
    time.sleep(0.05)
    return get_search(subject, tries - 1)        # look again
```

One request builds the entry and the others check again every 50 ms. The tradeoffs: the lock costs an extra write, a holder that crashes or runs slowly needs a sensible lock timeout, and races remain.

A lock like this is fine when an occasional race is acceptable, but it isn't safe under failover.

Some tools do this for you. Go's `singleflight` package makes sure only one call per key is in flight and gives its result to the duplicates, but only inside one process, so six servers still send six queries, a great improvement over 480.

Nginx has `proxy_cache_lock on`, which lets one request fetch from the origin while the others wait, and Varnish keeps a waiting list for the same object automatically.

The waiters have to wait, and that is the weak point. They have three choices: wait, get a "not found" answer, or get a stale copy.

## Serve Stale While Refreshing

The next fix lets no one wait. When an entry expires, the cache keeps serving the old copy for a little while, and one request refreshes it in the background. HTTP has this as `stale-while-revalidate`, as seen in [Cache Invalidation](/system-design/cache-invalidation). Varnish calls its version grace, and Nginx does it with three lines:

```nginx
proxy_cache_lock on;
proxy_cache_use_stale updating error timeout;
proxy_cache_background_update on;
```

With these, one request refreshes an expired entry in the background while the others get the stale copy at once, and the stale copy is also served if the origin errors or times out.

The price is that for a moment users see data that is a little old, which for a 60 second search result is usually fine.

This is the soft and hard TTL idea again: refresh after the soft one, and keep serving the old copy until the hard one if the database is struggling.

## Refresh Before Expiry

A third approach avoids the empty moment altogether by rebuilding the entry before it expires. There are two ways. **External recomputation** has a separate job rebuild entries when they near expiry or on a schedule, which suits a small known set of keys, like the top searches, and adds a component to maintain.

**Probabilistic early expiration** needs no extra part. Each request that finds the entry decides, with a weighted coin, whether to refresh early, and the chance rises as expiry approaches. The rule, called XFetch after the paper by Vattani, Chierichetti and Lowenstein that proved it optimal, is:

```python
def should_refresh(now, expiry, delta, beta=1.0):
    # delta: how long the last rebuild took
    return now - delta * beta * math.log(1 - random.random()) >= expiry
```

The logarithm of a random number between 0 and 1 is negative, so the formula adds a random head start before expiry.

A slow rebuild, a large `delta`, gets a bigger head start, and more traffic means more chances to win the coin, so the entry is usually refreshed by one request shortly before it expires. It needs `delta` stored beside the value.

We simulated the three fixes on the calculus page: 600 requests a second, a 0.8 second rebuild, a 60 second TTL, over one hour:

| Approach | Rebuilds Per Expiry | Most at Once |
| --- | --- | --- |
| No Protection | 465 | 536 |
| One Request Rebuilds | 1 | 1 |
| Early Expiration | 2.5 | 8 |

No protection costs almost as many queries as there are requests in the rebuild window. Locking is the tightest. Early expiration allows a few extra, because several requests can win the coin within the 0.8 seconds, but no one waits and no lock is needed.

## Smaller Habits

A few cheap habits reduce the chance of a stampede in the first place:

- **Add jitter to TTLs**: Give each entry its TTL plus or minus about 10 percent, so keys written together don't expire together. The same idea works for timers and periodic jobs: add a little randomness to spread out spikes of work
- **Warm the cache**: Fill the hottest entries before a deploy or a known peak, instead of letting the first users do it
- **Cache "not found" briefly**: Repeated requests for a missing key would otherwise reach the database each time, as in [Caching Patterns for Reads and Writes](/system-design/caching-patterns)
- **Protect the database**: Cap how many rebuild queries run at once, so an unexpected crowd is turned away instead of taking the database down

## Choosing a Fix

| Situation | First Tool |
| --- | --- |
| One hot key expires | Coalesce requests, and serve stale while refreshing |
| Many keys expire together | TTL jitter |
| A cache starts empty | Warm it, and coalesce |
| A small set of known hot keys | A background job that refreshes them |
| Many hot keys with different rebuild times | Early expiration |

## Key Points

- A stampede is a crowd of identical rebuilds after a hot entry expires, and in our example 480 queries replace 1
- It also follows cold starts, invalidated hot keys and many keys expiring together, and it can cascade as the slow database causes more misses
- <u>Let one request rebuild</u>, with a lock, request coalescing or singleflight, and decide what the others do while they wait
- Serve stale while refreshing, or refresh before expiry with a background job or probabilistic early expiration
- Add jitter to TTLs, warm caches before peaks, and cap concurrent rebuilds to protect the database
