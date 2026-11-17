> **Cache invalidation** is removing or replacing a cached copy when the data behind it changes. It is hard because the copies live in many places, and the code that changes the data often doesn't know where they are.

Martin Fowler's site collects a saying he credits to Phil Karlton: there are only two hard things in computer science, cache invalidation and naming things. It is a joke, but it lands because of how caches work.

In [Where to Put a Cache](/system-design/where-to-cache) a single listing could be copied into a browser, a CDN, a server's memory and a shared cache. When the seller lowers the price, which of those copies gets fixed, and who does it?

## Four Ways to Keep Copies Fresh

Each approach trades effort against how long a wrong copy can live:

| Strategy | How It Works | Wrong Copy Lives |
| --- | --- | --- |
| Wait for the TTL | The entry expires on a timer | Up to the TTL |
| Delete on Write | The code that changes the data deletes the entry | Until the next read after the delete |
| Update on Write | The code that changes the data also sets the new value | Until the next change, if updates arrive out of order |
| Follow Events | A change event, such as a database log entry, triggers the delete | A short delay |

Most systems combine the first two and add the others when they need them. The sections below take them in order.

## The TTL as a Backstop

A time to live is the simplest and the most dependable, since it needs no cooperation from the writer. Choose it by how much staleness the data tolerates: a popular search result can be 30 seconds old, a price on a checkout page can't.

A good habit is two lifetimes: a soft one, after which the entry is refreshed, and a hard one, after which it must not be used. If the database is down at the soft limit, the cache keeps serving the old copy until the hard limit, so a short outage doesn't spread.

HTTP has the same idea built in. A server can tell caches how long a stale copy may still be used:

```text
Cache-Control: max-age=60, stale-while-revalidate=30
Cache-Control: max-age=60, stale-if-error=300
```

The first line says: after 60 seconds the copy is stale, but for 30 more seconds a cache may serve it while it fetches a fresh one in the background.

The second says: if the origin returns an error, a stale copy may be served for up to 300 more seconds. There is also `s-maxage`, which sets a lifetime for shared caches such as a CDN and is ignored by browsers.

## Delete on Write, and Why Not Update

When a listing's price changes, the usual code updates the database and then deletes the cache entry. Facebook's Memcache does exactly this, and deletes instead of setting the new value because a delete is idempotent.

Doing it twice gives the same result, so a lost delete can safely be tried again, as in [Idempotency and Safe Retries](/system-design/idempotency).

A set is not so forgiving, because sets can arrive in the wrong order. Two edits reach the same listing, A and then B, and the database ends with B's price:

<figure class="diagram">
<p class="rowname">Database</p>
<div class="flow">
<div class="node">A Sets 4,000</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">B Sets 3,500<small>final value</small></div>
</div>
<p class="rowname">Cache Updated by Sets</p>
<div class="flow">
<div class="node">B's Set Arrives First</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">A's Set Arrives Last<small>4,000 stays</small></div>
</div>
<p class="rowname">Cache Updated by Deletes</p>
<div class="flow">
<div class="node">Both Delete</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Next Read Loads 3,500</div>
</div>
<figcaption>Sets can arrive out of order, and deletes leave the database to decide</figcaption>
</figure>

With deletes, the order doesn't matter. Each delete makes the next read go to the database, which holds the right value.

The weakness is a delete that never arrives, for example because the network failed between the app and the cache.

The entry then stays wrong until its TTL runs out, which is one more reason to keep the TTL. Keeping deletes in a log, so that they can be replayed, is the better answer, and it leads to the next idea.

## Let the Database Tell You

Deleting in the application code works until another program starts changing the same table: a batch job, an admin tool, a second service. Each of them has to know which cache keys to delete, and one forgets.

Facebook's design moves the job to the database's side. A daemon called mcsqueal reads each database's commit log, picks out the keys that the committed changes should invalidate, and sends the deletes to the caches in every cluster, in batches.

Because the log is reliable, the daemon can replay invalidations that were lost or misrouted.

