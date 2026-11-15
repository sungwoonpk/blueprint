> A rate limiter that works on one server breaks when the load balancer spreads a client over many. **Rate limiting in practice** is about where the counters live, how many layers have limits, and what happens when the limiter itself fails.

[Rate Limiting Algorithms](/system-design/rate-limiting-algorithms) counted requests for one client in one place. Real systems have six gateway servers, as in [Load Balancers](/system-design/load-balancers), and each request can land on a different one. This topic is about making a limit mean the same thing across all of them, and about the choices around it that decide whether it protects you or becomes another way to fail.

## One Counter Per Server is Not Enough

Say the limit is 100 requests a minute per user, and the user's requests are spread over three gateways. If each gateway keeps its own counter with the full limit, each lets 100 through. The table shows what gets through when a client sends 300 in a minute, spread evenly in one case and landing on a single gateway in the other:

| How the Limit is Kept | Spread Evenly | All on One Gateway |
| --- | --- | --- |
| Full Limit on Each Gateway | 300 | 100 |
| Limit Split Three Ways, 33 Each | 99 | 33 |
| One Shared Counter | 100 | 100 |

Separate counters with the full limit let three times too much through.

Splitting the limit fixes the even case, and punishes a client unfairly when the load balancer sends all its requests to one gateway, which real balancers do. Only a shared counter gives the right answer in both. Kong, an API gateway, documents the same tradeoff in its own words: counters kept locally on each node are cheap and drift as nodes are added, and counters in a shared store are accurate and cost a round trip.

## Where the Counter Lives

The usual shared store is Redis, a fast in-memory database. Each gateway asks it before letting a request through:

<figure class="diagram">
<p class="rowname">Separate Counters</p>
<div class="flow">
<div class="stack">
<div class="node">Gateway 1<small>counts alone</small></div>
<div class="node">Gateway 2<small>counts alone</small></div>
<div class="node">Gateway 3<small>counts alone</small></div>
</div>
</div>
<p class="rowname">Shared Counter</p>
<div class="flow">
<div class="stack">
<div class="node">Gateway 1</div>
<div class="node">Gateway 2</div>
<div class="node">Gateway 3</div>
</div>
<div class="arrow wide" data-label="increment and check" aria-hidden="true"></div>
<div class="node">Redis<small>one counter per client</small></div>
</div>
<figcaption>With a shared counter, each gateway sees the same number</figcaption>
</figure>

When several gateways update the same counter at once, the read and the update must happen as one step, or two requests can both see 99 and both pass. Redis can run a small script as a single uninterrupted operation, and its own documentation shows this for the fixed window counter:

```lua
local count = redis.call("INCR", KEYS[1])
if count == 1 then
  redis.call("EXPIRE", KEYS[1], ARGV[1])
end
return count
```

The shared store has costs. Each request waits on a round trip to Redis, around half a millisecond inside one data center by the numbers in [Numbers Every Engineer Should Know](/system-design/numbers). And the store is now something that can fail. In Kong, it is a setting:

```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 100
      policy: redis          # shared counters, instead of local
      limit_by: consumer     # one allowance per API consumer
      fault_tolerant: true   # if Redis is unreachable, let requests through
      redis:
        host: redis.internal
        port: 6379
```

Kong's other policies show the range: `local` counts in each node's memory, which is cheapest and least accurate, `cluster` keeps counters in Kong's own database, which is accurate and the costliest, and `redis` sits in between.

Its documentation frames the choice by purpose: when each request counts, such as billing, use a shared counter, and when you are only protecting a backend, local counters with the limit tuned for the number of nodes are usually enough.

## A Cheaper Middle: Local First, Shared Second

Another option is to combine them. Envoy's documentation recommends exactly that: a local token bucket in each proxy absorbs very large bursts first, and only what survives goes to a central rate limit service for the fine grained decision, which cuts the load on the central service.

Counters can also sync from local memory to the shared store on a short timer instead of on each request, which Kong exposes as a `sync_rate` setting, trading a little accuracy for much less traffic to Redis.

