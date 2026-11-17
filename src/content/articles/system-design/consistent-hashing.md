> **Consistent hashing** is a way to assign keys to servers so that adding or removing a server moves only a small share of the keys, instead of reshuffling almost all of them.

The textbook app's shared cache has grown to 6 cache servers. A key such as `listing:17` has to live on exactly one of them, and all the web servers must agree which, or they will look in the wrong place.

In the memcached world, as its wiki explains, the client does the choosing, using a hash of the key. The simple method is `hash(key) mod 6`. It works well until the day a seventh server is added.

## Why Hash Mod N Breaks

With `mod 6`, a key's server is its hash divided by 6, keeping the remainder. Change 6 to 7 and the remainder changes for most keys. A key stays put only when both remainders happen to match, which is about one key in seven. The rest move.

We checked with 100,000 listing keys: going from 6 servers to 7 sent 85.5 percent of them to a different server. Each of those moved keys is a miss on the new server, and the old copy sits unused.

The memcached wiki gives a similar number for adding an eleventh server: 40 percent or more of the keys. Richard Jones, writing about Last.fm's move to a better scheme, says the old method effectively wiped the entire cache whenever a server was added or removed.

A cache that loses most of its entries when it grows sends all those requests to the database, the stampede from [Cache Stampedes](/system-design/cache-stampedes), at the moment the team is trying to add capacity.

## The Ring

Consistent hashing, introduced by David Karger and his colleagues at MIT in 1997 for web caching, changes what the hash is compared against. Picture the range of hash values as a circle, like a clock face.

Hash each server's name onto the circle. Hash each key onto it as well, and send the key clockwise to the first server it meets, its successor.

<figure class="diagram">
<svg viewBox="0 0 300 230" role="img" aria-label="A circle with servers A, B and C. Keys k1, k2 and k3 each walk clockwise to the next server. A dashed server D joins and takes only the keys between B and D." style="width:100%;max-width:340px;height:auto;display:block;margin:0 auto">
<circle cx="150" cy="115" r="85" fill="none" style="stroke:var(--border)" stroke-width="2"/>
<g fill="none" style="stroke:var(--accent)" stroke-width="3" stroke-linecap="round">
<path d="M223.6 72.5 A85 85 0 0 1 223.6 157.5" opacity="0.55"/>
<path d="M164.8 198.7 A85 85 0 0 1 114.1 192.0" stroke-dasharray="1 6" opacity="0.9"/>
<path d="M164.8 198.7 A85 85 0 0 1 76.4 157.5" opacity="0.55"/>
<path d="M76.4 72.5 A85 85 0 0 1 150 30" opacity="0.55"/>
</g>
<g style="fill:var(--bg);stroke:var(--muted)" stroke-width="1.5">
<circle cx="223.6" cy="72.5" r="5"/>
<circle cx="164.8" cy="198.7" r="5"/>
<circle cx="76.4" cy="72.5" r="5"/>
</g>
<g style="fill:var(--accent)">
<circle cx="150" cy="30" r="12"/>
<circle cx="223.6" cy="157.5" r="12"/>
<circle cx="76.4" cy="157.5" r="12"/>
</g>
<circle cx="114.1" cy="192" r="12" style="fill:var(--bg);stroke:var(--accent)" stroke-width="2" stroke-dasharray="4 3"/>
<g font-size="13" font-weight="700" text-anchor="middle" fill="#fff">
<text x="150" y="35">A</text>
<text x="223.6" y="162.5">B</text>
<text x="76.4" y="162.5">C</text>
</g>
<text x="114.1" y="197" font-size="13" font-weight="700" text-anchor="middle" style="fill:var(--accent)">D</text>
<g font-size="12" text-anchor="middle" style="fill:var(--muted)">
<text x="240" y="68">k1</text>
<text x="176" y="216">k2</text>
<text x="60" y="68">k3</text>
</g>
</svg>
<figcaption>Keys walk clockwise to the next server, and a new server D takes only the keys just before it</figcaption>
</figure>

In the picture, k1 belongs to B, k2 to C and k3 to A. Now add server D between B and C. The only keys affected are those that sat between B and D, like k2, which now walk to D instead of C. All other keys still walk to the same server as before.

When a server leaves, its keys move on to its successor and nothing else changes.

Adding a server moves about K divided by N keys, where K is the number of keys and N the number of servers. In our simulation, with a ring of 6 servers going to 7, 13.6 percent moved. That is close to the best possible, 1 in 7, or 14.3 percent.

