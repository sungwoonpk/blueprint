> An **eviction policy** is the rule a full cache uses to decide which entry to throw out when a new one arrives. A good rule keeps the entries that will be asked for again, so the hit ratio stays high.

A cache is smaller than the data behind it, or it wouldn't be worth having. In the textbook app, 3 million listings can't all sit in memory, so the cache holds a few thousand.

Once it is full, each new entry means an old one must go. Which one goes decides how often the next request is a hit, as defined in [Where to Put a Cache](/system-design/where-to-cache).

## Three Ways an Entry Leaves

Entries leave a cache for three different reasons, and it helps to keep them apart.

**Expiry** means the entry's time to live ran out, as in the TTL from [Caching Patterns for Reads and Writes](/system-design/caching-patterns). **Invalidation** means the data changed, and the entry was removed or replaced because it is wrong, as in [Cache Invalidation](/system-design/cache-invalidation). **Eviction** means the cache is full, and a correct entry is removed to make room.

Eviction is the one that has to choose among entries that are still good, so it is the one with a policy. In Redis, the cache is bounded by a `maxmemory` setting.

Redis has a policy named `noeviction` that evicts nothing and answers writes with an error once memory is full, which is usually the wrong choice for a cache.

## The Classic Policies

Each policy answers one question: which entry is the least likely to be needed again?

| Policy | Removes | Weakness |
| --- | --- | --- |
| FIFO | The entry added longest ago | Ignores use, so a popular entry goes just for being old |
| Random | A random entry | Keeps no information, though it works when all entries are equally popular |
| LRU | The entry used least recently | A one time scan pushes out useful entries |
| LFU | The entry used least often | Old popularity lingers after interest moves on |
| Bélády's Optimal | The entry needed farthest in the future | Needs the future, so it is a benchmark only |

**LRU**, least recently used, bets that what was used lately will be used again soon. **LFU**, least frequently used, bets that what has been used often is popular.

Bélády's algorithm is the best possible policy, and nobody can run it: it needs to know future requests. But you can replay a recorded trace to find what it would have achieved, and then see how close a real policy gets.

To see the difference, we ran a small simulation. It has 10,000 listings and 200,000 requests, where popular listings are asked for far more often, with the chance of listing number k proportional to 1/k. The cache holds 500 entries, 5 percent of the listings:

<figure class="chart">
<div class="hbars" role="img" aria-label="Hit ratio of five policies in the simulation, from 54 percent for FIFO to 75 percent for the optimal policy">
<div class="hbar"><span>FIFO</span><span class="track"><span class="fill" style="--w: 54%"></span></span><span class="value">54.0</span></div>
<div class="hbar"><span>Random</span><span class="track"><span class="fill" style="--w: 54%"></span></span><span class="value">54.0</span></div>
<div class="hbar"><span>LRU</span><span class="track"><span class="fill" style="--w: 58.7%"></span></span><span class="value">58.7</span></div>
<div class="hbar"><span>LFU</span><span class="track"><span class="fill" style="--w: 66%"></span></span><span class="value">66.0</span></div>
<div class="hbar peak"><span>Optimal</span><span class="track"><span class="fill" style="--w: 74.6%"></span></span><span class="value">74.6</span></div>
</div>
<figcaption>Hit ratio in percent, from our own simulation (a small cache with skewed requests)</figcaption>
</figure>

Policies that use history beat the ones that don't, and none reaches the optimum. The simulation is simple, and real numbers depend on the workload, but the order is typical for skewed traffic.

## When the Pattern Changes

LFU won that round, so why isn't it the default everywhere? We ran two more cases where the traffic isn't steady:

| Case | LRU | LFU |
| --- | --- | --- |
| Steady Traffic | 58.7 | 66.0 |
| A Crawler Reads 1,000 Old Listings Every 5,000 Requests | 56.8 | 66.3 |
| Popularity Moves to Other Listings Halfway | 58.5 | 19.5 |

The numbers are hit ratios in percent, and for the last row only the second half counts. The crawler is a **scan**, a burst of entries that won't be used again.

It pushes LRU's useful entries out, and LFU barely notices, since the scanned entries have only been used once. The last row is the opposite. Once popularity moves, LFU holds on to listings whose counts were high yesterday, and its hit ratio collapses. LRU adapts within minutes.

So each simple policy has a blind spot, and real caches combine the two ideas.

