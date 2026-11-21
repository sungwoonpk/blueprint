> A **cache** is a faster, smaller store that keeps copies of data likely to be asked for again, so most requests don't reach the slow original. This topic is about where copies can live along a request's path, because each place trades speed, sharing and freshness differently.

On registration day, thousands of students open the same few searches in the textbook app, such as "calculus" and "organic chemistry". The database answers each one from scratch, even though the answer was the same a second ago.

A cache remembers the answer and spares the database the repeat work. The harder question is where the remembered answer should sit.

## Why a Cache Helps

A request that finds its data in the cache is a **hit**, and one that doesn't is a **miss**. The share of requests that are hits is the **hit ratio**. Say the cache answers in 1 ms and the database takes 20 ms.

Every request checks the cache first, and a miss then pays for the database too, so the average time is 1 ms plus the misses' 20 ms: about 21 ms with no hits, 11 ms at a 50 percent hit ratio, 3 ms at 90 percent and 1.2 ms at 99 percent.

The second gain matters more for the system. At the registration day peak of 3,000 requests a second, the database sees just the misses:

<figure class="chart">
<div class="hbars" role="img" aria-label="Queries per second reaching the database at four hit ratios, from 3,000 with no cache down to 30 at 99 percent hits">
<div class="hbar peak"><span>No Cache</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">3,000</span></div>
<div class="hbar"><span>50% Hits</span><span class="track"><span class="fill" style="--w: 50%"></span></span><span class="value">1,500</span></div>
<div class="hbar"><span>90% Hits</span><span class="track"><span class="fill" style="--w: 10%"></span></span><span class="value">300</span></div>
<div class="hbar"><span>99% Hits</span><span class="track"><span class="fill" style="--w: 1%"></span></span><span class="value">30</span></div>
</div>
<figcaption>Queries per second reaching the database, out of 3,000 requests a second (example numbers)</figcaption>
</figure>

Those are the reasons to cache: lower latency, lower cost because the dependency can be smaller, and some protection from a slow or throttled dependency. There is a condition. A cache helps when data is reused across requests, and a query that is unique each time gets almost no benefit.

What suits a cache? Data that is read far more than it changes, that is slow or costly to produce, and whose users can live with a slightly old answer.

Be careful with data that changes constantly, or must be current, and don't make a cache the sole copy of something important, since a cache is a transient store that can disappear at any time.

## The Layers

A request passes through several places that can hold a copy, from the user's device to the database:

<figure class="diagram">
<p class="rowname">Closer to the User</p>
<div class="flow">
<div class="node">Browser Cache<small>one user</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">CDN<small>many users, nearby</small></div>
</div>
<p class="rowname">Closer to the Data</p>
<div class="flow">
<div class="node">Server Memory<small>one server</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Shared Cache<small>many servers</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Database Memory<small>its own copy</small></div>
</div>
<figcaption>Each layer is a chance to answer before the next one</figcaption>
</figure>

Moving along the path, a cache gets farther from the user and closer to the data, and each layer has its own character:

- **Browser cache**: private to one user, so it can hold personalized responses. It is the fastest layer, since the request stays on the device, and it is also out of your control: you can't delete what a browser has stored, which is why files get new names when they change. See [How HTTP Works](/system-design/http)
- **CDN**: a shared cache near the users that serves many people with one copy. It is a managed cache, since you can purge it through an API, and storing personalized content in a shared cache risks showing it to the wrong person. See [Content Delivery Networks (CDNs)](/system-design/cdn)
- **Server memory**: a cache inside each web server's process. It is quick and low risk, often the first thing a team tries. Its weaknesses are that each server holds its own copy, so two servers can answer differently, a new server starts empty, and memory per server is limited
- **Shared cache**: a separate fleet, such as Redis or Memcached, that the servers read together. This makes answers more consistent, keeps a deploy from emptying the cache and keeps the database load from growing with the number of servers. The costs are another fleet to run and one more network hop, and the cache can be less available than the database it protects
- **Database memory**: the database keeps recently used pages in memory, a cache you get without writing any code. It helps repeated queries, but each one still reaches the database and uses its connections and CPU

A good habit is to combine the two middle layers: a small cache in each server, backed by the shared cache, with the database as the last stop. The small one keeps the app working if the shared cache can't be reached.

## Who Talks to the Cache

A cache can also be wired in two ways. In a **side cache**, the application checks it first and fills it after a miss, so the code decides what to do.

In an **inline cache**, the cache sits in front of the data and fetches on a miss by itself, which keeps cache code out of the application but makes the cache part of the data store's availability. [Caching Patterns for Reads and Writes](/system-design/caching-patterns) covers both in detail.

## Choosing Where in the Textbook App

Each kind of data has a place where a copy makes sense:

| Data | Where | Why |
| --- | --- | --- |
| Photos and Style Files | Browser and CDN | Large, identical for each user, and rarely changed |
| Popular Search Results | Shared cache, for 30 seconds | Many servers ask the same question, and a short delay is fine |
| Subject List and Feature Flags | Server memory | Tiny, read by most requests, and changed rarely |
| Login Sessions | Not a cache | They are the sole copy, so they belong in a store such as [Key-Value Stores](/system-design/key-value-stores) |
| A Student's Inbox | Nowhere shared | Personal and constantly changing, so a shared copy would be wrong or useless |

The inbox row is as important as the others. A cache is for data that many requests share and that can be a little old. Where neither is true, caching adds cost and risk and solves no problem.

## What Can Go Wrong

A cache brings one warning above the others, called **modal behavior**: a service can become addicted to its cache. Say the database can serve 1,000 queries a second.

At a 90 percent hit ratio it sees 300, which is fine. If the cache restarts, the full 3,000 requests a second fall through at once, the database is overwhelmed, and the outage is far worse than the cache's.

Three habits defend against it:

- **Test without the cache**: confirm the service survives, perhaps by shedding some load, when the cache is empty or gone
- **Expect cold starts**: a new server or a flushed cache sends a burst of misses to the database, and merging duplicate requests for the same item into one helps. See [Cache Stampedes](/system-design/cache-stampedes)
- **Choose expiry on purpose**: staleness, size and eviction are hard to pick once and forget, so measure the hit ratio, the misses and the load that reaches the database. See [Cache Eviction Policies](/system-design/cache-eviction) and [Cache Invalidation](/system-design/cache-invalidation)

When one failing part drags another down, the effect is a cascading failure, covered in [Cascading Failures](/system-design/cascading-failures), and an overloaded database behind a failed cache is a common start.

## Key Points

- A cache keeps copies of reused data, so a high hit ratio cuts both latency and the load that reaches the database
- Copies can live in the browser, a CDN, server memory, a shared cache and the database's own memory, each one more shared and less personal than the one before
- Server memory is simple but differs between servers, and a shared cache is consistent but costs another fleet and a network hop
- <u>Cache data that many requests share and that can be slightly old</u>, and not data that changes constantly or is the sole copy
- Don't let the service depend on the cache: test with it off, plan for cold starts and watch the hit ratio