Some services accept approximation by design. AWS WAF, a firewall that includes rate based rules, says outright that its limits aren't for precise rate limiting. It estimates the rate, requests can run above the limit for some time before being blocked, and it usually reacts in under 30 seconds.

Google Cloud Armor enforces its thresholds separately in each region, and calls its limits approximate. For stopping floods, that is plenty. For billing, it is not.

## Several Layers, Several Limits

Real systems limit at more than one point, each guarding something different. For the textbook app, it might look like this:

| Layer | What It Limits | Key | Example |
| --- | --- | --- | --- |
| Edge or WAF | Floods and obvious abuse | IP address | 1,000 requests a minute per IP |
| API Gateway | Normal API use | User or API key | A token bucket of 30, refilling at 10 a second |
| Search Service | Expensive requests | User | 5 searches in flight at once |
| Payments | Card testing and abuse | Card and account | 3 failed attempts an hour |
| Whole System | Overload | Priority | Refuse low priority work first |

Stripe is a good real example of several limits at once. A global limit counts requests per second for an account, 100 in live mode and 25 in its sandbox.

Each endpoint has its own limit, typically 25 a second, and there are caps on requests in flight at once. When a request is refused, Stripe says which limit caused it in a `Stripe-Rate-Limited-Reason` header, with values such as `global-rate` and `endpoint-concurrency`. That is good API design, since "slow down" is more useful when it says which thing to slow down.

GitHub layers it too. Its primary limit is 5,000 requests an hour for an authenticated user, and secondary limits cap requests in flight at 100 and charge points per request, with reads costing 1 and writes costing 5. Both layers apply at once.

## When the Limiter Fails

A limiter is one more dependency. If Redis is down, there are two choices: **fail open**, letting requests through unchecked, or **fail closed**, refusing them.

Failing closed turns a limiter outage into a full outage. Failing open leaves the system unprotected for a while. Stripe's guidance is to fail open if the limiter itself errors, and Kong's `fault_tolerant` setting defaults to true for the same reason. For something as sensitive as login attempts, you might choose the other way and accept the risk.

Three habits keep a limiter from causing harm:

- **Give it a time budget**: if the shared store doesn't answer within a few milliseconds, treat it as down and take the fail open path, so the limiter doesn't make requests slow
- **Launch it quietly**: Stripe describes dark launching each limiter, counting what it would have blocked without blocking, and Envoy's rate limit service has a shadow mode for the same purpose. Look at who would have been blocked before turning it on
- **Keep a kill switch**: a flag that turns a limiter off in seconds, for the day it blocks the wrong people

## The Client's Side

Limits only work if clients react well. A client that receives a 429 should wait, using `Retry-After` when present, then retry with growing, randomized delays, as in [Timeouts, Retries and Backoff](/system-design/timeouts-retries). Two further details matter.

First, retries multiply. In its article on retries, AWS gives an example: if a request passes through five layers, each retrying three times, one failure at the bottom becomes 3 to the power of 5, which is 243 attempts. Retry at one layer only, and leave the other layers to pass errors up.

Second, clients can limit themselves. Stripe suggests a token bucket on the client side to stay under the server's limit, and queueing changes to the same object so they run one after another. AWS's SDKs use a token bucket to budget retries, which stops a whole fleet from piling onto a struggling service.

## Tuning

Start generous. Measure real usage per key before setting a number, so the limit sits above what legitimate clients do and below what hurts you.

Keep trusted partners on their own allowance, publish the limits in the documentation, and watch the rejections: a spike in 429s for one client means either an abuser or a limit set too low. The next topic is the extreme case of too much traffic, when it is hostile and huge: [DDoS Protection](/system-design/ddos).

## Key Points

- A counter on each server lets too much through, and a shared counter is the only one that is exact whatever the load balancer does
- The shared store, usually Redis, needs atomic updates, adds a round trip and becomes a dependency
- Combine a local bucket for bursts with a shared one for precision, or accept approximation where it is good enough
- Limit at several layers, and tell clients which limit they hit
- <u>Decide whether the limiter fails open or closed</u>, give it a time budget, launch it in shadow mode and keep a kill switch
- Clients should back off with jitter, retry at one layer and budget their own retries
