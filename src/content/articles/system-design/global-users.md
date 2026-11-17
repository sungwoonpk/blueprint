> **Serving users worldwide** is the problem of giving people far from your servers a fast and reliable service. Distance sets a floor on latency that no code removes, so the answer is to move something closer: the content, the computation, or the data. Each move brings consistency and compliance questions that a single region didn't have.

The textbook app started on campus, with its servers in Seoul. Now partner universities in Frankfurt, San Francisco and São Paulo want it for their exchange students. The code is the same, the servers are fast, and the students in São Paulo say the app is slow.

They are right, and no tuning on the servers would help. The cause is geography. This topic starts from the physics and works outward, since the physics tells which fixes can work.

## The Floor Set by Physics

Light travels at 299,792 kilometers a second in a vacuum, and the glass of an optical fiber slows it by its refractive index, roughly 1.5, to about 200,000 kilometers a second. That is 5 milliseconds for each 1,000 kilometers one way, and 10 for a round trip.

We computed the great circle distances between the cities and the round trip floor, and added a column for a route 1.5 times longer than the straight line, which is our assumption, since real cables don't follow great circles and equipment adds delay:

| From Seoul to | Distance | Round Trip Floor | With a Longer Route |
| --- | --- | --- | --- |
| Tokyo | 1,153 km | 12 ms | 17 ms |
| Singapore | 4,673 km | 47 ms | 70 ms |
| San Francisco | 9,029 km | 90 ms | 135 ms |
| Frankfurt | 8,550 km | 85 ms | 128 ms |
| São Paulo | 18,342 km | 183 ms | 275 ms |

Between Frankfurt and São Paulo the floor is 98 ms, and with the longer route about 147 ms. These are minimums. An engineer can make the servers faster, and no change in the code alters the speed of light.

## Round Trips Multiply

A single round trip of 128 ms is tolerable. A page isn't a single round trip. A new connection needs a TCP handshake and a TLS handshake, and TLS 1.3 needs one round trip for its full handshake.

Then the page makes requests, and some of them depend on the answer to the one before: the page, then the data it names, then the data that data names.

We counted a page that needs 6 dependent round trips after a new connection, for users in different cities with the origin in Seoul. For the edge column, we assumed a nearby edge location with a 15 ms round trip, five of the round trips answered from the edge, and one dynamic request crossing to the origin:

| User In | Round Trip | Direct | Via Edge |
| --- | --- | --- | --- |
| Frankfurt | 128 ms | 1,026 ms | 248 ms |
| San Francisco | 135 ms | 1,083 ms | 255 ms |
| São Paulo | 275 ms | 2,201 ms | 395 ms |

The columns are the round trip to Seoul, the page time going straight to the origin, and the page time through an edge.

<figure class="chart">
<div class="hbars" role="img" aria-label="Page time in milliseconds for two cities, direct and through an edge">
<div class="hbar peak"><span>São Paulo, Direct</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">2,201 ms</span></div>
<div class="hbar"><span>São Paulo, Edge</span><span class="track"><span class="fill" style="--w: 17.9%"></span></span><span class="value">395 ms</span></div>
<div class="hbar"><span>Frankfurt, Direct</span><span class="track"><span class="fill" style="--w: 46.6%"></span></span><span class="value">1,026 ms</span></div>
<div class="hbar"><span>Frankfurt, Edge</span><span class="track"><span class="fill" style="--w: 11.3%"></span></span><span class="value">248 ms</span></div>
</div>
<figcaption>Page time for 6 dependent round trips after a new connection, origin in Seoul, from our arithmetic</figcaption>
</figure>

The student in São Paulo waits over 2 seconds before the page is done, and the cause is eight round trips at 275 ms each. Users in Seoul or Tokyo, who are near the origin, gain no speed from an edge.

The lesson is that the number of round trips matters as much as the distance: fewer dependent requests, connection reuse and a nearby termination point each multiply the saving.

## Move the Content

The cheapest move is to bring the static parts close. [Content Delivery Networks (CDNs)](/system-design/cdn) hold copies of photos, scripts and pages at locations near users, and [Global Traffic Routing](/system-design/global-routing) sends each user to a good one.

A user connects to the nearby location, which terminates the connection and keeps a warm connection to the origin. Our table shows the effect: the handshakes and the cached requests happen over a short distance, and one dynamic request crosses the ocean.

The limit is what can be cached. Listing pages, search results and photos can be shared between users. A student's own inbox can't, so it has to come from where the data lives. The next two moves address that.

<figure class="diagram">
<div class="flow">
<div class="node">Student</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Edge<small>static content</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Nearby Origin<small>computation</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Home Region<small>data</small></div>
</div>
<figcaption>The three moves, from the user toward the data</figcaption>
</figure>

## Move the Computation

If each request must go to the origin, run an origin near each group of users. One version of this is the geode pattern: a set of geographic nodes, each able to serve any request from any client in any region.

It brings the compute to the data. A global routing service with health checks sends the user to a geode, and each geode reads and writes a data store replicated across regions.

The pattern has conditions. The data is replicated asynchronously, so different geodes may see different versions of an item while replication is in progress.

Read your writes needs help: a session token returned to the client and sent with later reads lets a user's writes follow them from one geode to another. Concurrent writes in two regions need a conflict policy, as in [Detecting and Resolving Conflicts](/system-design/conflicts).

