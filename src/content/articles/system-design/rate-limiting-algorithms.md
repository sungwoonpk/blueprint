> A **rate limiter** decides, for each request, whether the client is still within its allowance. The algorithms differ in how they count and in how they treat bursts.

An [API gateway](/system-design/api-gateways) is a natural place to limit traffic, and [Idempotency and Safe Retries](/system-design/idempotency) showed clients that retry. This topic is about what a limiter does with each request. The next, [Rate Limiting in Practice](/system-design/rate-limiting-in-practice), covers running one across many servers.

## Why Limit at All

A limit protects the system from a client that sends too much, whether it is an attacker, a buggy script that retries in a tight loop, or a partner running a big import.

It also keeps one heavy user from starving everyone else, and it keeps costs and response times predictable. Registration day, from [Estimating Capacity](/system-design/estimation), is the honest case: some load is legitimate and still has to be shaped.

Stripe's engineering blog describes four limiters it runs, which are a useful map of what can be limited:

- **Request rate**: a cap on requests per second for each user, the one most people mean
- **Concurrent requests**: a cap on how many a user has in flight at once, for expensive endpoints
- **Load shedding by importance**: reserve part of the capacity for critical requests, such as creating a charge, and refuse less important ones, such as listing charges, first
- **Load shedding by worker use**: when servers are close to overloaded, drop traffic in a set order

The last two are the idea behind [Load Shedding and Graceful Degradation](/system-design/load-shedding). This topic is about the first, and how to count.

## Fixed Window Counter

The simplest approach: split time into fixed windows, such as each minute, and count requests per client in the current one. Over the limit means rejected, and a new window starts at zero. Redis, an in-memory store, makes this a few lines, as its documentation shows with the `INCR` command:

```python
def allow(client_id, limit=100, window=60):
    key = f"rl:{client_id}:{int(time.time()) // window}"
    count = redis.incr(key)
    if count == 1:
        redis.expire(key, window * 2)    # let old windows clean themselves up
    return count <= limit
```

One caution from the Redis documentation: setting the expiry as a separate step can leave a key that never expires if the program fails in between, so a real implementation does both steps in one transaction or one script.

It is cheap and easy to explain, and it has a flaw at the edges. A window resets at a fixed moment, so a client can use a full allowance at the end of one window and another full allowance at the start of the next:

<figure class="diagram">
<p class="rowname">End of Minute 1</p>
<div class="flow packets">
<div class="node">1</div>
<div class="node">2</div>
<div class="node">3</div>
<div class="node">4</div>
<div class="node">5</div>
</div>
<p class="rowname">Counter Resets</p>
<div class="flow">
<div class="node wait">Window boundary<small>the count returns to zero</small></div>
</div>
<p class="rowname">Start of Minute 2</p>
<div class="flow packets">
<div class="node">6</div>
<div class="node">7</div>
<div class="node">8</div>
<div class="node">9</div>
<div class="node">10</div>
</div>
<figcaption>With a limit of 5 a minute, ten requests pass within seconds of each other, straddling the boundary</figcaption>
</figure>

## Sliding Window

A sliding window fixes this by looking at the last N seconds counted back from now, instead of at a calendar window. There are two ways to do it:

- **Sliding log**: keep the timestamp of each recent request, drop the old ones, and count what's left. It is exact and costs memory in proportion to the limit. Redis's documentation shows a list based version of this idea
- **Sliding counter**: keep a count for the current window and the previous one, and estimate the last N seconds by weighting the previous count by how much of it still overlaps. One second into a new 10 second window, 90% of the previous window's count still counts. It is cheap and approximate

Either way, the boundary trick no longer works, because the recent past always counts.

## Token Bucket

A **token bucket** takes a different view. Each client has a bucket that holds up to a fixed number of tokens, and tokens are added at a steady rate. A request takes one token, and a request that finds the bucket empty is rejected. So a client that has been quiet has a full bucket and can send a burst, and after that is held to the refill rate.

```python
def allow(bucket, now, rate=0.5, capacity=5):
    elapsed = now - bucket.last
    bucket.tokens = min(capacity, bucket.tokens + elapsed * rate)
    bucket.last = now
    if bucket.tokens >= 1:
        bucket.tokens -= 1
        return True
    return False
```

The bucket refills lazily, only when a request arrives, so there is no timer per client. Two numbers set the behavior: the capacity is the largest burst, and the refill rate is the long run average.

Amazon's API Gateway describes its throttling as a token bucket with exactly these two settings, a rate and a burst, and Envoy's local rate limiter takes `max_tokens`, `tokens_per_fill` and `fill_interval`. Stripe says it uses a token bucket kept in Redis for its request rate limiter.

When many servers share a bucket, the read and update have to happen as one atomic step, usually a small Redis script, so two servers can't spend the same token.

