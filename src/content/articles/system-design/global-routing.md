> **Global traffic routing** decides which region, or which data center, each user's request goes to. It sends users to a nearby place that works, and moves them away from one that doesn't.

Everything so far in this phase happened inside one place: a load balancer, some servers, one data center. [Load Balancers](/system-design/load-balancers) spread requests across those servers.

This topic is about the layer above, choosing between whole regions. It matters once the textbook app has users far from the servers, or once losing a whole data center is a risk worth planning for.

## Why Route by Place

There are three reasons, and each one connects to something earlier.

Distance is time. From [Numbers Every Engineer Should Know](/system-design/numbers), light needs about 56 ms for a round trip from New York to London at best, and a trip across an ocean costs around 150 ms in practice. A student in Europe talking to servers in Virginia pays that on each round trip.

A region can fail. In [Redundancy and Failover](/system-design/redundancy-failover), the biggest row in the table was the whole data center, and a second region is the spare for that.

And there are rules about data. Some laws and contracts require certain users' data to stay in a certain region, so users have to be sent to the right one.

<figure class="diagram">
<div class="flow">
<div class="stack">
<div class="node">Users in Asia</div>
<div class="node">Users in the US</div>
<div class="node">Users in Europe</div>
</div>
<div class="arrow wide" data-label="routing layer" aria-hidden="true"></div>
<div class="stack">
<div class="node">Region: US East</div>
<div class="node lost">Region: Europe<small>down, skipped</small></div>
<div class="node">Region: Asia</div>
</div>
</div>
<figcaption>Each user goes to a nearby region that works, and a failed region is skipped</figcaption>
</figure>

Two tools do this routing. One answers with different addresses for different users, as in [How DNS Works](/system-design/dns). The other gives all the regions the same address and lets the network's own routing pick.

## Routing With DNS

The idea builds on [How DNS Works](/system-design/dns): the name `app.textbooks.example.com` doesn't have to give all users the same address. A DNS service can look at who is asking, and whether each region is healthy, and answer accordingly. Amazon's Route 53 offers a good menu of the policies you can choose from:

| Policy | Picks By | Useful For |
| --- | --- | --- |
| Weighted | Shares you set | Gradual migrations and canaries |
| Latency | Lowest measured delay | Users spread over several regions |
| Geolocation | The user's country or continent | Localized content and data rules |
| Geoproximity | Where your resources are, with an adjustable bias | Shifting load between regions gradually |
| Failover | Whether the primary is healthy | A standby region |
| Multivalue Answer | Up to eight healthy addresses at random | Simple spreading with health filtering |

Each region gets its own record, tagged with where it is and how to tell if it's healthy. In Route 53's API, a latency record looks like this:

```json
{
  "Name": "app.textbooks.example.com",
  "Type": "A",
  "SetIdentifier": "us-east",
  "Region": "us-east-1",
  "TTL": 60,
  "ResourceRecords": [{ "Value": "203.0.113.10" }],
  "HealthCheckId": "a1b2c3d4-example"
}
```

One record per region shares a name, and the service answers with the best healthy one. The word "best" needs a caveat: Route 53 says latency routing uses delays it has measured between users and AWS regions, which isn't the same as geographic distance, and it changes as networks change.

Its own example is that a user sent to Oregon one week might be sent to Singapore the next.

## Where DNS Routing Falls Short

DNS is easy to use and has built in blind spots.

DNS sees the resolver, not the user. As in [How DNS Works](/system-design/dns), the question comes from a resolver that may be far from the person asking. A fix called EDNS Client Subnet, in RFC 7871, lets the resolver pass along a shortened version of the user's address. It helps, and it has a privacy cost, so it is optional.

Caches slow failover: when a region fails, the old answer stays in caches until the TTL runs out. A TTL of 60 seconds or less suits records with health checks, and some clients ignore TTLs and keep the old address longer. And location is a guess, since an address maps to a place only roughly.

## Routing With Anycast

The second tool avoids the question. With **anycast**, the same IP address is announced from many places at once, and the internet's routing sends each packet toward the nearest announcer. RFC 4786, the standard on operating anycast, is blunt that "nearest" means closest by network topology, which doesn't always mean fastest.

It suits two jobs well. DNS root servers use it, so a lookup is answered close to the user. And it contains attacks: traffic lands on the nodes closest to each attacker and isn't piled on one, so the damage of a denial of service attack stays near where it hits.

Google's global load balancer shows the idea at full scale. It gives each service a single anycast address, and traffic enters Google's private network at the point of presence closest to the user, one of over 200, and then crosses Google's own backbone to the right region.