<figure class="diagram">
<div class="flow">
<div class="node">Database</div>
<div class="arrow wide" data-label="commit log" aria-hidden="true"></div>
<div class="node">Invalidator</div>
<div class="arrow" data-label="deletes" aria-hidden="true"></div>
<div class="stack">
<div class="node">Cache, Cluster 1</div>
<div class="node">Cache, Cluster 2</div>
</div>
</div>
<figcaption>The database's own log drives the deletes</figcaption>
</figure>

The general technique is **change data capture**. Debezium's FAQ describes it as reading a database's transaction log, and publishing each row change as an event in commit order, and lists removing entries from a cache among its uses.

This ties into [Event-Driven Architecture](/system-design/event-driven) and [The Transactional Outbox](/system-design/transactional-outbox). The price is more machinery, and a small delay between the commit and the delete.

A related idea exists for copies inside application processes. Redis can track which keys each client has read and send that client an invalidation message when one of them changes, so a local cache stays correct without short TTLs. Publishing a message to every client on every write is the tricky and costly alternative.

## Invalidating a CDN and Browsers

Copies at the edge need different tools. You can't delete what a browser has stored, and there is no way to reach into intermediate caches, so the usual answer for files is to change the name: a new file name for each version, as in [How HTTP Works](/system-design/http).

CDNs offer purge, with the same methods at Cloudflare and Fastly: purge one URL, purge a group, and purge everything. The group method uses labels that the origin attaches to its responses, a `Cache-Tag` header at Cloudflare and a `Surrogate-Key` header at Fastly. For the textbook app:

```text
Cache-Tag: listing-17, subject-calculus
```

When listing 17 changes, one purge of `listing-17` removes its page, its photo thumbnails and any list that carries the tag, wherever they are cached. Purging everything works too, but both vendors warn about the cost: the next requests all go to the origin, which can strain it.

The same vendors offer a gentler form, which Fastly calls a soft purge, that marks an entry stale so it can be served while a fresh copy is fetched.

A successful reply to a purge request means the request was received, so check that the next response is a miss before trusting it. See [Content Delivery Networks (CDNs)](/system-design/cdn) for the rest of the CDN.

## Races and Leases

Even delete on write has a race. A reader misses and reads the old price from the database. The writer then updates the database and deletes the key. The reader finally stores its old value, which is now stale. Facebook calls this a **stale set**, and its answer is a **lease**.

When a client misses, the cache hands it a token tied to that key. The client must show the token when it stores the value, and a delete cancels the token, so the late set from the example is rejected.

The same token cuts the load from a key that is read all the time and changed often.

By default the cache hands out one token per key every 10 seconds, and other readers are told to wait a moment and ask again, by which time the value is usually there. On one group of keys, Facebook measured the database's peak rate dropping from 17,000 queries a second without leases to 1,300 with them.

There is a refinement: the cache can keep a recently deleted value for a short time and return it marked as stale, for applications that can continue with slightly old data. The related problem of many readers missing at once gets its own topic in [Cache Stampedes](/system-design/cache-stampedes).

## Choosing a Strategy

A reasonable path for the textbook app:

1. **TTL on every entry**: Short for prices and counts, longer for data that rarely changes
2. **Delete after the database write**: Keep the order, and retry the delete if it fails
3. **Version in the key where possible**: A key such as `listing:17:v42` can't go stale, since a change makes a new key and the old one ages out
4. **Events when many writers exist**: Move the deletes to the database's log or a change stream
5. **Purge tags for the CDN**: Tag responses at the origin and purge by tag

Whatever the strategy, say out loud how stale each kind of data may be. Hard bugs here come from teams who assumed the cache was always right.

## Key Points

- Invalidation is hard because copies live in many places and writers don't know them all
- A TTL is the dependable backstop, and HTTP adds `stale-while-revalidate` and `stale-if-error` for how long a stale copy may be used
- Delete on write, after the database change, because deletes are idempotent and don't suffer from out of order sets
- <u>Let the database's log drive invalidation</u> when many programs change the data, and use cache tags to purge a CDN
- Races leave stale sets, which leases prevent, and each kind of data needs a stated staleness limit