## Leaky Bucket

A **leaky bucket** looks similar and behaves differently. Requests go into a queue, the bucket, which drains at a fixed rate, and when the bucket is full new requests are refused. The output is smooth: the server sees a steady stream no matter how bursty the input was.

nginx's `limit_req` module uses this method, and Shopify describes its REST API limit as a leaky bucket too, with a bucket of 40 requests that drains at 2 a second for a standard plan. In nginx:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;

server {
    location /api/ {
        limit_req zone=api burst=10;
        limit_req_status 429;
    }
}
```

With `burst=10`, up to ten extra requests wait their turn at 5 a second and the rest are refused. Adding `nodelay` serves the waiting ones at once while still counting them, which moves the behavior closer to a token bucket. The choice between them is whether you want to let bursts through, which token buckets do, or to smooth them out, which leaky buckets do.

## One Burst, Four Algorithms

Here is the same traffic through each. The limit is 5 requests per 10 seconds, and a client sends 5 requests at second 9 and 5 more at second 11:

<figure class="chart">
<div class="hbars">
<div class="hbar peak"><span>Fixed Window</span><span class="track"><span class="fill" style="--w: 100%"></span></span><span class="value">10</span></div>
<div class="hbar"><span>Token Bucket</span><span class="track"><span class="fill" style="--w: 60%"></span></span><span class="value">6</span></div>
<div class="hbar"><span>Leaky Bucket</span><span class="track"><span class="fill" style="--w: 60%"></span></span><span class="value">6</span></div>
<div class="hbar"><span>Sliding Log</span><span class="track"><span class="fill" style="--w: 50%"></span></span><span class="value">5</span></div>
</div>
<figcaption>Requests let through out of 10 sent, in a small simulation of our own: 5 at second 9 and 5 at second 11</figcaption>
</figure>

The fixed window lets everything through, since the two batches fall in different windows. The sliding log is strictest: at second 11 it still sees the first batch within the last 10 seconds, so it allows none.

The token bucket lets the first batch use the full bucket, then allows one more after 2 seconds of refill at half a token a second. The leaky bucket accepts the same six, but it spreads their processing out over time at the drain rate.

| Algorithm | State per Client | Bursts | Best For |
| --- | --- | --- | --- |
| Fixed Window | One counter | Up to double at the edges | Simple, coarse limits |
| Sliding Log | One entry per request | Strictly limited | Small limits needing precision |
| Sliding Counter | Two counters | Close to strict | Large scale, approximate limits |
| Token Bucket | A number and a time | Allowed up to the capacity | APIs where bursts are fine |
| Leaky Bucket | A queue level | Smoothed out | Protecting a steady backend |

## What to Count By

The key decides who shares an allowance. Usual choices are the logged in user, an API key, an IP address, or a combination such as a user and an endpoint. Each has a catch. A campus network may put 2,000 students behind one IP address, so a limit per IP can lock out a whole building because of one person.

And behind proxies, the address comes from `X-Forwarded-For`, so the rule from [Forward and Reverse Proxy Servers](/system-design/proxies) applies: trust only the entries your own proxies added.

Google Cloud Armor shows how many keys a limiter can use, including the address, a header, a cookie, the URL path, the region and a fingerprint of the TLS connection, and it lets you combine up to three.

## Telling the Client

A rejected client needs to know what happened. The HTTP status is 429 Too Many Requests, defined in RFC 6585. The standard says the response may carry a `Retry-After` header saying how long to wait, should explain the problem in its body, and must not be stored by a cache:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 12
Content-Type: application/json

{"code": "rate_limited", "message": "Too many requests. Retry in 12 seconds."}
```

Many APIs also report the budget on each response, so well behaved clients slow down before they are refused. GitHub sends `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset` with each reply.

An IETF draft proposes standard names, a `RateLimit-Policy` header such as `"perminute";q=100;w=60` for 100 requests per 60 seconds, and a `RateLimit` header such as `"perminute";r=37;t=21` for 37 left and 21 seconds to go. It is still a draft, so check its status before depending on it.

On the client side, the response is a wait, then a retry with growing delays, as in [Timeouts, Retries and Backoff](/system-design/timeouts-retries). A limiter that rejects and a client that retries immediately only adds load.

## Key Points

- Rate limiting protects against overload, abuse and unfair use, and can count requests, concurrent requests or priority
- A fixed window counter is the simplest and lets double the limit through at a boundary
- A sliding window counts the last N seconds, exactly with a log or approximately with two counters
- <u>A token bucket allows bursts up to its capacity</u> at a steady average rate, and a leaky bucket smooths traffic to a steady output
- Choose the key with care, since shared IP addresses and forwarded headers can make per IP limits unfair or easy to dodge
- Answer with 429 and `Retry-After`, report the remaining budget, and expect clients to back off