No DNS tricks are needed, and a failed region only needs the load balancer to stop sending to it.

The catch is long connections. A TCP connection has to stay on one node, and if routes change in the middle, packets of a single connection can reach a different node and break it. That is one reason to end the connection at a nearby edge, which then carries the traffic inward over a stable path.

| | DNS Routing | Anycast |
| --- | --- | --- |
| How the User is Placed | The answer depends on the asker | The network's routing picks the nearest node |
| Failover Speed | As slow as the cache TTL | Fast, when routes are withdrawn |
| Control | Fine, by policy | Coarse, by routing |
| Main Risk | Stale and misplaced answers | Route changes breaking long connections |

## When a Region Fails

Health checks, as in [Health Checks](/system-design/health-checks), are how the routing layer finds out. Route 53 checks an endpoint from many locations at once, with checks every 30 seconds, or every 10 seconds at an extra cost, and treats it as healthy if more than 18% of those checkers say so.

Requiring a share of the checkers keeps a few with bad network paths from declaring a good region dead. If all the records look unhealthy, Route 53 answers with all of them anyway, a fail open safety net like the one in [Health Checks](/system-design/health-checks).

Then comes the part that is easy to forget: the surviving regions need room. In [Redundancy and Failover](/system-design/redundancy-failover), three servers at 70% busy became 105% when one died. Regions work the same way.

Three regions at 60% busy, minus one, leave the other two at 90%, which is already a slow place to be. And users sent to a new region need their data there, the subject of [Serving Users Worldwide](/system-design/global-users).

## When the Routing Layer Breaks

The routing layer is also a dependency of everything behind it, and it fails in its own ways. On October 4, 2021, Meta's services, including Facebook, Instagram and WhatsApp, disappeared from the internet for about five and a half hours. The chain of events went like this:

<figure class="diagram">
<p class="rowname">What Happened Inside</p>
<div class="flow">
<div class="node">Maintenance Command<small>meant to check capacity</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node hot">Backbone Down<small>data centers cut off</small></div>
</div>
<p class="rowname">What the World Saw</p>
<div class="flow">
<div class="node">DNS Servers<small>can't reach data centers</small></div>
<div class="arrow wide" data-label="withdrew routes" aria-hidden="true"></div>
<div class="node hot">Names Unreachable<small>servers still running</small></div>
</div>
<figcaption>A safety rule in the routing layer turned an internal failure into a global one</figcaption>
</figure>

A command run during routine maintenance accidentally took down the connections between Meta's data centers. Its DNS servers were built to withdraw their own routes from the internet when they can't reach the data centers, a health rule meant to steer users away from a broken site.

With all the data centers unreachable, all of them withdrew, and the rest of the internet could no longer find Meta's DNS servers or anything behind them.

Recovery was slow, because the tools engineers would normally use to reach the network were down too, and people had to go to the data centers in person.

The world also kept asking: Cloudflare saw its public DNS resolver handle about 30 times its usual query volume as apps and users retried, the retry storm from [Timeouts, Retries and Backoff](/system-design/timeouts-retries). The lesson is to keep a path to the controls that doesn't run through the thing being controlled.

## Choosing

| If You Need | A Good Fit |
| --- | --- |
| Users near a copy of the app, with simple control | DNS latency routing |
| Data to stay in a region | DNS geolocation routing |
| A gradual move or a canary | Weighted routing |
| One fixed address and fast failover | Anycast, usually through a global load balancer |
| Only static files close to users | A CDN, which is the next topic |

Most small systems should stay in one region and add a CDN first, since a second region doubles what you run and brings the data problems covered in [Serving Users Worldwide](/system-design/global-users). The next topic is [Content Delivery Networks (CDNs)](/system-design/cdn), which uses these same tools to put copies of files close to users.

## Key Points

- Global routing sends each user to a nearby region that works, for speed, resilience and data rules
- DNS routing answers differently by policy: weighted, latency, geolocation, failover and others, and it is held back by resolver location and cache TTLs
- Anycast announces one address from many places and lets the network pick the nearest, which is fast to fail over and risky for long connections when routes change
- Health checks from several places decide when a region is out, and surviving regions need spare capacity to take the load
- <u>The routing layer can fail too</u>: Meta's 2021 outage came from DNS servers withdrawing their own routes, so keep a way to fix things that doesn't depend on the system being fixed
- Stay in one region and use a CDN until a second region is clearly worth its cost