Segmented LRU keeps new entries in a probationary part and moves them to a protected part only after a second hit, so a scan doesn't reach the protected part. Memcached's optional segmented LRU has hot, warm and cold queues, and evicts just from the cold one.

LFU with aging keeps a small counter for each entry that decays over time, so yesterday's hits fade. Redis does this, with the decay time a setting, one minute by default.

Adaptive policies tune themselves. ARC balances recency and frequency as it runs, and beat LRU on 23 real traces in its own tests. Caffeine, a popular Java cache, uses W-TinyLFU, which admits a new entry only if its estimated frequency beats the one it would replace, and reaches hit rates close to optimal on its test traces.

You rarely implement these yourself. You choose among the policies your cache offers, and that is easier when you know what each is betting on.

## Approximate Is Fine

Exact LRU needs a list in order of use that is updated on every read, which costs memory and time. Redis takes a shortcut: when it needs to evict, it samples a few random keys and removes the one used longest ago.

The setting is `maxmemory-samples`, the page's example is 5, and it says that 10 gets very close to true LRU, for a little more CPU.

```text
maxmemory 100mb
maxmemory-policy allkeys-lru
maxmemory-samples 10
```

The `allkeys` policies choose from all entries, and the `volatile` ones only among entries that have a TTL, behaving like `noeviction` when none do. In short, the choices are these.

Use `allkeys-lru` as the default choice when some entries get most of the requests, and `allkeys-random` when the entries are about equally popular. Use `volatile-ttl` when your code gives short TTLs to the entries that are best to drop. The `volatile-*` policies in general suit one instance that holds both cached and permanent keys, though two separate instances are cleaner.

Telling whether the policy works is simple. The hit ratio is hits divided by hits plus misses. A low hit ratio together with many evicted keys suggests that the cache is evicting the wrong entries or is too small. Few evictions but many expired keys suggests the TTLs are too short.

## Size Matters More Than Policy

Policies move the hit ratio by a few points. The size of the cache moves it much more. Here is LRU in the same simulation, with different sizes:

<figure class="chart">
<div class="hbars" role="img" aria-label="LRU hit ratio rising from 31 percent with 50 entries to 89 percent with 5,000 entries">
<div class="hbar"><span>50 Entries</span><span class="track"><span class="fill" style="--w: 31.1%"></span></span><span class="value">31</span></div>
<div class="hbar"><span>100 Entries</span><span class="track"><span class="fill" style="--w: 39.2%"></span></span><span class="value">39</span></div>
<div class="hbar"><span>250 Entries</span><span class="track"><span class="fill" style="--w: 50.2%"></span></span><span class="value">50</span></div>
<div class="hbar"><span>500 Entries</span><span class="track"><span class="fill" style="--w: 58.7%"></span></span><span class="value">59</span></div>
<div class="hbar"><span>1,000 Entries</span><span class="track"><span class="fill" style="--w: 67.5%"></span></span><span class="value">68</span></div>
<div class="hbar"><span>2,000 Entries</span><span class="track"><span class="fill" style="--w: 76.6%"></span></span><span class="value">77</span></div>
<div class="hbar peak"><span>5,000 Entries</span><span class="track"><span class="fill" style="--w: 88.6%"></span></span><span class="value">89</span></div>
</div>
<figcaption>LRU hit ratio in percent, for 10,000 listings (our own simulation)</figcaption>
</figure>

In this run, each doubling of the cache added roughly 8 to 10 points. That is a steady gain, and it costs memory each time. Where to stop depends on the price of a miss.

If a miss costs the database a heavy query, memory is cheap by comparison. If a miss costs a cheap lookup, a smaller cache is fine.

A habit follows from all this:

1. **Start with LRU**: It is the default of most caches, and good enough for most traffic
2. **Measure the hit ratio**: Watch it with the evictions, as in [Logs, Metrics and Traces](/system-design/observability)
3. **Resize before changing the policy**: A larger cache usually helps more
4. **Change the policy for a reason**: A scan that hurts, or a shift that LRU handles badly, is a reason

## Key Points

- Eviction removes a correct entry because the cache is full, and it differs from expiry, which is about time, and invalidation, which is about changed data
- LRU removes the least recently used entry, and LFU the least often used, and each has a blind spot, scans for LRU and old popularity for LFU
- Real caches combine both ideas, with segmented LRU, aging counters or adaptive policies
- Approximate LRU, as in Redis, is nearly as good as exact LRU and much cheaper
- <u>Cache size moves the hit ratio more than the policy does</u>, so measure, resize and then tune
