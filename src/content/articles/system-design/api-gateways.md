> An **API gateway** is the single front door that clients use to reach a set of backend services. It routes each request to the right service, and handles shared work, such as login checks and rate limits, so the services don't each repeat it.

After [When to Split into Microservices](/system-design/monoliths-microservices), the textbook app is four services: listings, search, messages and payments. A [Forward and Reverse Proxy Servers](/system-design/proxies) can already put one address in front of them. An API gateway is that idea with more built in, aimed at APIs, and it uses [Service Discovery](/system-design/service-discovery) to find whichever instances are alive.

## Without a Gateway

Suppose the phone app talks to each service directly. Here is what goes wrong:

- **Clients learn the internals**: the app must know which service owns what, so splitting or merging services breaks every installed copy
- **Many round trips**: a screen that needs data from three services makes three calls, and on a cellular connection each one is slow, as in [The Life of a Request](/system-design/life-of-a-request)
- **Repeated work**: each service needs its own TLS setup, login check and rate limiting
- **A wider attack surface**: each service is exposed to the internet

<figure class="diagram">
<p class="rowname">Without a Gateway</p>
<div class="flow">
<div class="node">Phone App<small>knows each service</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Listings</div>
<div class="node">Search</div>
<div class="node">Messages</div>
<div class="node">Payments</div>
</div>
</div>
<p class="rowname">With a Gateway</p>
<div class="flow">
<div class="node">Phone App<small>knows one address</small></div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">API Gateway</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Listings</div>
<div class="node">Search</div>
<div class="node">Messages</div>
<div class="node">Payments</div>
</div>
</div>
<figcaption>The gateway is the one place clients need to know about</figcaption>
</figure>

## Three Jobs

A gateway does three jobs, and they are a useful way to organize the idea:

| Job | What It Does | In the Textbook App |
| --- | --- | --- |
| Routing | Sends each request to the right service by path or host | `/search` goes to the search service |
| Aggregation | Turns one client request into several backend calls and merges the answers | One call builds a whole listing page |
| Offloading | Takes shared concerns away from the services | TLS, login checks, rate limits, logging, caching |

**Routing** is the [Load Balancers](/system-design/load-balancers) from earlier, with rules about paths and services. Here is such a table of rules, in a generic form, since each product has its own syntax:

```yaml
routes:
  - path: /listings
    service: listings
    auth: required
  - path: /search
    service: search
    rate_limit: 20 per second per client
  - path: /payments
    service: payments
    auth: required
```

Products organize this in their own words. Kong, for instance, has services that point at backends, routes that match requests to them, and plugins that add features such as authentication and rate limiting. Kubernetes's Gateway API splits it into a GatewayClass, a Gateway and HTTPRoutes.

**Offloading** is the cross-cutting list: ending TLS, checking identity, allowing or blocking IP addresses, limiting rates, logging, caching and compression. Doing it once at the door means a new service gets all of it for free.

The caution is to pass along the verified identity and the forwarded headers from [Forward and Reverse Proxy Servers](/system-design/proxies), so services know who is asking.

## Aggregation in Action

The listing page on the phone shows the listing and a badge with unread messages. Without a gateway, the phone makes two calls over a slow connection. With one, the phone makes one call, and the gateway does the other two over the fast network inside the data center:

```python
async def listing_page(listing_id, user):
    listing, unread = await asyncio.gather(
        listings.get(listing_id),
        messages.unread(listing_id, user),
        return_exceptions=True,
    )
    if isinstance(listing, Exception):
        raise listing                    # no page without the listing
    page = {"listing": listing}
    if not isinstance(unread, Exception):
        page["unread"] = unread          # skip the badge if messages is down
    return page
```

Two habits keep this safe. The calls run in parallel, so the page takes as long as the slowest call and not the sum.

And a failure in a minor part, the badge, degrades the page without breaking it, the graceful degradation from [Load Shedding and Graceful Degradation](/system-design/load-shedding). Add timeouts and circuit breakers too, as [Timeouts, Retries and Backoff](/system-design/timeouts-retries) explains.

The same need is why [GraphQL](/system-design/graphql) appeals to front end teams. It lets the client ask for the combination it wants and does the gathering on the server.

## Limits at the Door

Rate limiting is a natural job for the gateway, since all requests pass through it. Amazon's API Gateway shows the typical design.

It uses a token bucket: tokens refill at a steady rate, each request spends one, and the bucket's size is the burst allowed above that rate.

By default, in most Regions an AWS account gets 10,000 requests a second, with a burst of 5,000, and requests over the limit get a 429 Too Many Requests. Limits can be set lower per API, per method and per client through usage plans. [Rate Limiting Algorithms](/system-design/rate-limiting-algorithms) and [Rate Limiting in Practice](/system-design/rate-limiting-in-practice) go deeper.

## One Gateway or Several

A single gateway for everything has a failure mode of its own. Each client team asks it for changes, and it becomes a queue and a bottleneck. Sam Newman's answer is the **Backend for Frontend** (BFF): a separate gateway for each kind of client, tailored to it.

<figure class="diagram">
<div class="flow">
<div class="stack">
<div class="node">Phone App</div>
<div class="node">Website</div>
<div class="node">Bookstore Partner</div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="stack">
<div class="node">Mobile BFF</div>
<div class="node">Web BFF</div>
<div class="node">Partner API</div>
</div>
<div class="arrow" aria-hidden="true"></div>
<div class="node">Services</div>
</div>
<figcaption>One backend for each kind of client, each shaped to what its client needs</figcaption>
</figure>

A phone wants small responses and few calls, a website can take more, and a partner wants a stable, documented API.

The rule of thumb Newman cites is one experience, one BFF, owned by the team that builds that client, so the API and the app change together.

The pattern has costs: more services to run, some duplicated code, and an extra hop. GraphQL can make a BFF unnecessary, since each client picks its own data.

## Risks

A gateway is powerful because everything passes through it, and that cuts both ways:

- **Single point of failure and bottleneck**: run several copies behind a load balancer, size them for peak and load test them
- **Business logic creeping in**: the gateway should route and handle cross-cutting work, and leave the rest to services. One that grows rules about listings or payments turns into a monolith in the middle
- **Bypass**: services should accept traffic only from the gateway, or the checks it does can be skipped
- **Extra latency**: another hop adds time, usually small, but it counts against the budget in [Latency and Throughput](/system-design/latency-throughput)

## Gateway, Load Balancer or Mesh

These parts overlap, so a quick comparison helps:

| Part | Faces | Main Job |
| --- | --- | --- |
| Load Balancer | Many copies of one service | Spread requests and skip failed copies |
| API Gateway | Outside clients, many services | Route, check identity, limit, aggregate |
| Service Mesh | Calls between services | Secure and manage service to service traffic |

Many setups use all three: a gateway at the edge, load balancing across instances, and a mesh inside. Managed gateways include Amazon API Gateway, Azure API Management and Google Cloud's, and Kong, NGINX and Envoy based ones are common to run yourself.

For a small system, the reverse proxy you already have is enough. The next topic is the third part of the table: [Service Meshes and Sidecars](/system-design/service-mesh).

## Key Points

- A gateway gives clients one front door, so they don't track services, and shared work happens once
- Its three jobs are routing, aggregation and offloading of TLS, authentication, rate limits and logging
- Aggregation cuts round trips for slow clients, and should run calls in parallel and degrade gracefully
- A Backend for Frontend gives each kind of client its own gateway, owned by that client's team
- <u>Keep business logic out of the gateway</u>, and run it redundantly, since everything depends on it
- A gateway handles outside clients, a load balancer spreads copies of a service, and a mesh handles calls between services