The surviving geodes must absorb the load when one fails, the capacity arithmetic of [Surviving a Region Outage](/system-design/region-outage). And the pattern doesn't suit data tied to a place, such as data or users restricted to particular deployments under residency rules, which belong in deployment stamps.

Compare adding geodes with adding capacity to each geode, and if one region is enough, don't use the pattern.

## Move the Data

The hard part is where the writes happen. The managed databases show the options:

| Design | Where Writes Go | Example |
| --- | --- | --- |
| One Primary, Read Copies Elsewhere | To the primary region | Aurora Global Database, lag typically under a second |
| Write Forwarding | From a secondary to the primary | Aurora, changed first on the primary |
| Multi Active | To any region | DynamoDB global tables |
| Strong Across Regions | To a majority of regions | DynamoDB strong mode, CockroachDB |

In each design, reads are served locally, and they run a little behind except in the strong designs.

With one primary, the distance is paid by writes from far away. On a planned switch, Aurora reports a recovery point of zero and, on qualifying versions, read and write recovery typically under 30 seconds. An unplanned failover has a non zero recovery point measured in seconds and takes a few minutes to promote.

With multi active, each region commits locally and the copies converge afterward. DynamoDB's default is eventual consistency between regions with last writer wins for conflicting writes, plus a strongly consistent mode that can't be mixed in the same table.

It offers 99.999 percent availability for global tables, and the replication latency depends on the distance between regions and has no promised figure.

With strong consistency across regions, a commit has to reach a majority of regions before it is acknowledged, and the cost follows from the table of distances.

We computed that cost for three regions, Seoul, Tokyo and Frankfurt, with the leader in Seoul and a majority of 2:

| Case | Commit Latency |
| --- | --- |
| A Seoul User, Leader in Seoul | About 17 ms, the wait for Tokyo |
| A Frankfurt User, Writing Through the Leader | About 146 ms: 128 to Seoul plus 17 to Tokyo |
| A Frankfurt User, With a Frankfurt Primary and Asynchronous Copies | About 8 ms |

The figures are our arithmetic from the route estimates. Strong consistency across the world keeps the data identical and makes some writers pay for the distance, while a regional primary with asynchronous copies is fast and can lose the last moments on a regional failure.

[The CAP Theorem](/system-design/cap) and [PACELC](/system-design/pacelc) are this trade in general form, and [Replication with Multiple Leaders](/system-design/replication-many-leaders) covers the multi active case.

A common compromise is to give each user a home region for their own data: a student's inbox and orders live in the region nearest them, and shared data such as the listing catalog is replicated everywhere.

The home region is stored with the user, requests are routed to it, and a user who travels keeps working, slower, against the home region. This is the idea of deployment stamps, independent copies of the application components, each serving a subset of tenants.

## Rules About Where Data May Live

A global design has to respect where data is allowed to be.

The GDPR is the best known example. Its rules for transfers allow personal data to go to a third country when conditions are met, and the level of protection must not be undermined, including for onward transfers.

A country can be judged to ensure an adequate level of protection, and then such a transfer needs no specific authorization, with a review at intervals of at most four years. Without that decision, appropriate safeguards are needed, including standard data protection clauses with enforceable data subject rights and effective legal remedies.

The rules don't say that data must stay inside the Union. They say a transfer needs a basis.

For the design, that suggests the stamp idea again: keep personal data in the home region by default, replicate the non personal data freely, hold keys per region, and record the legal basis for each flow that crosses a border.

This is an engineering overview, not legal advice, and the details need a lawyer. [Data Privacy and Compliance](/system-design/privacy) has more.

## A Plan for the Textbook App

| Layer | Decision |
| --- | --- |
| Static Content | CDN for photos, scripts and listing pages, with a 30 second cache for hot pages |
| Connections | Terminate TLS at the edge, keep warm connections to the origin |
| Dynamic Requests | Cut dependent round trips: one API call for the page, not four |
| Regions | Add Frankfurt and a US region, each a full stack |
| User Data | Home region for each student's account, inbox and orders |
| Catalog | Replicated to the whole set of regions, asynchronous, with a lag alert |
| Routing | Health checked global routing, with a rule for moving a region's traffic |
| Compliance | Personal data stays in its home region, with the legal basis documented |

## Pitfalls

- **Tuning servers for a distance problem**: The floor is physics
- **Counting one round trip**: A page makes many, and each pays the distance
- **A CDN for personal data**: The inbox can't be cached in a shared place
- **Strong consistency everywhere**: The farthest writer pays the full distance
- **Multi active without a conflict plan**: Last writer wins can drop a student's edit
- **One catalog, many regions, no lag alert**: Users in one region see old prices
- **Ignoring residency until launch**: Moving data after the fact is a migration

## Key Points

- Distance sets a floor: about 10 ms of round trip for each 1,000 km of fibre, and in our estimate 275 ms from Seoul to São Paulo with a realistic route
- Round trips multiply the distance: a page of 8 round trips took 2.2 seconds from São Paulo straight to Seoul, and 395 ms through a nearby edge
- Move the content with a CDN, the computation with regional stacks, and the data with a home region, a regional primary with asynchronous copies, or a multi region database
- <u>Choose consistency by who pays the distance</u>: a commit that needs a majority across regions cost a Frankfurt user about 146 ms in our arithmetic, against 8 ms with a local primary
- Plan for residency early: keep personal data in its home region, replicate the rest, and record the basis for each transfer that crosses a border