<figure class="chart">
<div class="hbars" role="img" aria-label="Share of keys that move when a seventh server joins: 85.5 percent for hash mod N, 13.6 percent for a hash ring, and 14.3 percent as the smallest possible share">
<div class="hbar peak"><span>Hash Mod N</span><span class="track"><span class="fill" style="--w: 85.5%"></span></span><span class="value">85.5</span></div>
<div class="hbar"><span>Hash Ring</span><span class="track"><span class="fill" style="--w: 13.6%"></span></span><span class="value">13.6</span></div>
<div class="hbar"><span>Fair Share, 1 in 7</span><span class="track"><span class="fill" style="--w: 14.3%"></span></span><span class="value">14.3</span></div>
</div>
<figcaption>Percent of 100,000 keys that move when a seventh server joins six (our own simulation)</figcaption>
</figure>

## Virtual Nodes

A plain ring has a flaw. A server's position is random, so some servers get long stretches of the circle and others get short ones. Dynamo's designers hit exactly this: random placement leads to uneven data and load, and the basic algorithm ignores that machines differ in power.

In our run with one point per server, the busiest of the 6 servers held 3.3 times the average load, and the quietest held 3 percent of it.

The fix, used by Dynamo and by Cassandra, is to give each server many points on the circle. Dynamo calls each position a token, and the points are known as **virtual nodes**. A server owns lots of small slices spread around the ring, so the slices average out:

| Points per Server | Busiest Server | Quietest Server |
| --- | --- | --- |
| 1 | 3.28 times the average | 0.03 times |
| 10 | 1.26 times | 0.58 times |
| 100 | 1.20 times | 0.88 times |
| 200 | 1.07 times | 0.86 times |

The numbers are from our simulation with 6 servers and 100,000 keys, and will differ on another run, but the trend holds. Libketama, a hashing library for memcached clients, uses somewhere between 100 and 200 points per server.

Virtual nodes help in two more ways. A server that leaves has its slices scattered around the ring, so its load spreads over several neighbors instead of doubling one: in our run, a lost server's keys went to all five others.

And the number of points can follow the server's size, so a machine with twice the memory takes twice as many points, which is how Dynamo handles servers of different power.

They also cost something. In Cassandra each extra token adds neighbors, which raises the probability of an outage, and that repair work grows with the number of tokens.

## Replicas and Beyond

Databases that use the ring for storage, such as Cassandra and Dynamo, also use it to place copies. Cassandra stores each partition on the next few distinct servers clockwise from its position, skipping virtual nodes that belong to a server already chosen. That is the idea behind the replicas in [Leaderless Replication and Quorums](/system-design/leaderless-replication).

The basic ring has relatives:

- **Bounded loads**: Plain consistent hashing can balance badly, and Google researchers proposed a fix in 2017. It gives each server a capacity of the average load times 1 plus a small number, and a key moves clockwise to the first server with room. Vimeo used it in haproxy and cut its cache bandwidth by a factor of almost 8
- **Rendezvous hashing**: Each server gets a score for the key, and the highest score wins. It needs no ring, and when a server joins or leaves it moves only the keys that belong to that server. It was published in 1996, a year before consistent hashing
- **Jump consistent hash**: A very small and fast algorithm from Google, published in 2014, for the case where servers are numbered in order

The same idea places data in Dynamo and Cassandra. DynamoDB's partition key, from [Key-Value Stores](/system-design/key-value-stores), is hashed to pick a partition in the same spirit.

## Using It

A ring is small enough to write by hand. This is the lookup, in Python:

```python
import bisect, hashlib

def h(text):
    return int(hashlib.md5(text.encode()).hexdigest()[:8], 16)

class Ring:
    def __init__(self, servers, points=100):
        self.ring = sorted(
            (h(f"{s}#{i}"), s) for s in servers for i in range(points))
        self.hashes = [p for p, _ in self.ring]

    def server_for(self, key):
        i = bisect.bisect_right(self.hashes, h(key))
        return self.ring[i % len(self.ring)][1]
```

Each server is hashed at 100 points, and a key goes to the first point larger than its own hash, wrapping around at the end. The binary search makes a lookup cost O(log N),.

Two warnings from the memcached wiki apply to any client side scheme. All clients must see the same server list, in the same order, or two web servers will disagree about where a key lives.

And moving about a seventh of the keys is much better than moving 86 percent, but it is not free: those keys are misses, so add servers when traffic is low, and see [Cache Stampedes](/system-design/cache-stampedes) for what to do when many misses arrive together.

How a full cluster of cache servers is run on top of the ring is the subject of [Distributed Caches](/system-design/distributed-caches), and how databases use it is in [Sharding Strategies](/system-design/sharding).

## Key Points

- Hash mod N reassigns most keys when the server count changes, 85.5 percent in our simulation, which empties most of a cache
- A hash ring puts servers and keys on a circle, and each key goes clockwise to the next server, so a change moves only about 1 in N keys
- A plain ring is uneven, so <u>virtual nodes give each server many points</u>, which evens the load and spreads a lost server's keys
- Real systems add replicas on the next distinct servers, weights for bigger machines, and variations such as bounded loads and rendezvous hashing
- All clients must use the same server list, and the keys that do move are still misses
