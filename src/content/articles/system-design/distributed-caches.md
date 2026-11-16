> A **distributed cache** spreads cached data over several servers, so the cache can hold more than one machine's memory, answer more requests than one machine can, and keep working when a server fails.

One cache server is where most teams start. It holds a few gigabytes, answers in a fraction of a millisecond, and the textbook app is happy with it. Then the app grows.

The data no longer fits in memory, or the server's network card is busy, or someone restarts it and the whole cache disappears at once. This topic is about what changes when the cache becomes a group of servers.

## Who Decides Where a Key Lives

[Consistent Hashing](/system-design/consistent-hashing) showed how to map a key to a server. A second question comes first: which part of the system does the mapping? There are three common answers.

- **The client**: Each web server holds the list of cache servers and does the hashing itself. The memcached wiki describes this as how memcached works, which also means all clients have to be given the same server list in the same order, or two clients will disagree about where a key lives
- **A proxy**: The clients talk to a router, and the router knows the servers. Facebook's paper on scaling Memcache describes clients sending their sets and deletes through a router called mcrouter, running on the same machine as the web server. A proxy keeps the mapping in one place and can batch requests
- **The servers themselves**: The cache servers know the map and tell the client when it picked wrong. Redis Cluster does this

Redis Cluster's design is worth a look, since it avoids a ring. Its documentation says the key space is divided into 16,384 **hash slots**, and a key's slot is `CRC16(key) mod 16384`.

Each server owns a range of slots. The docs' example splits them three ways, and here are some of our keys, with slots we computed using that formula:

| Server | Slots | Example Keys |
| --- | --- | --- |
| A | 0 to 5500 | `listing:17` in slot 4171, `search:calculus` in slot 4661 |
| B | 5501 to 11000 | `listing:18` in slot 8612 |
| C | 11001 to 16383 | `session:9f3a` in slot 11506, `{user:8}.cart` in slot 15155 |

Slots add a level between keys and servers. A key doesn't move by itself. A whole slot moves, and Redis's documentation says moving slots between servers needs no downtime, with the keys in a slot migrating along with it. Adding a server therefore doesn't leave a share of the cache lost, as a ring would.

A client that asks the wrong server gets an error such as `-MOVED 3999 127.0.0.1:6381`, which names the right one. Clients keep a copy of the slot map and refresh it when they see this error. During a move, an `ASK` reply sends the client to the new owner for that one request.

One rule follows from the design. A command that involves several keys works only if all the keys are in the same slot.

A **hash tag** lets you choose: when a key contains `{...}`, only the part inside the braces is hashed, so `{user:8}.cart` and `{user:8}.sessions` share a slot. We use this to keep all of one student's data together.

## When a Server Fails

A failure means the cache loses a share of its data, and what happens next depends on the system.

In plain memcached, the keys on the failed server are simply gone. The app sees misses, loads from the database and refills a different server or the replacement. That works until the misses arrive together, which is the stampede from [Cache Stampedes](/system-design/cache-stampedes).

Redis Cluster adds replicas. Each master can have copies on other servers, and when a master is unreachable for longer than `cluster-node-timeout`, a replica is promoted. The documentation recommends six servers to start with, three masters and three replicas.

It also states a limit that matters: replication is asynchronous, so a master can confirm a write and fail before its replicas get it, and that write is lost. For a cache that is usually fine, since the data can be reloaded.

Facebook's paper adds a technique for the minutes before repair finishes, called **Gutter**: a small pool of spare servers, about 1 percent of the cluster.

When a client gets no answer from its server, it asks a Gutter server instead, and on a miss there it reads the database and stores the result in Gutter with a short expiry.

<figure class="diagram">
<p class="rowname">Normal</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Cache Server</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Hit</div>
</div>
<p class="rowname">Server Down</p>
<div class="flow">
<div class="node">Client</div>
<div class="arrow" data-label="no answer" aria-hidden="true"></div>
<div class="node lost">Cache Server</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Gutter</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Database</div>
</div>
<figcaption>Gutter takes the misses of a failed server, so the database sees fewer of them</figcaption>
</figure>

The paper compares this with the obvious alternative, where clients rehash the keys of the dead server onto the survivors. It warns that this can cascade: one key can account for 20 percent of a server's requests, so the server that inherits a hot key may be overwhelmed in turn.

Sending the load to idle spare servers avoids that. Facebook reports that Gutter reduced client-visible failures by 99 percent, and that it turned 10 to 25 percent of failures into hits each day. The price is that its entries can be slightly stale.

## One Hot Key

Spreading keys over servers balances many keys. It doesn't help one very popular key, since a key lives on one server. The textbook app's "calculus" search page, asked for 600 times a second, sits on one cache server however many are added.

The answer is to replicate the entry. Facebook's paper describes replicating a category of keys within a pool when three conditions hold: requests fetch many keys at once, the whole data set fits in one or two servers, and the request rate is far above what one server can take.

Its example has a server holding 100 items that can answer 500,000 requests a second, with each request asking for all 100 keys.

Splitting the keys over two servers turns each request into two, so both servers still handle 1 million requests a second. Copying all 100 items to both servers lets a request go to either, so each handles 500,000.

For a single hot entry, a simple version is to store it under several names, such as `search:calculus#1` to `#4`, and read a random one. The cost, which the paper notes too, is that an invalidation must reach every copy.

## Growing and Warming Up

Adding capacity has a price in misses. With a ring, a seventh server takes about a seventh of the keys, and those are empty on arrival. With Redis slots, the keys move with their slots, so a resize doesn't lose them.

Facebook's paper describes an empty cluster as a standing risk, and its answer is **cold cluster warmup**: clients in the empty cluster fetch from a warm cluster's caches instead of the database, until their own hit rate settles.

The paper says this brings a cold cluster to full capacity in a few hours, where it used to take a few days.

It adds a guard against a race, in which a stale value copied from the warm cluster would stay forever: deletes sent to the cold cluster carry a hold-off of 2 seconds, during which attempts to add the key are rejected.

A page that needs hundreds of keys also fans out across many cache servers, and the answers can arrive at the same moment.

The paper calls the resulting jam in the network incast congestion, and its clients limit how many requests are in flight at once, much as TCP slows when it senses congestion. Adding servers can worsen it, which is one reason the paper splits big deployments into several smaller clusters.

## Choosing

The same question from [Where to Put a Cache](/system-design/where-to-cache) applies: what does the cache need to do that one server can't?

| Limit | What Helps |
| --- | --- |
| The data doesn't fit in memory | More servers, with slots or a ring |
| One server can't answer fast enough | More servers, or replicas that serve reads |
| One entry is far hotter than the rest | Copies of that entry |
| A failure empties part of the cache | Replicas, spare servers like Gutter, and protection from stampedes |
| A new server arrives empty | Moving slots, or warming from another cache |

Start with one server and a replica, and distribute when a measured limit appears. [Redis and Memcached](/system-design/redis-memcached) compares the two systems used in this topic.

## Key Points

- A distributed cache adds memory, throughput and fault tolerance, and the first design choice is who maps keys to servers: the client, a proxy or the servers themselves
- Redis Cluster divides keys into 16,384 slots and moves slots, not keys, when servers change, and keys that must be used together can share a slot with a hash tag
- A failed server loses its keys, replicas can take over, and a spare pool such as Gutter protects the database while repair happens
- <u>Adding servers doesn't help one hot key</u>, which needs copies
- Growing and failing caches cause misses, so plan for stampedes, and warm new nodes from existing ones
