> A **content delivery network** (CDN) is a network of caching servers spread around the world. It keeps copies of your content close to users, so most requests don't travel to your own servers.

Photos were the heaviest part of the textbook app in [Estimating Capacity](/system-design/estimation): about 5 Gbit a second at peak, nearly all of it images. A CDN is the answer that estimate pointed to. It is the [reverse proxy](/system-design/proxies) idea spread over hundreds of locations, using the routing tools from [Global Traffic Routing](/system-design/global-routing) to find the nearest one, and the caching headers from [How HTTP Works](/system-design/http) as its rules.

## What a CDN Does

A CDN has many servers near users, called **edge** servers or points of presence (POPs). When a student's phone asks for a photo, the request goes to a nearby edge, found with DNS or anycast. Two things can happen there:

<figure class="diagram">
<p class="rowname">Cache Hit</p>
<div class="flow">
<div class="node">Phone</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Nearby Edge<small>has the photo, replies at once</small></div>
</div>
<p class="rowname">Cache Miss</p>
<div class="flow">
<div class="node">Phone</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Nearby Edge<small>doesn't have it</small></div>
<div class="arrow wide" data-label="fetches once" aria-hidden="true"></div>
<div class="node">Our Server<small>the origin</small></div>
</div>
<figcaption>The first request for a file goes to the origin, and the edge keeps a copy for the next ones</figcaption>
</figure>

The server behind the CDN is called the **origin**. A file that the edge already holds is a hit, and one it must fetch is a miss. A miss costs a little more than a hit, and after it everyone nearby gets hits.

## Why It is Faster

Think back to the connection costs in [TCP and UDP](/system-design/tcp-udp): a new HTTPS connection needs three round trips before the first byte of a photo arrives. Now compare a student far from our servers with one near an edge. Say the round trip to our origin is 150 ms, as for a trip across an ocean in [Numbers Every Engineer Should Know](/system-design/numbers), and 20 ms to the edge:

<figure class="chart">
<div class="hbars">
<div class="hbar peak"><span>Straight to Our Server</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">450</span></div>
<div class="hbar"><span>Edge Miss<br><small>edge fetches from origin</small></span><span class="track"><span class="fill" style="--w: 46.7%"></span></span><span class="value">210</span></div>
<div class="hbar"><span>Edge Hit</span><span class="track"><span class="fill" style="--w: 13.3%"></span></span><span class="value">60</span></div>
</div>
<figcaption>Milliseconds until the photo arrives, in an example with 150 ms to the origin and 20 ms to the edge (an edge that keeps its connection to the origin open)</figcaption>
</figure>

The hit pays the three round trips at 20 ms each. The miss pays them too, plus one trip from the edge to the origin, since edges keep connections to the origin open and reuse them. A direct connection pays all three round trips at 150 ms.

Speed is one benefit. A CDN also offers:

- **Less load on the origin**: the edge answers most requests itself
- **Spike absorption**: registration day's traffic lands on thousands of edge servers, not on our six
- **Protection**: attack traffic is spread across the edge, as in [DDoS Protection](/system-design/ddos)
- **Closer encryption**: the TLS handshake happens with the nearby edge, so those round trips are short

## How Much the Hit Ratio Matters

The share of requests answered from the edge is the **cache hit ratio**, and it sets how much work remains for the origin. With the 3,000 requests a second at peak from [Estimating Capacity](/system-design/estimation):

<figure class="chart">
<div class="hbars">
<div class="hbar peak"><span>50% Hit Ratio</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">1,500</span></div>
<div class="hbar"><span>90% Hit Ratio</span><span class="track"><span class="fill" style="--w: 20%"></span></span><span class="value">300</span></div>
<div class="hbar"><span>95% Hit Ratio</span><span class="track"><span class="fill" style="--w: 10%"></span></span><span class="value">150</span></div>
<div class="hbar"><span>99% Hit Ratio</span><span class="track"><span class="fill" style="--w: 2%"></span></span><span class="value">30</span></div>
</div>
<figcaption>Requests per second reaching the origin when 3,000 a second arrive at the CDN (example numbers)</figcaption>
</figure>

Going from 90% to 99% cuts the origin's load by ten times. That is why so much CDN work is about raising the hit ratio, and the first rule is to cache what is cacheable.

## What Belongs on a CDN

| Content | Cache It? | How |
| --- | --- | --- |
| Listing Photos | Yes, for a long time | A new file name whenever the photo changes |
| CSS and JavaScript | Yes, for a long time | File names that include a fingerprint of the content |
| HTML Pages | Briefly, or check each time | Short lifetime, or revalidate with an ETag |
| Public API Reads, Such as Search | Briefly | A lifetime of a few seconds, as in [Thinking in Tradeoffs](/system-design/trade-offs) |
| Pages With a User's Own Data | No | Mark them private |
| POST and Other Writes | Not cached | Pass straight to the origin |

Dynamic requests still go through the CDN, and they are not wasted. The edge ends the TLS connection near the user and keeps warm connections to the origin, which makes even uncacheable requests a little faster. In CloudFront's case, writes such as POST and PUT go straight from the edge to the origin without being cached.

## Telling the CDN What to Do

The CDN follows the `Cache-Control` rules from [How HTTP Works](/system-design/http), and one directive exists for it in particular. A CDN is a **shared cache**, one that many users share, and `s-maxage` is a lifetime that applies only to shared caches, overriding `max-age` there. Here is how three kinds of response might be marked:

```http
Cache-Control: public, max-age=31536000, immutable
Cache-Control: public, max-age=60, s-maxage=300
Cache-Control: private
```

- **The first** suits a photo or script with a fingerprint in its name. It can be reused for a year, and `immutable` tells caches it won't change
- **The second** suits a listing page: browsers keep it for a minute and the CDN for five
- **The third** keeps a personalized page out of shared caches

Getting the third one wrong is a real danger. If a page with someone's data is cached as if it were public, the CDN can show it to the next visitor. The usual guidance, in MDN's caching guide, is to mark such responses `private` and not to rely on tricks such as varying the cache on cookies.

The cache key matters too. The CDN stores a copy per key, which by default is the URL, extended by any headers named in `Vary`. So `?utm_source=ad` on a link makes a separate copy unless the CDN is told to ignore that parameter, and `Vary: User-Agent` can split one page into hundreds of copies.

When debugging, look at the `Age` header. It says how many seconds ago the origin produced the copy, so a response with `Age: 142` was fetched from the origin about two minutes ago. Each CDN also adds its own status header, with different names, saying hit or miss.

## Changing a File

Caches are good at keeping copies, and that is a problem when a copy goes out of date. A student replaces their listing photo. There are three ways to get the new one to users:

1. **Wait**: the old copy expires when its lifetime ends
2. **Purge**: ask the CDN to delete the copy. CloudFront calls it an invalidation, and most CDNs have an API for it, though the HTTP standard doesn't define one
3. **Use a new name**: store the new photo as a new file, so it is a new key and the old copy is never asked for

```text
/photos/17/cover.3f9a1c.jpg    the old photo
/photos/17/cover.b2d704.jpg    the new photo, a different URL
```

The third is the best default. CloudFront's own guidance recommends versioned file names over invalidation, because they also control what browsers and other caches serve, make rollbacks easy, and avoid the need for invalidations.

One more reason is that no `Cache-Control` directive can remove a copy that is already sitting in a cache somewhere. Purging is for emergencies, such as a photo that must come down at once. The full story of keeping copies fresh is in [Cache Invalidation](/system-design/cache-invalidation).

## Layers Behind the Edge

With hundreds of edges, a popular file expires in all of them around the same time, and each one asks the origin. CDNs add a layer to stop that. In CloudFront, a regional edge cache sits between the edges and the origin, and an optional Origin Shield sits in front of the origin. Fastly calls its version shielding and Cloudflare calls it tiered cache, and the shape is the same:

<figure class="diagram">
<div class="flow">
<div class="stack">
<div class="node">Edge in Seoul</div>
<div class="node">Edge in Tokyo</div>
<div class="node">Edge in Sydney</div>
</div>
<div class="arrow" data-label="misses" aria-hidden="true"></div>
<div class="node">Shield<small>near the origin</small></div>
<div class="arrow" data-label="1 fetch" aria-hidden="true"></div>
<div class="node">Origin</div>
</div>
<figcaption>Many edges ask one shield, and only the shield asks the origin</figcaption>
</figure>

Another trick is **request collapsing**. If 500 requests for the same uncached file arrive in the same second, the cache sends only one to the origin and holds the others until it answers. CloudFront says Origin Shield can bring the origin down to as few as one request per object, and Fastly describes the same waiting list. It is the defense against the stampede in [Cache Stampedes](/system-design/cache-stampedes).

## Netflix: Moving the Edge Into the ISP

Netflix's Open Connect shows how far the idea goes. Netflix places its own servers, called appliances, inside internet providers' networks and at internet exchange points, and provides them to qualifying providers for free. Its site says it works with over 1,000 providers. A viewer's stream can then come from a server inside their own provider's network, without crossing the wider internet.

Netflix doesn't wait for a first miss, either.

The appliances are filled with the titles likely to be watched in their area ahead of time, with fills sent in off hours. This is a **push** style: you place the copies in advance, and it works because what people will watch is fairly predictable. Most CDNs use a **pull** style, where the edge fetches a file the first time someone asks, which is simpler and needs no prediction.

## Using One

A managed CDN, such as CloudFront, Cloudflare, Fastly, Akamai or Google Cloud CDN, is usually the right choice, since building thousands of edge servers isn't. A sensible order is:

1. Put static files on it first, with fingerprinted names and long lifetimes
2. Measure the hit ratio, and fix whatever keeps it low, such as cookies in the cache key
3. Then cache what public API reads you can, for short lifetimes
4. Add a shield if the origin still sees too many misses

The next topics turn from how requests reach the servers to how the servers themselves are organized, beginning with [When to Split into Microservices](/system-design/monoliths-microservices).

## Key Points

- A CDN keeps copies of content on edge servers near users, so hits are answered quickly and the origin sees only misses
- The hit ratio decides the origin's load: at 3,000 requests a second, 99% hits leave about 30 for the origin
- Cache static files for a long time under versioned names, pages that change often for a short time, and personalized pages not at all, using `private`
- `s-maxage` sets the CDN's lifetime separately from the browser's, and the cache key is the URL plus the `Vary` headers
- <u>Prefer a new file name over a purge</u>, because no header can remove a copy that is already cached
- Shields and request collapsing spare the origin from many edges asking at once, and Netflix pushes copies into providers' networks ahead of demand
